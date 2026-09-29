import { afterAll, beforeEach, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { buildApp } from "../app.js";
import { pool } from "../db.js";
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

async function setupCardWithSession() {
  const cardResponse = await app.inject({
    method: "POST",
    url: "/api/v1/cards",
    payload: {
      displayName: "Grace Hopper",
      fields: [
        { fieldType: "email", label: "Public Email", value: "public@example.com", visibility: "public" },
        { fieldType: "phone", label: "Phone", value: "555-9999", visibility: "request_required" },
      ],
    },
  });
  const created = cardResponse.json();

  const sessionResponse = await app.inject({
    method: "POST",
    url: `/api/v1/cards/${created.card.id}/share-sessions`,
    headers: { "x-edit-token": created.editToken },
    payload: { channel: "link" },
  });
  const { sessionId } = sessionResponse.json();

  const publicField = created.card.fields.find((f: { visibility: string }) => f.visibility === "public");
  const requestableField = created.card.fields.find(
    (f: { visibility: string }) => f.visibility === "request_required",
  );

  return { card: created.card, editToken: created.editToken, sessionId, publicField, requestableField };
}

describe("POST /api/share-sessions/:sessionId/field-requests", () => {
  it("rejects requesting a non-request_required field with 400", async () => {
    const { sessionId, publicField } = await setupCardWithSession();
    const response = await app.inject({
      method: "POST",
      url: `/api/v1/share-sessions/${sessionId}/field-requests`,
      payload: { fieldId: publicField.id },
    });
    expect(response.statusCode).toBe(400);
  });

  it("rejects requesting an already-visible field with 400", async () => {
    const { sessionId, requestableField, editToken } = await setupCardWithSession();
    const firstRequest = await app.inject({
      method: "POST",
      url: `/api/v1/share-sessions/${sessionId}/field-requests`,
      payload: { fieldId: requestableField.id },
    });
    const fieldRequestId = firstRequest.json().id;

    await app.inject({
      method: "POST",
      url: `/api/v1/field-requests/${fieldRequestId}/respond`,
      headers: { "x-edit-token": editToken },
      payload: { approve: true },
    });

    const secondRequest = await app.inject({
      method: "POST",
      url: `/api/v1/share-sessions/${sessionId}/field-requests`,
      payload: { fieldId: requestableField.id },
    });
    expect(secondRequest.statusCode).toBe(400);
  });

  it("is idempotent for duplicate requests", async () => {
    const { sessionId, requestableField } = await setupCardWithSession();
    const first = await app.inject({
      method: "POST",
      url: `/api/v1/share-sessions/${sessionId}/field-requests`,
      payload: { fieldId: requestableField.id },
    });
    const second = await app.inject({
      method: "POST",
      url: `/api/v1/share-sessions/${sessionId}/field-requests`,
      payload: { fieldId: requestableField.id },
    });

    expect(first.statusCode).toBe(201);
    expect(second.statusCode).toBe(200);
    expect(first.json().id).toBe(second.json().id);
  });
});

describe("field request race", () => {
  it("concurrent duplicate requests yield exactly one row", async () => {
    const { sessionId, requestableField } = await setupCardWithSession();
    const fire = () =>
      app.inject({
        method: "POST",
        url: `/api/v1/share-sessions/${sessionId}/field-requests`,
        payload: { fieldId: requestableField.id },
      });
    const results = await Promise.all(Array.from({ length: 20 }, fire));
    expect(results.every((r) => r.statusCode === 200 || r.statusCode === 201)).toBe(true);
    expect(new Set(results.map((r) => r.json().id)).size).toBe(1);
    const rows = await pool.query("select count(*)::int as n from field_request where share_session_id = $1", [
      sessionId,
    ]);
    expect(rows.rows[0].n).toBe(1);
  });
});

describe("POST /api/field-requests/:id/respond", () => {
  it("approve flow appends the field to the session's visible set", async () => {
    const { sessionId, requestableField, editToken } = await setupCardWithSession();
    const requestResponse = await app.inject({
      method: "POST",
      url: `/api/v1/share-sessions/${sessionId}/field-requests`,
      payload: { fieldId: requestableField.id },
    });
    const fieldRequestId = requestResponse.json().id;

    const respondResponse = await app.inject({
      method: "POST",
      url: `/api/v1/field-requests/${fieldRequestId}/respond`,
      headers: { "x-edit-token": editToken },
      payload: { approve: true },
    });
    expect(respondResponse.statusCode).toBe(200);
    expect(respondResponse.json().status).toBe("approved");

    const sessionView = await app.inject({ method: "GET", url: `/api/v1/share-sessions/${sessionId}` });
    const visibleLabels = sessionView.json().fields.map((f: { label: string }) => f.label);
    expect(visibleLabels).toContain("Phone");
  });

  it("deny flow does not add the field to the visible set", async () => {
    const { sessionId, requestableField, editToken } = await setupCardWithSession();
    const requestResponse = await app.inject({
      method: "POST",
      url: `/api/v1/share-sessions/${sessionId}/field-requests`,
      payload: { fieldId: requestableField.id },
    });
    const fieldRequestId = requestResponse.json().id;

    const respondResponse = await app.inject({
      method: "POST",
      url: `/api/v1/field-requests/${fieldRequestId}/respond`,
      headers: { "x-edit-token": editToken },
      payload: { approve: false },
    });
    expect(respondResponse.statusCode).toBe(200);
    expect(respondResponse.json().status).toBe("denied");

    const sessionView = await app.inject({ method: "GET", url: `/api/v1/share-sessions/${sessionId}` });
    const visibleLabels = sessionView.json().fields.map((f: { label: string }) => f.label);
    expect(visibleLabels).not.toContain("Phone");
  });

  it("rejects responding without the correct edit token", async () => {
    const { sessionId, requestableField } = await setupCardWithSession();
    const requestResponse = await app.inject({
      method: "POST",
      url: `/api/v1/share-sessions/${sessionId}/field-requests`,
      payload: { fieldId: requestableField.id },
    });
    const fieldRequestId = requestResponse.json().id;

    const respondResponse = await app.inject({
      method: "POST",
      url: `/api/v1/field-requests/${fieldRequestId}/respond`,
      headers: { "x-edit-token": "wrong-token" },
      payload: { approve: true },
    });
    expect(respondResponse.statusCode).toBe(403);
  });
});
