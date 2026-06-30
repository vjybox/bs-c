import { afterAll, beforeEach, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { buildApp } from "../app.js";
import { pool, query } from "../db.js";
import { truncateAll } from "../test-helpers.js";

let app: FastifyInstance;

beforeEach(async () => {
  await truncateAll();
  app = await buildApp();
});

afterAll(async () => {
  await app.close();
  await pool.end();
});

async function createCardWithAllVisibilities() {
  const response = await app.inject({
    method: "POST",
    url: "/api/cards",
    payload: {
      displayName: "Grace Hopper",
      fields: [
        { fieldType: "email", label: "Public Email", value: "public@example.com", visibility: "public" },
        { fieldType: "text", label: "Link Only", value: "link-only-value", visibility: "link_only" },
        { fieldType: "phone", label: "Phone", value: "555-9999", visibility: "request_required" },
        { fieldType: "text", label: "Secret", value: "secret-value", visibility: "hidden" },
      ],
    },
  });
  return response.json();
}

describe("POST /api/cards/:cardId/share-sessions", () => {
  it("scopes only public/link_only fields at creation time", async () => {
    const { card, editToken } = await createCardWithAllVisibilities();

    const sessionResponse = await app.inject({
      method: "POST",
      url: `/api/cards/${card.id}/share-sessions`,
      headers: { "x-edit-token": editToken },
      payload: { channel: "link" },
    });
    expect(sessionResponse.statusCode).toBe(201);
    const { sessionId } = sessionResponse.json();

    const sessionRow = await query<{ scoped_field_ids: string[] }>(
      "select scoped_field_ids from share_session where id = $1",
      [sessionId],
    );
    const scopedIds: string[] = sessionRow.rows[0].scoped_field_ids;

    const fieldsRow = await query<{ id: string; visibility: string }>(
      "select id, visibility from card_field where card_id = $1",
      [card.id],
    );
    const expectedScoped = fieldsRow.rows
      .filter((f) => f.visibility === "public" || f.visibility === "link_only")
      .map((f) => f.id);

    expect(scopedIds.sort()).toEqual(expectedScoped.sort());
  });
});

describe("GET /api/share-sessions/:sessionId", () => {
  it("returns 404 for an unknown session", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/api/share-sessions/00000000-0000-0000-0000-000000000000",
    });
    expect(response.statusCode).toBe(404);
  });

  it("returns 410 for an expired session", async () => {
    const { card, editToken } = await createCardWithAllVisibilities();
    const sessionResponse = await app.inject({
      method: "POST",
      url: `/api/cards/${card.id}/share-sessions`,
      headers: { "x-edit-token": editToken },
      payload: { channel: "link" },
    });
    const { sessionId } = sessionResponse.json();

    await query("update share_session set expires_at = now() - interval '1 day' where id = $1", [
      sessionId,
    ]);

    const response = await app.inject({ method: "GET", url: `/api/share-sessions/${sessionId}` });
    expect(response.statusCode).toBe(410);
  });

  it("never exposes hidden fields or unapproved request_required field values", async () => {
    const { card, editToken } = await createCardWithAllVisibilities();
    const sessionResponse = await app.inject({
      method: "POST",
      url: `/api/cards/${card.id}/share-sessions`,
      headers: { "x-edit-token": editToken },
      payload: { channel: "link" },
    });
    const { sessionId } = sessionResponse.json();

    const response = await app.inject({ method: "GET", url: `/api/share-sessions/${sessionId}` });
    expect(response.statusCode).toBe(200);
    const body = response.json();

    const visibleLabels = body.fields.map((f: { label: string }) => f.label);
    expect(visibleLabels).toEqual(expect.arrayContaining(["Public Email", "Link Only"]));
    expect(visibleLabels).not.toContain("Secret");
    expect(visibleLabels).not.toContain("Phone");

    const allValues = JSON.stringify(body);
    expect(allValues).not.toContain("secret-value");
    expect(allValues).not.toContain("555-9999");

    const requestableLabels = body.requestableFields.map((f: { label: string }) => f.label);
    expect(requestableLabels).toEqual(["Phone"]);
    expect(body.requestableFields[0]).not.toHaveProperty("value");
  });
});
