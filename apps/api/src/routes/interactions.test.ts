import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { buildApp } from "../app.js";
import { pool } from "../db.js";
import { truncateAll } from "../test-helpers.js";
import type { FastifyInstance } from "fastify";

let app: FastifyInstance;

beforeEach(async () => {
  if (!app) app = await buildApp();
  await truncateAll();
});

afterAll(async () => {
  await pool.end();
});

async function createPerson(displayName: string) {
  const res = await app.inject({
    method: "POST",
    url: "/api/v1/cards",
    payload: { displayName, fields: [] },
  });
  const body = res.json();
  return { personId: body.person.id, editToken: body.editToken, cardId: body.card.id };
}

async function shareSession(cardId: string, editToken: string) {
  const res = await app.inject({
    method: "POST",
    url: `/api/v1/cards/${cardId}/share-sessions`,
    headers: { "x-edit-token": editToken },
    payload: { channel: "link" },
  });
  return res.json().sessionId as string;
}

/** `owner` saves `subject`'s card; returns the owner's contact id. */
async function save(
  owner: { editToken: string },
  subject: { cardId: string; editToken: string },
  id?: string,
) {
  const res = await app.inject({
    method: "POST",
    url: "/api/v1/contacts",
    headers: { "x-edit-token": owner.editToken },
    payload: { id, shareSessionId: await shareSession(subject.cardId, subject.editToken), captureSource: "card_share" },
  });
  expect(res.statusCode).toBe(201);
  return res.json().id as string;
}

function log(token: string, contactId: string, payload: Record<string, unknown>) {
  return app.inject({
    method: "POST",
    url: `/api/v1/contacts/${contactId}/interactions`,
    headers: { "x-edit-token": token },
    payload,
  });
}

async function detail(token: string, contactId: string) {
  const res = await app.inject({
    method: "GET",
    url: `/api/v1/contacts/${contactId}`,
    headers: { "x-edit-token": token },
  });
  return res.json() as {
    connectionStrength: number;
    lastInteractionAt: string | null;
    interactions: Array<{ summary: string; occurredAt: string }>;
  };
}

describe("POST /api/contacts/:contactId/interactions", () => {
  it("logs an interaction and raises the contact's strength", async () => {
    const a = await createPerson("Alice");
    const b = await createPerson("Bob");
    const contactId = await save(b, a);
    const before = await detail(b.editToken, contactId);

    const res = await log(b.editToken, contactId, { channel: "call", summary: "Quick catch-up" });
    expect(res.statusCode).toBe(201);
    expect(res.json()).toMatchObject({ channel: "call", summary: "Quick catch-up", contactId });

    const after = await detail(b.editToken, contactId);
    expect(after.connectionStrength).toBeGreaterThan(before.connectionStrength);
  });

  it("returns 403 when the caller does not own the contact", async () => {
    const a = await createPerson("Alice");
    const b = await createPerson("Bob");
    const c = await createPerson("Carol");
    const contactId = await save(b, a);

    const res = await log(c.editToken, contactId, { channel: "note" });
    expect(res.statusCode).toBe(403);
  });

  it("strength approaches 1.0 but never exceeds it", async () => {
    const a = await createPerson("Alice");
    const b = await createPerson("Bob");
    const contactId = await save(b, a);
    for (let i = 0; i < 10; i++) await log(b.editToken, contactId, { channel: "note" });

    const { connectionStrength } = await detail(b.editToken, contactId);
    expect(connectionStrength).toBeLessThanOrEqual(1.0);
    expect(connectionStrength).toBeGreaterThan(0.5);
  });

  it("a replayed client id creates exactly one row", async () => {
    const a = await createPerson("Alice");
    const b = await createPerson("Bob");
    const contactId = await save(b, a);
    const id = randomUUID();

    const first = await log(b.editToken, contactId, { id, channel: "call", summary: "Offline call" });
    const replay = await log(b.editToken, contactId, { id, channel: "call", summary: "Offline call" });
    expect(first.statusCode).toBe(201);
    expect(replay.statusCode).toBe(200);
    expect(replay.json().id).toBe(id);

    const rows = await pool.query("SELECT count(*)::int AS n FROM interaction WHERE id = $1", [id]);
    expect(rows.rows[0].n).toBe(1);
  });

  it("refuses someone else's interaction id without revealing it", async () => {
    const a = await createPerson("Alice");
    const b = await createPerson("Bob");
    const bContact = await save(b, a);
    const aContact = await save(a, b);
    const id = randomUUID();
    await log(b.editToken, bContact, { id, channel: "note", summary: "Bob's private note" });

    const res = await log(a.editToken, aContact, { id, channel: "note" });
    expect(res.statusCode).toBe(409);
    expect(JSON.stringify(res.json())).not.toContain("Bob's private note");
  });

  it("recency is the latest occurredAt, so a back-dated note does not look fresh", async () => {
    const a = await createPerson("Alice");
    const b = await createPerson("Bob");
    const contactId = await save(b, a);
    await pool.query("UPDATE interaction SET occurred_at = now() - interval '200 days' WHERE contact_id = $1", [
      contactId,
    ]);

    const backdated = new Date(Date.now() - 120 * 86_400_000).toISOString();
    await log(b.editToken, contactId, { channel: "meeting", occurredAt: backdated });

    const { lastInteractionAt } = await detail(b.editToken, contactId);
    expect(new Date(lastInteractionAt!).toISOString()).toBe(backdated);

    const suggestions = await app.inject({
      method: "GET",
      url: "/api/v1/contacts/reconnection-suggestions",
      headers: { "x-edit-token": b.editToken },
    });
    expect(suggestions.json().map((s: { contactId: string }) => s.contactId)).toContain(contactId);
  });

  it("clamps a future occurredAt to now", async () => {
    const a = await createPerson("Alice");
    const b = await createPerson("Bob");
    const contactId = await save(b, a);
    const future = new Date(Date.now() + 365 * 86_400_000).toISOString();

    const res = await log(b.editToken, contactId, { channel: "note", occurredAt: future });
    expect(new Date(res.json().occurredAt).getTime()).toBeLessThanOrEqual(Date.now());
  });
});

