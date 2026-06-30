import type { FastifyInstance } from "fastify";
import { query } from "../db.js";
import { requireCardOwner } from "../auth.js";
import type { CardFieldRow, PersonRow, ShareSessionRow } from "../types.js";
import { cardIdParamsSchema, createShareSessionBodySchema, sessionIdParamsSchema } from "../schemas.js";

const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

interface CreateShareSessionBody {
  channel: "link" | "qr";
}

function buildShareUrl(sessionId: string) {
  const base = process.env.WEB_BASE_URL ?? "http://localhost:5173";
  return `${base}/c/${sessionId}`;
}

export default async function shareSessionsRoutes(app: FastifyInstance) {
  app.post<{ Params: { cardId: string }; Body: CreateShareSessionBody }>(
    "/api/cards/:cardId/share-sessions",
    { schema: { params: cardIdParamsSchema, body: createShareSessionBodySchema } },
    async (request, reply) => {
      const owner = await requireCardOwner(request, reply, request.params.cardId);
      if (!owner) return;

      const channel = request.body?.channel === "qr" ? "qr" : "link";

      const fieldsResult = await query<CardFieldRow>(
        "select * from card_field where card_id = $1 and visibility in ('public', 'link_only')",
        [owner.card.id],
      );
      const scopedFieldIds = fieldsResult.rows.map((row) => row.id);

      const expiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString();

      const sessionResult = await query<ShareSessionRow>(
        `insert into share_session (card_id, channel, scoped_field_ids, expires_at)
         values ($1, $2, $3, $4) returning *`,
        [owner.card.id, channel, scopedFieldIds, expiresAt],
      );
      const session = sessionResult.rows[0];

      reply.code(201).send({
        sessionId: session.id,
        url: buildShareUrl(session.id),
        expiresAt: session.expires_at,
      });
    },
  );

  app.get<{ Params: { sessionId: string } }>(
    "/api/share-sessions/:sessionId",
    { schema: { params: sessionIdParamsSchema } },
    async (request, reply) => {
      const sessionResult = await query<ShareSessionRow>(
        "select * from share_session where id = $1",
        [request.params.sessionId],
      );
      const session = sessionResult.rows[0];
      if (!session) {
        return reply.code(404).send({ error: "Share session not found" });
      }

      if (new Date(session.expires_at).getTime() < Date.now()) {
        return reply.code(410).send({ error: "This share link has expired" });
      }

      const cardResult = await query<{ id: string; person_id: string; label: string; status: string }>(
        "select id, person_id, label, status from digital_card where id = $1",
        [session.card_id],
      );
      const card = cardResult.rows[0];
      if (!card || card.status !== "active") {
        return reply.code(410).send({ error: "This card is no longer available" });
      }

      const personResult = await query<PersonRow>("select * from person where id = $1", [
        card.person_id,
      ]);
      const person = personResult.rows[0];

      const allFieldsResult = await query<CardFieldRow>(
        "select * from card_field where card_id = $1 order by display_order asc",
        [card.id],
      );

      const scopedIds = new Set(session.scoped_field_ids);
      const visibleFields = allFieldsResult.rows.filter(
        (field) => field.visibility !== "hidden" && scopedIds.has(field.id),
      );
      const requestableFields = allFieldsResult.rows.filter(
        (field) => field.visibility === "request_required" && !scopedIds.has(field.id),
      );

      reply.send({
        person: { displayName: person.display_name, headline: person.headline },
        card: { id: card.id, label: card.label },
        fields: visibleFields.map((field) => ({
          id: field.id,
          fieldType: field.field_type,
          label: field.label,
          value: field.value,
          displayOrder: field.display_order,
        })),
        requestableFields: requestableFields.map((field) => ({
          id: field.id,
          fieldType: field.field_type,
          label: field.label,
        })),
      });
    },
  );
}
