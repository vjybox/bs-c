import type { FastifyInstance } from "fastify";
import { query } from "../db.js";
import { requireCardOwner, requireFieldRequestOwner } from "../auth.js";
import type { CardFieldRow, FieldRequestRow, ShareSessionRow } from "../types.js";

interface CreateFieldRequestBody {
  fieldId: string;
}

interface RespondBody {
  approve: boolean;
}

function serializeFieldRequest(row: FieldRequestRow) {
  return {
    id: row.id,
    fieldId: row.field_id,
    status: row.status,
    createdAt: row.created_at,
    resolvedAt: row.resolved_at,
  };
}

export default async function fieldRequestsRoutes(app: FastifyInstance) {
  app.post<{ Params: { sessionId: string }; Body: CreateFieldRequestBody }>(
    "/api/share-sessions/:sessionId/field-requests",
    async (request, reply) => {
      const { sessionId } = request.params;
      const { fieldId } = request.body;

      const sessionResult = await query<ShareSessionRow>(
        "select * from share_session where id = $1",
        [sessionId],
      );
      const session = sessionResult.rows[0];
      if (!session) {
        return reply.code(404).send({ error: "Share session not found" });
      }
      if (new Date(session.expires_at).getTime() < Date.now()) {
        return reply.code(410).send({ error: "This share link has expired" });
      }

      const fieldResult = await query<CardFieldRow>(
        "select * from card_field where id = $1 and card_id = $2",
        [fieldId, session.card_id],
      );
      const field = fieldResult.rows[0];
      if (!field || field.visibility !== "request_required") {
        return reply.code(400).send({ error: "Field is not requestable" });
      }
      if (session.scoped_field_ids.includes(field.id)) {
        return reply.code(400).send({ error: "Field is already visible" });
      }

      const existingResult = await query<FieldRequestRow>(
        "select * from field_request where share_session_id = $1 and field_id = $2",
        [sessionId, fieldId],
      );
      if (existingResult.rows[0]) {
        return reply.send(serializeFieldRequest(existingResult.rows[0]));
      }

      const insertResult = await query<FieldRequestRow>(
        `insert into field_request (share_session_id, field_id)
         values ($1, $2) returning *`,
        [sessionId, fieldId],
      );

      reply.code(201).send(serializeFieldRequest(insertResult.rows[0]));
    },
  );

  app.get<{ Params: { cardId: string } }>(
    "/api/cards/:cardId/field-requests",
    async (request, reply) => {
      const owner = await requireCardOwner(request, reply, request.params.cardId);
      if (!owner) return;

      const result = await query<FieldRequestRow & { field_label: string; share_session_id: string }>(
        `select fr.*, cf.label as field_label
         from field_request fr
         join share_session ss on ss.id = fr.share_session_id
         join card_field cf on cf.id = fr.field_id
         where ss.card_id = $1
         order by fr.created_at desc`,
        [owner.card.id],
      );

      reply.send(
        result.rows.map((row) => ({
          ...serializeFieldRequest(row),
          fieldLabel: row.field_label,
          shareSessionId: row.share_session_id,
        })),
      );
    },
  );

  app.post<{ Params: { id: string }; Body: RespondBody }>(
    "/api/field-requests/:id/respond",
    async (request, reply) => {
      const owner = await requireFieldRequestOwner(request, reply, request.params.id);
      if (!owner) return;

      if (owner.fieldRequest.status !== "pending") {
        return reply.code(400).send({ error: "Field request already resolved" });
      }

      const approve = request.body?.approve === true;
      const status = approve ? "approved" : "denied";

      const updatedRequestResult = await query<FieldRequestRow>(
        `update field_request set status = $1, resolved_at = now() where id = $2 returning *`,
        [status, owner.fieldRequest.id],
      );

      if (approve && !owner.shareSession.scoped_field_ids.includes(owner.fieldRequest.field_id)) {
        await query(
          `update share_session set scoped_field_ids = array_append(scoped_field_ids, $1) where id = $2`,
          [owner.fieldRequest.field_id, owner.shareSession.id],
        );
      }

      reply.send(serializeFieldRequest(updatedRequestResult.rows[0]));
    },
  );
}
