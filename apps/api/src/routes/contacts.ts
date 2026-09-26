import type { FastifyInstance } from "fastify";
import { pool, query } from "../db.js";
import { requirePersonByToken } from "../auth.js";
import type { ConnectionRow, ContactRow, InteractionRow, PersonRow } from "../types.js";
import {
  contactIdParamsSchema,
  createContactBodySchema,
} from "../schemas.js";

interface CreateContactBody {
  shareSessionId?: string;
  subjectPersonId?: string;
  captureSource?: "card_share" | "manual";
  captureContext?: string;
}

interface ContactIdParams {
  contactId: string;
}

function serializeContact(
  contact: ContactRow,
  subject: PersonRow | null,
  connection: ConnectionRow | null,
) {
  return {
    id: contact.id,
    subject: subject
      ? { displayName: subject.display_name, headline: subject.headline }
      : null,
    captureSource: contact.capture_source,
    captureContext: contact.capture_context,
    connectionId: connection?.id ?? null,
    connectionStrength: connection?.strength ?? null,
    lastInteractionAt: connection?.last_interaction_at ?? null,
    createdAt: contact.created_at,
  };
}

function serializeInteraction(row: InteractionRow) {
  return {
    id: row.id,
    channel: row.channel,
    summary: row.summary,
    occurredAt: row.occurred_at,
    loggedByPersonId: row.logged_by_person_id,
  };
}

