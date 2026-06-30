import type { FastifyReply, FastifyRequest } from "fastify";
import { query } from "./db.js";
import type { DigitalCardRow, FieldRequestRow, PersonRow, ShareSessionRow } from "./types.js";

/**
 * editToken stands in for real Account/OAuth auth in this slice (see plan's
 * "What's Explicitly Out of Scope"). It authorizes all edits to the Person
 * that owns it, including all of that Person's cards.
 */
export async function requireCardOwner(
  request: FastifyRequest,
  reply: FastifyReply,
  cardId: string,
): Promise<{ person: PersonRow; card: DigitalCardRow } | null> {
  const token = request.headers["x-edit-token"];
  if (typeof token !== "string" || token.length === 0) {
    reply.code(401).send({ error: "Missing x-edit-token header" });
    return null;
  }

  const cardResult = await query<DigitalCardRow>(
    "select * from digital_card where id = $1",
    [cardId],
  );
  const card = cardResult.rows[0];
  if (!card) {
    reply.code(404).send({ error: "Card not found" });
    return null;
  }

  const personResult = await query<PersonRow>(
    "select * from person where id = $1 and edit_token = $2",
    [card.person_id, token],
  );
  const person = personResult.rows[0];
  if (!person) {
    reply.code(403).send({ error: "Invalid edit token for this card" });
    return null;
  }

  return { person, card };
}

export async function requireFieldRequestOwner(
  request: FastifyRequest,
  reply: FastifyReply,
  fieldRequestId: string,
): Promise<{ person: PersonRow; card: DigitalCardRow; shareSession: ShareSessionRow; fieldRequest: FieldRequestRow } | null> {
  const token = request.headers["x-edit-token"];
  if (typeof token !== "string" || token.length === 0) {
    reply.code(401).send({ error: "Missing x-edit-token header" });
    return null;
  }

  const requestResult = await query<FieldRequestRow>(
    "select * from field_request where id = $1",
    [fieldRequestId],
  );
  const fieldRequest = requestResult.rows[0];
  if (!fieldRequest) {
    reply.code(404).send({ error: "Field request not found" });
    return null;
  }

  const sessionResult = await query<ShareSessionRow>(
    "select * from share_session where id = $1",
    [fieldRequest.share_session_id],
  );
  const shareSession = sessionResult.rows[0];
  if (!shareSession) {
    reply.code(404).send({ error: "Share session not found" });
    return null;
  }

  const cardResult = await query<DigitalCardRow>(
    "select * from digital_card where id = $1",
    [shareSession.card_id],
  );
  const card = cardResult.rows[0];
  if (!card) {
    reply.code(404).send({ error: "Card not found" });
    return null;
  }

  const personResult = await query<PersonRow>(
    "select * from person where id = $1 and edit_token = $2",
    [card.person_id, token],
  );
  const person = personResult.rows[0];
  if (!person) {
    reply.code(403).send({ error: "Invalid edit token for this card" });
    return null;
  }

  return { person, card, shareSession, fieldRequest };
}
