import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { buildApp } from "../app.js";
import { pool } from "../db.js";
import { truncateAll } from "../test-helpers.js";

beforeEach(async () => {
  await truncateAll();
});

afterEach(() => {
  vi.unstubAllEnvs();
});

afterAll(async () => {
  await pool.end();
});

describe("GET /api/demo/personas", () => {
  it("returns 404 when DEMO_MODE is off", async () => {
    // Stubbed explicitly rather than assumed unset: test-setup.ts does `import "dotenv/config"`,
    // so a developer's own apps/api/.env could otherwise turn demo mode on and pass this vacuously.
    vi.stubEnv("DEMO_MODE", "");
    const app = await buildApp();

    const res = await app.inject({ method: "GET", url: "/api/v1/demo/personas" });

    expect(res.statusCode).toBe(404);
    await app.close();
  });

  it("returns personas with their edit tokens when DEMO_MODE is on", async () => {
    vi.stubEnv("DEMO_MODE", "true");
    const app = await buildApp();

    const created = await app.inject({
      method: "POST",
      url: "/api/v1/cards",
      payload: { displayName: "Demo Person", headline: "Tester", fields: [] },
    });
    expect(created.statusCode).toBe(201);

    const res = await app.inject({ method: "GET", url: "/api/v1/demo/personas" });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body).toHaveLength(1);
    expect(body[0].displayName).toBe("Demo Person");
    expect(body[0].editToken).toBe(created.json().editToken);
    expect(body[0].cardId).toBe(created.json().card.id);
    await app.close();
  });
});

describe("seeded demo tokens", () => {
  async function seededPerson() {
    await pool.query(
      `WITH t AS (INSERT INTO tenant (kind) VALUES ('personal') RETURNING id)
       INSERT INTO person (tenant_id, display_name, edit_token) SELECT id, 'Mara Demo', 'demo-mara-token' FROM t`,
    );
  }

  it("are refused when DEMO_MODE is off, even if a demo seed once ran", async () => {
    vi.stubEnv("DEMO_MODE", "");
    await seededPerson();
    const app = await buildApp();
    const res = await app.inject({
      method: "GET",
      url: "/api/v1/contacts",
      headers: { "x-edit-token": "demo-mara-token" },
    });
    expect(res.statusCode).toBe(403);
    await app.close();
  });

  it("work when DEMO_MODE is on", async () => {
    vi.stubEnv("DEMO_MODE", "true");
    await seededPerson();
    const app = await buildApp();
    const res = await app.inject({
      method: "GET",
      url: "/api/v1/contacts",
      headers: { "x-edit-token": "demo-mara-token" },
    });
    expect(res.statusCode).toBe(200);
    await app.close();
  });
});
