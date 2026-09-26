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
    payload: { displayName, fields: [] },
  });
  const body = res.json();
  return { personId: body.person.id, editToken: body.editToken, cardId: body.card.id };
}

async function saveContact(ownerToken: string, shareSessionId: string) {
  const res = await app.inject({
    method: "POST",
    url: "/api/contacts",
    headers: { "x-edit-token": ownerToken },
    payload: { shareSessionId, captureSource: "card_share" },
  });
  return res.json() as { id: string; connectionId: string; strength: number };
}

describe("POST /api/connections/:connectionId/interactions", () => {
  it("logs an interaction and updates lastInteractionAt and strength", async () => {
    const a = await createPerson("Alice");
    const b = await createPerson("Bob");

    const sessionRes = await app.inject({
      method: "POST",
      url: `/api/cards/${a.cardId}/share-sessions`,
      headers: { "x-edit-token": a.editToken },
      payload: { channel: "link" },
    });
    const sessionId = sessionRes.json().sessionId;
    const { connectionId, strength: initialStrength } = await saveContact(b.editToken, sessionId);

    const res = await app.inject({
      method: "POST",
      url: `/api/connections/${connectionId}/interactions`,
      headers: { "x-edit-token": b.editToken },
      payload: { channel: "call", summary: "Quick catch-up" },
    });

    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.channel).toBe("call");
    expect(body.summary).toBe("Quick catch-up");
    expect(body.occurredAt).toBeTruthy();

    // Strength should have increased
    const connRes = await pool.query("SELECT strength, last_interaction_at FROM connection WHERE id = $1", [
      connectionId,
    ]);
    expect(connRes.rows[0].strength).toBeGreaterThan(initialStrength);
    expect(connRes.rows[0].last_interaction_at).toBeTruthy();
  });

  it("returns 403 when the person is not an endpoint of the connection", async () => {
    const a = await createPerson("Alice");
    const b = await createPerson("Bob");
    const c = await createPerson("Carol");

    const sessionRes = await app.inject({
      method: "POST",
      url: `/api/cards/${a.cardId}/share-sessions`,
      headers: { "x-edit-token": a.editToken },
      payload: { channel: "link" },
    });
    const sessionId = sessionRes.json().sessionId;
    const { connectionId } = await saveContact(b.editToken, sessionId);

    // Carol tries to log an interaction on Alice <-> Bob connection
    const res = await app.inject({
      method: "POST",
      url: `/api/connections/${connectionId}/interactions`,
      headers: { "x-edit-token": c.editToken },
      payload: { channel: "note" },
    });
    expect(res.statusCode).toBe(403);
  });

  it("strength approaches 1.0 with multiple interactions but never exceeds it", async () => {
    const a = await createPerson("Alice");
    const b = await createPerson("Bob");

    const sessionRes = await app.inject({
      method: "POST",
      url: `/api/cards/${a.cardId}/share-sessions`,
      headers: { "x-edit-token": a.editToken },
      payload: { channel: "link" },
    });
    const sessionId = sessionRes.json().sessionId;
    const { connectionId } = await saveContact(b.editToken, sessionId);

    // Log many interactions
    for (let i = 0; i < 10; i++) {
      await app.inject({
        method: "POST",
        url: `/api/connections/${connectionId}/interactions`,
        headers: { "x-edit-token": b.editToken },
        payload: { channel: "note" },
      });
    }

    const connRes = await pool.query("SELECT strength FROM connection WHERE id = $1", [connectionId]);
    expect(connRes.rows[0].strength).toBeLessThanOrEqual(1.0);
    expect(connRes.rows[0].strength).toBeGreaterThan(0.5);
  });
});
