// Demo-only. This endpoint hands out edit tokens, which are the whole auth mechanism for
// this slice — so it is registered in app.ts ONLY when DEMO_MODE=true. When the flag is off
// the route is never registered, so it 404s rather than advertising its existence.
import type { FastifyInstance } from "fastify";
import { query } from "../db.js";

export default async function demoRoutes(app: FastifyInstance) {
  app.get("/api/v1/demo/personas", async (_request, reply) => {
    const result = await query<{
      display_name: string;
      headline: string | null;
      card_id: string;
      edit_token: string;
    }>(
      `SELECT display_name, headline, default_card_id AS card_id, edit_token
         FROM person
        WHERE default_card_id IS NOT NULL
        ORDER BY created_at`,
    );

    return reply.send(
      result.rows.map((r) => ({
        displayName: r.display_name,
        headline: r.headline,
        cardId: r.card_id,
        editToken: r.edit_token,
      })),
    );
  });
}