export default async function contactsRoutes(app: FastifyInstance) {
  // Must be registered before /:contactId to avoid route conflict.
  app.get("/api/contacts/reconnection-suggestions", async (request, reply) => {
    const person = await requirePersonByToken(request, reply);
    if (!person) return;

    const result = await query<{
      connection_id: string;
      contact_id: string;
      display_name: string;
      headline: string | null;
      strength: number;
      last_interaction_at: string | null;
      created_at: string;
    }>(
      `SELECT
         conn.id AS connection_id,
         c.id AS contact_id,
         p.display_name,
         p.headline,
         conn.strength,
         conn.last_interaction_at,
         conn.created_at
       FROM connection conn
       JOIN contact c
         ON c.owner_person_id = $1
        AND c.subject_person_id = CASE
              WHEN conn.person_a_id = $1 THEN conn.person_b_id
              ELSE conn.person_a_id
            END
       JOIN person p ON p.id = c.subject_person_id
       WHERE (conn.person_a_id = $1 OR conn.person_b_id = $1)
         AND (
           conn.last_interaction_at < now() - interval '90 days'
           OR (conn.last_interaction_at IS NULL AND conn.created_at < now() - interval '30 days')
         )
       ORDER BY conn.strength DESC
       LIMIT 20`,
      [person.id],
    );

    const suggestions = result.rows.map((row) => ({
      contactId: row.contact_id,
      subject: { displayName: row.display_name, headline: row.headline },
      daysSinceInteraction: row.last_interaction_at
        ? Math.floor(
            (Date.now() - new Date(row.last_interaction_at).getTime()) / 86_400_000,
          )
        : null,
      connectionStrength: row.strength,
    }));

    return reply.send(suggestions);
  });

  app.post<{ Body: CreateContactBody }>(
    "/api/contacts",
    { schema: { body: createContactBodySchema } },
    async (request, reply) => {
      const owner = await requirePersonByToken(request, reply);
      if (!owner) return;

      const { shareSessionId, captureSource = "manual", captureContext } = request.body;
      let { subjectPersonId } = request.body;

      if (!shareSessionId && !subjectPersonId) {
        return reply.code(400).send({ error: "shareSessionId or subjectPersonId is required" });
      }

      if (shareSessionId && !subjectPersonId) {
        const sessionRes = await query<{ card_id: string }>(
          "SELECT card_id FROM share_session WHERE id = $1",
          [shareSessionId],
        );
        if (!sessionRes.rows[0]) {
          return reply.code(404).send({ error: "Share session not found" });
        }
        const cardRes = await query<{ person_id: string }>(
          "SELECT person_id FROM digital_card WHERE id = $1",
          [sessionRes.rows[0].card_id],
        );
        subjectPersonId = cardRes.rows[0]?.person_id;
      }

      if (!subjectPersonId) {
        return reply.code(400).send({ error: "Could not resolve subject person" });
      }
      if (subjectPersonId === owner.id) {
        return reply.code(400).send({ error: "Cannot save yourself as a contact" });
      }

      const subjectRes = await query<PersonRow>("SELECT * FROM person WHERE id = $1", [subjectPersonId]);
      if (!subjectRes.rows[0]) {
        return reply.code(404).send({ error: "Subject person not found" });
      }

      const existingContact = await query<ContactRow>(
        "SELECT * FROM contact WHERE owner_person_id = $1 AND subject_person_id = $2",
        [owner.id, subjectPersonId],
      );
      if (existingContact.rows[0]) {
        return reply.code(409).send({ error: "Contact already exists" });
      }

      const client = await pool.connect();
      try {
        await client.query("BEGIN");

        const contactRes = await client.query<ContactRow>(
          `INSERT INTO contact (owner_person_id, subject_person_id, capture_source, capture_context)
           VALUES ($1, $2, $3, $4)
           RETURNING *`,
          [owner.id, subjectPersonId, captureSource, captureContext ?? null],
        );
        const contact = contactRes.rows[0];

        // Ensure person_a_id < person_b_id for the unique constraint.
        const [personAId, personBId] =
          owner.id < subjectPersonId
            ? [owner.id, subjectPersonId]
            : [subjectPersonId, owner.id];

        const connRes = await client.query<ConnectionRow>(
          `INSERT INTO connection (person_a_id, person_b_id, last_interaction_at)
           VALUES ($1, $2, now())
           ON CONFLICT (person_a_id, person_b_id) DO UPDATE
             SET last_interaction_at = now(),
                 strength = LEAST(1.0, connection.strength + 0.05)
           RETURNING *`,
          [personAId, personBId],
        );
        const connection = connRes.rows[0];

        const summary =
          captureSource === "card_share" ? "Contact saved via card share" : "Contact added manually";
        await client.query(
          `INSERT INTO interaction (connection_id, logged_by_person_id, channel, summary)
           VALUES ($1, $2, 'note', $3)`,
          [connection.id, owner.id, summary],
        );

        await client.query("COMMIT");

        return reply.code(201).send({
          id: contact.id,
          subjectPersonId: contact.subject_person_id,
          connectionId: connection.id,
          strength: connection.strength,
        });
      } catch (err) {
        await client.query("ROLLBACK");
        throw err;
      } finally {
        client.release();
      }
    },
  );

  app.get("/api/contacts", async (request, reply) => {
    const person = await requirePersonByToken(request, reply);
    if (!person) return;

    const result = await query<
      ContactRow & {
        display_name: string | null;
        p_headline: string | null;
        conn_id: string | null;
        strength: number | null;
        last_interaction_at: string | null;
      }
    >(
      `SELECT
         c.*,
         p.display_name,
         p.headline AS p_headline,
         conn.id AS conn_id,
         conn.strength,
         conn.last_interaction_at
       FROM contact c
       LEFT JOIN person p ON p.id = c.subject_person_id
       LEFT JOIN connection conn
         ON (conn.person_a_id = c.owner_person_id AND conn.person_b_id = c.subject_person_id)
         OR (conn.person_b_id = c.owner_person_id AND conn.person_a_id = c.subject_person_id)
       WHERE c.owner_person_id = $1
       ORDER BY conn.last_interaction_at DESC NULLS LAST, c.created_at DESC`,
      [person.id],
    );

    const contacts = result.rows.map((row) => ({
      id: row.id,
      subject: row.display_name
        ? { displayName: row.display_name, headline: row.p_headline }
        : null,
      captureSource: row.capture_source,
      captureContext: row.capture_context,
      connectionId: row.conn_id,
      connectionStrength: row.strength,
      lastInteractionAt: row.last_interaction_at,
      createdAt: row.created_at,
    }));

    return reply.send(contacts);
  });

  app.get<{ Params: ContactIdParams }>(
    "/api/contacts/:contactId",
    { schema: { params: contactIdParamsSchema } },
    async (request, reply) => {
      const person = await requirePersonByToken(request, reply);
      if (!person) return;

      const { contactId } = request.params;

      const contactRes = await query<ContactRow>(
        "SELECT * FROM contact WHERE id = $1",
        [contactId],
      );
      const contact = contactRes.rows[0];
      if (!contact) {
        return reply.code(404).send({ error: "Contact not found" });
      }
      if (contact.owner_person_id !== person.id) {
        return reply.code(403).send({ error: "Access denied" });
      }

      const subjectRes = contact.subject_person_id
        ? await query<PersonRow>("SELECT * FROM person WHERE id = $1", [contact.subject_person_id])
        : null;
      const subject = subjectRes?.rows[0] ?? null;

      const connRes = contact.subject_person_id
        ? await query<ConnectionRow>(
            `SELECT * FROM connection
             WHERE (person_a_id = $1 AND person_b_id = $2)
                OR (person_b_id = $1 AND person_a_id = $2)`,
            [person.id, contact.subject_person_id],
          )
        : null;
      const connection = connRes?.rows[0] ?? null;

      const interactionsRes = connection
        ? await query<InteractionRow>(
            "SELECT * FROM interaction WHERE connection_id = $1 ORDER BY occurred_at DESC",
            [connection.id],
          )
        : { rows: [] };

      return reply.send({
        ...serializeContact(contact, subject, connection),
        interactions: interactionsRes.rows.map(serializeInteraction),
      });
    },
  );
}