describe("private notes stay with their author", () => {
  it("each side of a connection reads only their own notes, and one side's writes never move the other's ordering", async () => {
    const a = await createPerson("Alice");
    const b = await createPerson("Bob");
    const c = await createPerson("Carol");
    const aAboutB = await save(a, b);
    const aAboutC = await save(a, c);
    const bAboutA = await save(b, a);

    await log(a.editToken, aAboutB, { channel: "note", summary: "ALICE-ONLY: Bob seemed hesitant" });
    await log(a.editToken, aAboutC, { channel: "note", summary: "Carol follow-up" });
    const aBefore = await app.inject({ method: "GET", url: "/api/v1/contacts", headers: { "x-edit-token": a.editToken } });
    const aDetailBefore = await detail(a.editToken, aAboutB);

    // Bob writes a lot about Alice. None of it may reach Alice or shift her view.
    for (let i = 0; i < 5; i++) {
      await log(b.editToken, bAboutA, { channel: "note", summary: `BOB-ONLY: note ${i} about Alice` });
    }

    const aDetail = await detail(a.editToken, aAboutB);
    const bDetail = await detail(b.editToken, bAboutA);
    expect(JSON.stringify(aDetail)).not.toContain("BOB-ONLY");
    expect(JSON.stringify(bDetail)).not.toContain("ALICE-ONLY");
    expect(aDetail.interactions.some((i) => i.summary.startsWith("ALICE-ONLY"))).toBe(true);
    expect(bDetail.interactions.filter((i) => i.summary.startsWith("BOB-ONLY"))).toHaveLength(5);

    // Neither the automatic save note nor strength/recency cross over.
    expect(aDetail.interactions).toHaveLength(aDetailBefore.interactions.length);
    expect(aDetail.connectionStrength).toBe(aDetailBefore.connectionStrength);
    expect(aDetail.lastInteractionAt).toBe(aDetailBefore.lastInteractionAt);

    const aAfter = await app.inject({ method: "GET", url: "/api/v1/contacts", headers: { "x-edit-token": a.editToken } });
    expect(aAfter.json().map((x: { id: string }) => x.id)).toEqual(aBefore.json().map((x: { id: string }) => x.id));
  });
});

describe("POST /api/contacts idempotency and expiry", () => {
  it("replaying a capture with the same id returns the original contact", async () => {
    const a = await createPerson("Alice");
    const b = await createPerson("Bob");
    const id = randomUUID();
    const sessionId = await shareSession(a.cardId, a.editToken);
    const payload = { id, shareSessionId: sessionId, captureSource: "card_share" };
    const headers = { "x-edit-token": b.editToken };

    const first = await app.inject({ method: "POST", url: "/api/v1/contacts", headers, payload });
    const replay = await app.inject({ method: "POST", url: "/api/v1/contacts", headers, payload });
    expect(first.statusCode).toBe(201);
    expect(replay.statusCode).toBe(200);
    expect(replay.json().id).toBe(id);
    expect(first.json().id).toBe(id);

    const notes = await pool.query("SELECT count(*)::int AS n FROM interaction WHERE contact_id = $1", [id]);
    expect(notes.rows[0].n).toBe(1);
  });

  it("refuses to save from an expired share session", async () => {
    const a = await createPerson("Alice");
    const b = await createPerson("Bob");
    const sessionId = await shareSession(a.cardId, a.editToken);
    await pool.query("UPDATE share_session SET expires_at = now() - interval '1 minute' WHERE id = $1", [sessionId]);

    const res = await app.inject({
      method: "POST",
      url: "/api/v1/contacts",
      headers: { "x-edit-token": b.editToken },
      payload: { shareSessionId: sessionId, captureSource: "card_share" },
    });
    expect(res.statusCode).toBe(410);
  });
});
