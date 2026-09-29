import type { FastifyInstance } from "fastify";
import { nanoid } from "nanoid";
import { pool, query, withTransaction } from "../db.js";
import { emitEvent } from "../events.js";
import { requireCardOwner } from "../auth.js";
import type { CardFieldRow, DigitalCardRow, FieldType, FieldVisibility, PersonRow } from "../types.js";
import {
  cardFieldParamsSchema,
  cardIdParamsSchema,
  createCardBodySchema,
  createFieldBodySchema,
  updateFieldBodySchema,
} from "../schemas.js";

interface CreateCardFieldInput {
  fieldType: FieldType;
  label: string;
  value: string;
  visibility: FieldVisibility;
}

interface CreateCardBody {
  displayName: string;
  headline?: string;
  fields: CreateCardFieldInput[];
}

function serializeField(row: CardFieldRow) {
  return {
    id: row.id,
    fieldType: row.field_type,
    label: row.label,
    value: row.value,
    visibility: row.visibility,
    displayOrder: row.display_order,
  };
}

function serializePerson(row: PersonRow) {
  return { id: row.id, displayName: row.display_name, headline: row.headline };
}

function serializeCard(row: DigitalCardRow) {
  return { id: row.id, label: row.label, isDefault: row.is_default, status: row.status };
}

