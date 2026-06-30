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

async function createCard() {
  const response = await app.inject({
    method: "POST",
    url: "/api/cards",
    payload: {
      displayName: "Grace Hopper",
      headline: "Rear Admiral",
      fields: [
        { fieldType: "email", label: "Email", value: "grace@example.com", visibility: "public" },
        { fieldType: "phone", label: "Phone", value: "555-9999", visibility: "request_required" },
      ],
    },
  });
  return response.json();
}

describe("POST /api/cards", () => {
  it("creates a card with fields", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/api/cards",
      payload: { displayName: "Ada Lovelace", fields: [] },
    });

    expect(response.statusCode).toBe(201);
    const body = response.json();
    expect(body.person.displayName).toBe("Ada Lovelace");
    expect(body.card.isDefault).toBe(true);
    expect(body.editToken).toBeTruthy();
  });

  it("rejects a missing displayName with 400", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/api/cards",
      payload: { fields: [] },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json().error).toBe("Validation failed");
  });
});

describe("GET /api/cards/:cardId", () => {
  it("returns 401 with no edit token", async () => {
    const { card } = await createCard();
    const response = await app.inject({ method: "GET", url: `/api/cards/${card.id}` });
    expect(response.statusCode).toBe(401);
  });

  it("returns 403 with the wrong edit token", async () => {
    const { card } = await createCard();
    const response = await app.inject({
      method: "GET",
      url: `/api/cards/${card.id}`,
      headers: { "x-edit-token": "wrong-token" },
    });
    expect(response.statusCode).toBe(403);
  });

  it("returns 404 for an unknown card", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/api/cards/00000000-0000-0000-0000-000000000000",
      headers: { "x-edit-token": "wrong-token" },
    });
    expect(response.statusCode).toBe(404);
  });

  it("returns the card with fields for the correct owner", async () => {
    const { card, editToken } = await createCard();
    const response = await app.inject({
      method: "GET",
      url: `/api/cards/${card.id}`,
      headers: { "x-edit-token": editToken },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.card.fields).toHaveLength(2);
  });
});

describe("POST /api/cards/:cardId/fields", () => {
  it("adds a field for the owner", async () => {
    const { card, editToken } = await createCard();
    const response = await app.inject({
      method: "POST",
      url: `/api/cards/${card.id}/fields`,
      headers: { "x-edit-token": editToken },
      payload: { fieldType: "url", label: "Website", value: "https://example.com", visibility: "public" },
    });

    expect(response.statusCode).toBe(201);
    expect(response.json().displayOrder).toBe(2);
  });

  it("rejects an invalid fieldType with 400", async () => {
    const { card, editToken } = await createCard();
    const response = await app.inject({
      method: "POST",
      url: `/api/cards/${card.id}/fields`,
      headers: { "x-edit-token": editToken },
      payload: { fieldType: "bogus", label: "Website", value: "https://example.com", visibility: "public" },
    });

    expect(response.statusCode).toBe(400);
  });

  it("rejects requests without an edit token", async () => {
    const { card } = await createCard();
    const response = await app.inject({
      method: "POST",
      url: `/api/cards/${card.id}/fields`,
      payload: { fieldType: "url", label: "Website", value: "https://example.com", visibility: "public" },
    });

    expect(response.statusCode).toBe(401);
  });
});

describe("PATCH /api/cards/:cardId/fields/:fieldId", () => {
  it("updates a field's value", async () => {
    const created = await createCard();
    const fieldId = created.card.fields[0].id;
    const response = await app.inject({
      method: "PATCH",
      url: `/api/cards/${created.card.id}/fields/${fieldId}`,
      headers: { "x-edit-token": created.editToken },
      payload: { value: "new@example.com" },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().value).toBe("new@example.com");
  });

  it("returns 404 for a field that does not belong to the card", async () => {
    const created = await createCard();
    const response = await app.inject({
      method: "PATCH",
      url: `/api/cards/${created.card.id}/fields/00000000-0000-0000-0000-000000000000`,
      headers: { "x-edit-token": created.editToken },
      payload: { value: "new@example.com" },
    });

    expect(response.statusCode).toBe(404);
  });
});

describe("DELETE /api/cards/:cardId/fields/:fieldId", () => {
  it("deletes a field for the owner", async () => {
    const created = await createCard();
    const fieldId = created.card.fields[0].id;
    const response = await app.inject({
      method: "DELETE",
      url: `/api/cards/${created.card.id}/fields/${fieldId}`,
      headers: { "x-edit-token": created.editToken },
    });

    expect(response.statusCode).toBe(204);
  });

  it("rejects deletion without the correct edit token", async () => {
    const created = await createCard();
    const fieldId = created.card.fields[0].id;
    const response = await app.inject({
      method: "DELETE",
      url: `/api/cards/${created.card.id}/fields/${fieldId}`,
      headers: { "x-edit-token": "wrong-token" },
    });

    expect(response.statusCode).toBe(403);
  });
});
