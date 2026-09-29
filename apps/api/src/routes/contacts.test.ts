import { afterAll, beforeEach, describe, expect, it } from "vitest";
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
    url: "/api/cards",
    payload: { displayName, headline: "Test headline", fields: [] },
  });
  expect(res.statusCode).toBe(201);
  const body = res.json();
  return { personId: body.person.id, editToken: body.editToken, cardId: body.card.id };
}

async function createShareSession(cardId: string, editToken: string) {
  const res = await app.inject({
    method: "POST",
    url: `/api/cards/${cardId}/share-sessions`,
    headers: { "x-edit-token": editToken },
    payload: { channel: "link" },
  });
  expect(res.statusCode).toBe(201);
  return res.json().sessionId as string;
}

describe("POST /api/contacts", () => {
  it("creates a contact, connection, and initial interaction from a share session", async () => {
    const a = await createPerson("Alice");
    const b = await createPerson("Bob");
    const sessionId = await createShareSession(a.cardId, a.editToken);

    const res = await app.inject({
      method: "POST",
      url: "/api/contacts",
      headers: { "x-edit-token": b.editToken },
      payload: { shareSessionId: sessionId, captureSource: "card_share" },
    });

    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.id).toBeTruthy();
    expect(body.connectionId).toBeTruthy();
    expect(body.strength).toBeGreaterThan(0);
  });

  it("returns 409 for a duplicate contact", async () => {
    const a = await createPerson("Alice");
    const b = await createPerson("Bob");
    const sessionId = await createShareSession(a.cardId, a.editToken);

    await app.inject({
      method: "POST",
      url: "/api/contacts",
      headers: { "x-edit-token": b.editToken },
      payload: { shareSessionId: sessionId, captureSource: "card_share" },
    });

    const res2 = await app.inject({
      method: "POST",
      url: "/api/contacts",
      headers: { "x-edit-token": b.editToken },
      payload: { shareSessionId: sessionId, captureSource: "card_share" },
    });
    expect(res2.statusCode).toBe(409);
  });

  it("returns 401 when x-edit-token is missing", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/contacts",
      payload: { captureSource: "manual" },
    });
    expect(res.statusCode).toBe(401);
  });

  it("returns 400 when neither shareSessionId nor subjectPersonId is provided", async () => {
    const a = await createPerson("Alice");
    const res = await app.inject({
      method: "POST",
      url: "/api/contacts",
      headers: { "x-edit-token": a.editToken },
      payload: { captureSource: "manual" },
    });
    expect(res.statusCode).toBe(400);
  });
});

describe("GET /api/contacts", () => {
  it("returns only the authenticated person's contacts", async () => {
    const a = await createPerson("Alice");
    const b = await createPerson("Bob");
    const c = await createPerson("Carol");

    // Bob saves Alice as a contact
    const sessionA = await createShareSession(a.cardId, a.editToken);
    await app.inject({
      method: "POST",
      url: "/api/contacts",
      headers: { "x-edit-token": b.editToken },
      payload: { shareSessionId: sessionA, captureSource: "card_share" },
    });

    // Carol saves Bob as a contact
    const sessionB = await createShareSession(b.cardId, b.editToken);
    await app.inject({
      method: "POST",
      url: "/api/contacts",
      headers: { "x-edit-token": c.editToken },
      payload: { shareSessionId: sessionB, captureSource: "card_share" },
    });

    const resB = await app.inject({
      method: "GET",
      url: "/api/contacts",
      headers: { "x-edit-token": b.editToken },
    });
    expect(resB.statusCode).toBe(200);
    const bContacts = resB.json();
    expect(bContacts).toHaveLength(1);
    expect(bContacts[0].subject.displayName).toBe("Alice");

    const resC = await app.inject({
      method: "GET",
      url: "/api/contacts",
      headers: { "x-edit-token": c.editToken },
    });
    const cContacts = resC.json();
    expect(cContacts).toHaveLength(1);
    expect(cContacts[0].subject.displayName).toBe("Bob");
  });
});

describe("GET /api/contacts/:contactId — directional privacy boundary", () => {
  it("returns 403 when a non-owner tries to access a contact", async () => {
    const a = await createPerson("Alice");
    const b = await createPerson("Bob");
    const sessionA = await createShareSession(a.cardId, a.editToken);

    // Bob saves Alice as a contact
    const createRes = await app.inject({
      method: "POST",
      url: "/api/contacts",
      headers: { "x-edit-token": b.editToken },
      payload: { shareSessionId: sessionA, captureSource: "card_share" },
    });
    const contactId = createRes.json().id;

    // Alice (the subject) cannot read Bob's contact record about her
    const res = await app.inject({
      method: "GET",
      url: `/api/contacts/${contactId}`,
      headers: { "x-edit-token": a.editToken },
    });
    expect(res.statusCode).toBe(403);
  });

  it("returns contact detail with interactions to the owner", async () => {
    const a = await createPerson("Alice");
    const b = await createPerson("Bob");
    const sessionA = await createShareSession(a.cardId, a.editToken);

    const createRes = await app.inject({
      method: "POST",
      url: "/api/contacts",
      headers: { "x-edit-token": b.editToken },
      payload: { shareSessionId: sessionA, captureSource: "card_share" },
    });
    const { id: contactId } = createRes.json();

    const res = await app.inject({
      method: "GET",
      url: `/api/contacts/${contactId}`,
      headers: { "x-edit-token": b.editToken },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.subject.displayName).toBe("Alice");
    expect(Array.isArray(body.interactions)).toBe(true);
    expect(body.interactions.length).toBeGreaterThan(0);
  });
});

describe("GET /api/contacts/reconnection-suggestions", () => {
  it("includes stale connections and excludes recent ones", async () => {
    const a = await createPerson("Alice");
    const b = await createPerson("Bob");
    const c = await createPerson("Carol");

    // Alice -> Bob: stale (Alice's own recency for Bob set far in the past)
    const sessionB = await createShareSession(b.cardId, b.editToken);
    await app.inject({
      method: "POST",
      url: "/api/contacts",
      headers: { "x-edit-token": a.editToken },
      payload: { shareSessionId: sessionB, captureSource: "card_share" },
    });
    await pool.query(
      "UPDATE contact SET last_interaction_at = now() - interval '200 days' WHERE subject_person_id = $1",
      [b.personId],
    );

    // Alice <-> Carol: fresh connection (default last_interaction_at is now)
    const sessionC = await createShareSession(c.cardId, c.editToken);
    await app.inject({
      method: "POST",
      url: "/api/contacts",
      headers: { "x-edit-token": a.editToken },
      payload: { shareSessionId: sessionC, captureSource: "card_share" },
    });

    const res = await app.inject({
      method: "GET",
      url: "/api/contacts/reconnection-suggestions",
      headers: { "x-edit-token": a.editToken },
    });
    expect(res.statusCode).toBe(200);
    const suggestions = res.json();
    const names = suggestions.map((s: { subject: { displayName: string } }) => s.subject.displayName);
    expect(names).toContain("Bob");
    expect(names).not.toContain("Carol");
  });
});