export default async function cardsRoutes(app: FastifyInstance) {
  app.post<{ Body: CreateCardBody }>(
    "/api/v1/cards",
    { schema: { body: createCardBodySchema } },
    async (request, reply) => {
      const { displayName, headline, fields } = request.body;
      if (displayName.trim().length === 0) {
        return reply.code(400).send({ error: "displayName is required" });
      }

      const editToken = nanoid(24);
      const client = await pool.connect();
      try {
        await client.query("begin");

        // Every new person starts in a personal tenant (ADR-0001). Organization tenants
        // arrive with Workspaces; the rows below already carry the column they will need.
        const tenantResult = await client.query<{ id: string }>(
          "insert into tenant (kind) values ('personal') returning id",
        );
        const tenantId = tenantResult.rows[0].id;

        const personResult = await client.query<PersonRow>(
          `insert into person (tenant_id, display_name, headline, edit_token)
           values ($1, $2, $3, $4) returning *`,
          [tenantId, displayName.trim(), headline?.trim() || null, editToken],
        );
        const person = personResult.rows[0];

        const cardResult = await client.query<DigitalCardRow>(
          `insert into digital_card (tenant_id, person_id, label, is_default)
           values ($1, $2, $3, true) returning *`,
          [tenantId, person.id, "Default"],
        );
        const card = cardResult.rows[0];

        await client.query(`update person set default_card_id = $1 where id = $2`, [
          card.id,
          person.id,
        ]);

        const fieldRows: CardFieldRow[] = [];
        for (const [index, field] of (fields ?? []).entries()) {
          const fieldResult = await client.query<CardFieldRow>(
            `insert into card_field (tenant_id, card_id, field_type, label, value, visibility, display_order)
             values ($1, $2, $3, $4, $5, $6, $7) returning *`,
            [tenantId, card.id, field.fieldType, field.label, field.value, field.visibility, index],
          );
          fieldRows.push(fieldResult.rows[0]);
        }

        await emitEvent(client, {
          tenantId,
          type: "card.created",
          aggregateType: "card",
          aggregateId: card.id,
          payload: { personId: person.id, fieldCount: fieldRows.length },
        });

        await client.query("commit");

        reply.code(201).send({
          person: serializePerson(person),
          card: { ...serializeCard(card), fields: fieldRows.map(serializeField) },
          editToken,
        });
      } catch (err) {
        await client.query("rollback");
        throw err;
      } finally {
        client.release();
      }
    },
  );

  app.get<{ Params: { cardId: string } }>(
    "/api/v1/cards/:cardId",
    { schema: { params: cardIdParamsSchema } },
    async (request, reply) => {
      const owner = await requireCardOwner(request, reply, request.params.cardId);
      if (!owner) return;

      const fieldsResult = await query<CardFieldRow>(
        "select * from card_field where card_id = $1 order by display_order asc",
        [owner.card.id],
      );

      reply.send({
        person: serializePerson(owner.person),
        card: { ...serializeCard(owner.card), fields: fieldsResult.rows.map(serializeField) },
      });
    },
  );

  app.post<{ Params: { cardId: string }; Body: CreateCardFieldInput }>(
    "/api/v1/cards/:cardId/fields",
    { schema: { params: cardIdParamsSchema, body: createFieldBodySchema } },
    async (request, reply) => {
      const owner = await requireCardOwner(request, reply, request.params.cardId);
      if (!owner) return;

      const { fieldType, label, value, visibility } = request.body;
      const maxOrderResult = await query<{ max: number | null }>(
        "select max(display_order) as max from card_field where card_id = $1",
        [owner.card.id],
      );
      const nextOrder = (maxOrderResult.rows[0].max ?? -1) + 1;

      const field = await withTransaction(async (client) => {
        const result = await client.query<CardFieldRow>(
          `insert into card_field (tenant_id, card_id, field_type, label, value, visibility, display_order)
           values ($1, $2, $3, $4, $5, $6, $7) returning *`,
          [owner.card.tenant_id, owner.card.id, fieldType, label, value, visibility, nextOrder],
        );
        const row = result.rows[0];
        await emitEvent(client, {
          tenantId: row.tenant_id,
          type: "card.field_added",
          aggregateType: "card_field",
          aggregateId: row.id,
          payload: { cardId: row.card_id, fieldType: row.field_type, visibility: row.visibility },
        });
        return row;
      });

      reply.code(201).send(serializeField(field));
    },
  );

  app.patch<{
    Params: { cardId: string; fieldId: string };
    Body: Partial<CreateCardFieldInput & { displayOrder: number }>;
  }>(
    "/api/v1/cards/:cardId/fields/:fieldId",
    { schema: { params: cardFieldParamsSchema, body: updateFieldBodySchema } },
    async (request, reply) => {
      const owner = await requireCardOwner(request, reply, request.params.cardId);
      if (!owner) return;

      const { fieldId } = request.params;
      const { label, value, visibility, displayOrder } = request.body;

      const field = await withTransaction(async (client) => {
        const result = await client.query<CardFieldRow>(
          `update card_field
           set label = coalesce($1, label),
               value = coalesce($2, value),
               visibility = coalesce($3, visibility),
               display_order = coalesce($4, display_order)
           where id = $5 and card_id = $6
           returning *`,
          [label ?? null, value ?? null, visibility ?? null, displayOrder ?? null, fieldId, owner.card.id],
        );
        const row = result.rows[0];
        if (!row) return null;
        await emitEvent(client, {
          tenantId: row.tenant_id,
          type: "card.field_updated",
          aggregateType: "card_field",
          aggregateId: row.id,
          // Which attributes changed, never their new values.
          payload: {
            cardId: row.card_id,
            changed: Object.keys(request.body).filter(
              (k) => (request.body as Record<string, unknown>)[k] !== undefined,
            ),
          },
        });
        return row;
      });

      if (!field) {
        return reply.code(404).send({ error: "Field not found" });
      }

      reply.send(serializeField(field));
    },
  );

  app.delete<{ Params: { cardId: string; fieldId: string } }>(
    "/api/v1/cards/:cardId/fields/:fieldId",
    { schema: { params: cardFieldParamsSchema } },
    async (request, reply) => {
      const owner = await requireCardOwner(request, reply, request.params.cardId);
      if (!owner) return;

      await withTransaction(async (client) => {
        const deleted = await client.query<{ id: string }>(
          "delete from card_field where id = $1 and card_id = $2 returning id",
          [request.params.fieldId, owner.card.id],
        );
        // Deleting an already-deleted field is a no-op, and a no-op emits nothing.
        if (!deleted.rows[0]) return;
        await emitEvent(client, {
          tenantId: owner.card.tenant_id,
          type: "card.field_removed",
          aggregateType: "card_field",
          aggregateId: deleted.rows[0].id,
          payload: { cardId: owner.card.id },
        });
      });

      reply.code(204).send();
    },
  );
}
