import type { FastifyInstance } from "fastify";
import { nanoid } from "nanoid";
import { pool, query } from "../db.js";
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
    "/api/cards",
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

        const personResult = await client.query<PersonRow>(
          `insert into person (display_name, headline, edit_token)
           values ($1, $2, $3) returning *`,
          [displayName.trim(), headline?.trim() || null, editToken],
        );
        const person = personResult.rows[0];

        const cardResult = await client.query<DigitalCardRow>(
          `insert into digital_card (person_id, label, is_default)
           values ($1, $2, true) returning *`,
          [person.id, "Default"],
        );
        const card = cardResult.rows[0];

        await client.query(`update person set default_card_id = $1 where id = $2`, [
          card.id,
          person.id,
        ]);

        const fieldRows: CardFieldRow[] = [];
        for (const [index, field] of (fields ?? []).entries()) {
          const fieldResult = await client.query<CardFieldRow>(
            `insert into card_field (card_id, field_type, label, value, visibility, display_order)
             values ($1, $2, $3, $4, $5, $6) returning *`,
            [card.id, field.fieldType, field.label, field.value, field.visibility, index],
          );
          fieldRows.push(fieldResult.rows[0]);
        }

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
    "/api/cards/:cardId",
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
    "/api/cards/:cardId/fields",
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

      const result = await query<CardFieldRow>(
        `insert into card_field (card_id, field_type, label, value, visibility, display_order)
         values ($1, $2, $3, $4, $5, $6) returning *`,
        [owner.card.id, fieldType, label, value, visibility, nextOrder],
      );

      reply.code(201).send(serializeField(result.rows[0]));
    },
  );

  app.patch<{
    Params: { cardId: string; fieldId: string };
    Body: Partial<CreateCardFieldInput & { displayOrder: number }>;
  }>(
    "/api/cards/:cardId/fields/:fieldId",
    { schema: { params: cardFieldParamsSchema, body: updateFieldBodySchema } },
    async (request, reply) => {
      const owner = await requireCardOwner(request, reply, request.params.cardId);
      if (!owner) return;

      const { fieldId } = request.params;
      const { label, value, visibility, displayOrder } = request.body;

      const result = await query<CardFieldRow>(
        `update card_field
         set label = coalesce($1, label),
             value = coalesce($2, value),
             visibility = coalesce($3, visibility),
             display_order = coalesce($4, display_order)
         where id = $5 and card_id = $6
         returning *`,
        [label ?? null, value ?? null, visibility ?? null, displayOrder ?? null, fieldId, owner.card.id],
      );

      if (result.rows.length === 0) {
        return reply.code(404).send({ error: "Field not found" });
      }

      reply.send(serializeField(result.rows[0]));
    },
  );

  app.delete<{ Params: { cardId: string; fieldId: string } }>(
    "/api/cards/:cardId/fields/:fieldId",
    { schema: { params: cardFieldParamsSchema } },
    async (request, reply) => {
      const owner = await requireCardOwner(request, reply, request.params.cardId);
      if (!owner) return;

      await query("delete from card_field where id = $1 and card_id = $2", [
        request.params.fieldId,
        owner.card.id,
      ]);

      reply.code(204).send();
    },
  );
}
