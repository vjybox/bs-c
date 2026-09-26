import type { FastifyInstance } from "fastify";
import { query } from "../db.js";
import { requirePersonByToken } from "../auth.js";
import type { ConnectionRow, InteractionRow } from "../types.js";
import { connectionIdParamsSchema, logInteractionBodySchema } from "../schemas.js";

interface ConnectionIdParams {
  connectionId: string;
}

interface LogInteractionBody {
  channel: "meeting" | "call" | "email" | "message" | "note";
  summary?: string;
  occurredAt?: string;
}

export default async function connectionsRoutes(app: FastifyInstance) {
  app.post<{ Params: ConnectionIdParams; Body: LogInteractionBody }>(
    "/api/connections/:connectionId/interactions",
    { schema: { params: connectionIdParamsSchema, body: logInteractionBodySchema } },
    async (request, reply) => {
      const person = await requirePersonByToken(request, reply);
      if (!person) return;

      const { connectionId } = request.params;
      const { channel, summary, occurredAt } = request.body;

      const connRes = await query<ConnectionRow>(
        "SELECT * FROM connection WHERE id = $1",
        [connectionId],
      );
      const connection = connRes.rows[0];
      if (!connection) {
        return reply.code(404).send({ error: "Connection not found" });
      }
      if (connection.person_a_id !== person.id && connection.person_b_id !== person.id) {
        return reply.code(403).send({ error: "Access denied" });
      }

      const interactionRes = await query<InteractionRow>(
        `INSERT INTO interaction (connection_id, logged_by_person_id, channel, summary, occurred_at)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [connectionId, person.id, channel, summary ?? null, occurredAt ? new Date(occurredAt) : new Date()],
      );
      const interaction = interactionRes.rows[0];

      // Recompute strength synchronously (recent interaction count, capped at 1.0).
      await query(
        `UPDATE connection SET
           last_interaction_at = now(),
           strength = LEAST(1.0, 0.1 + (
             SELECT count(*) FROM interaction
             WHERE connection_id = $1
               AND occurred_at > now() - interval '90 days'
           ) * 0.15)
         WHERE id = $1`,
        [connectionId],
      );

      return reply.code(201).send({
        id: interaction.id,
        connectionId: interaction.connection_id,
        channel: interaction.channel,
        summary: interaction.summary,
        occurredAt: interaction.occurred_at,
        loggedByPersonId: interaction.logged_by_person_id,
      });
    },
  );
}
