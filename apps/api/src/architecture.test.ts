/**
 * Architecture fitness tests: they fail when the code drifts from an accepted ADR, so drift
 * is caught in the change that causes it rather than in a later review. Each assertion
 * names the decision it protects. Changing one of these is changing the architecture —
 * that belongs in an ADR, not just in this file.
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { randomUUID } from "node:crypto";
import type { FastifyInstance } from "fastify";
import { buildApp } from "./app.js";
import { pool } from "./db.js";
import { ROUTE_EVENTS } from "./events.js";
import { truncateAll } from "./test-helpers.js";

// Tables deliberately without tenant_id, each with the decision that allows it.
const TENANTLESS: Record<string, string> = {
  tenant: "the tenancy root itself",
  schema_migrations: "migration ledger, not product data",
  company_profile: "ADR-0016: global firmographic data",
  connection: "ADR-0020: cross-tenant edge holding no private data",
};

const MUTATING = new Set(["POST", "PUT", "PATCH", "DELETE"]);

const routes: Array<{ method: string; url: string }> = [];

beforeAll(async () => {
  // Demo mode on so conditionally registered routes are checked too.
  vi.stubEnv("DEMO_MODE", "true");
  const app = await buildApp({
    onRoute: (r) => {
      for (const m of [r.method].flat()) routes.push({ method: m, url: r.url });
    },
  });
  await app.ready();
  await app.close();
  vi.unstubAllEnvs();
});

afterAll(async () => {
  await pool.end();
});

describe("ADR-0001: every tenant-scoped table carries a NOT NULL tenant_id", () => {
  it("has no table without one, except the recorded exemptions", async () => {
    const res = await pool.query<{ table_name: string; nullable: string | null }>(
      `SELECT t.table_name, c.is_nullable AS nullable
         FROM information_schema.tables t
         LEFT JOIN information_schema.columns c
           ON c.table_schema = t.table_schema AND c.table_name = t.table_name AND c.column_name = 'tenant_id'
        WHERE t.table_schema = 'public' AND t.table_type = 'BASE TABLE'`,
    );
    const offenders = res.rows
      .filter((r) => !(r.table_name in TENANTLESS))
      .filter((r) => r.nullable !== "NO")
      .map((r) => r.table_name);
    expect(offenders).toEqual([]);

    // An exemption for a table that no longer exists is stale and must be removed.
    const tables = new Set(res.rows.map((r) => r.table_name));
    expect(Object.keys(TENANTLESS).filter((t) => !tables.has(t))).toEqual([]);
  });
});

describe("ADR-0003: the REST surface is versioned and described", () => {
  it("serves every route under /api/v1 (health check excepted)", () => {
    expect(routes.length).toBeGreaterThan(10);
    const unversioned = routes
      .filter((r) => r.method !== "HEAD" && r.method !== "OPTIONS" && r.url !== "/healthz")
      .filter((r) => !r.url.startsWith("/api/v1/"));
    expect(unversioned).toEqual([]);
  });

  it("documents every versioned route in the OpenAPI document", async () => {
    vi.stubEnv("DEMO_MODE", "true");
    const app = await buildApp();
    const res = await app.inject({ method: "GET", url: "/api/v1/openapi.json" });
    await app.close();
    vi.unstubAllEnvs();
    const doc = res.json() as { paths: Record<string, Record<string, unknown>> };
    const documented = new Set(
      Object.entries(doc.paths).flatMap(([p, ops]) =>
        Object.keys(ops).map((m) => `${m.toUpperCase()} ${p.replace(/\{(\w+)\}/g, ":$1")}`),
      ),
    );
    const missing = routes
      .filter((r) => r.method !== "HEAD" && r.url.startsWith("/api/v1/") && r.url !== "/api/v1/openapi.json")
      .map((r) => `${r.method} ${r.url}`)
      .filter((k) => !documented.has(k));
    expect(missing).toEqual([]);
  });
});

describe("ADR-0004/0007: every write path declares its outbox event", () => {
  it("has an entry in ROUTE_EVENTS for every mutating route, and no stale entries", () => {
    const mutating = routes.filter((r) => MUTATING.has(r.method)).map((r) => `${r.method} ${r.url}`);
    expect(mutating.filter((k) => !(k in ROUTE_EVENTS))).toEqual([]);
    expect(Object.keys(ROUTE_EVENTS).filter((k) => !mutating.includes(k))).toEqual([]);
  });
});

describe("outbox behaviour", () => {
  let app: FastifyInstance;
  beforeEach(async () => {
    if (!app) app = await buildApp();
    await truncateAll();
  });
  afterAll(async () => {
    await app?.close();
  });

  const SECRET_VALUE = "outbox-must-not-see-this@example.com";
  const SECRET_NOTE = "OUTBOX-MUST-NOT-SEE-THIS-NOTE";

  async function events() {
    const r = await pool.query<{ type: string; tenant_id: string; payload: unknown }>(
      "SELECT type, tenant_id, payload FROM outbox_event ORDER BY occurred_at, id",
    );
    return r.rows;
  }

  it("emits each declared event exactly once per real change, and never private content", async () => {
    const createCard = async (name: string, email: string) =>
      (
        await app.inject({
          method: "POST",
          url: "/api/v1/cards",
          payload: {
            displayName: name,
            fields: [
              { fieldType: "email", label: "Email", value: email, visibility: "public" },
              { fieldType: "phone", label: "Mobile", value: "+1 555", visibility: "request_required" },
            ],
          },
        })
      ).json();
    const a = await createCard("Alice", SECRET_VALUE);
    const b = await createCard("Bob", "bob@northwind.cloud");
    const aH = { "x-edit-token": a.editToken };
    const bH = { "x-edit-token": b.editToken };

    const field = (
      await app.inject({
        method: "POST",
        url: `/api/v1/cards/${a.card.id}/fields`,
        headers: aH,
        payload: { fieldType: "text", label: "Studio", value: SECRET_VALUE, visibility: "public" },
      })
    ).json();
    await app.inject({
      method: "PATCH",
      url: `/api/v1/cards/${a.card.id}/fields/${field.id}`,
      headers: aH,
      payload: { value: SECRET_VALUE + "2" },
    });
    await app.inject({ method: "DELETE", url: `/api/v1/cards/${a.card.id}/fields/${field.id}`, headers: aH });
    // A second delete of the same field changes nothing and must emit nothing.
    await app.inject({ method: "DELETE", url: `/api/v1/cards/${a.card.id}/fields/${field.id}`, headers: aH });

    const session = (
      await app.inject({
        method: "POST",
        url: `/api/v1/cards/${a.card.id}/share-sessions`,
        headers: aH,
        payload: { channel: "qr" },
      })
    ).json();
    const mobile = a.card.fields.find((f: { label: string }) => f.label === "Mobile");
    const fr = (
      await app.inject({
        method: "POST",
        url: `/api/v1/share-sessions/${session.sessionId}/field-requests`,
        payload: { fieldId: mobile.id },
      })
    ).json();
    // Re-requesting returns the existing request: no second event.
    await app.inject({
      method: "POST",
      url: `/api/v1/share-sessions/${session.sessionId}/field-requests`,
      payload: { fieldId: mobile.id },
    });
    await app.inject({ method: "POST", url: `/api/v1/field-requests/${fr.id}/respond`, headers: aH, payload: { approve: true } });

    const contactId = randomUUID();
    const save = () =>
      app.inject({
        method: "POST",
        url: "/api/v1/contacts",
        headers: bH,
        payload: { id: contactId, shareSessionId: session.sessionId, captureSource: "card_share" },
      });
    await save();
    await save(); // replay

    const interactionId = randomUUID();
    const log = () =>
      app.inject({
        method: "POST",
        url: `/api/v1/contacts/${contactId}/interactions`,
        headers: bH,
        payload: { id: interactionId, channel: "note", summary: SECRET_NOTE },
      });
    await log();
    await log(); // replay

    const company = (
      await app.inject({ method: "POST", url: "/api/v1/companies", headers: bH, payload: { name: "Acme", domain: "acme.test" } })
    ).json();
    await app.inject({ method: "PATCH", url: `/api/v1/contacts/${contactId}`, headers: bH, payload: { companyProfileId: company.id } });
    await app.inject({ method: "PATCH", url: `/api/v1/companies/${company.id}`, headers: bH, payload: { name: "X" } });

    const all = await events();
    const counts: Record<string, number> = {};
    for (const e of all) counts[e.type] = (counts[e.type] ?? 0) + 1;

    expect(counts).toEqual({
      "card.created": 2,
      "card.field_added": 1,
      "card.field_updated": 1,
      "card.field_removed": 1,
      "share_session.created": 1,
      "field_request.created": 1,
      "field_request.resolved": 1,
      "contact.created": 1,
      "interaction.logged": 1,
      "company.created": 1,
      "contact.updated": 1,
    });

    // Every declared event type was exercised by this scenario.
    const declared = new Set(Object.values(ROUTE_EVENTS).flatMap((v) => (typeof v === "string" ? [v] : [])));
    expect([...declared].filter((t) => !(t in counts))).toEqual([]);

    const serialized = JSON.stringify(all);
    expect(serialized).not.toContain(SECRET_VALUE);
    expect(serialized).not.toContain(SECRET_NOTE);
    expect(serialized).not.toContain("Alice");

    // Events land in the tenant of the person the change belongs to.
    const tenants = await pool.query<{ id: string; tenant_id: string }>("SELECT id, tenant_id FROM person");
    const tenantOf = new Map(tenants.rows.map((r) => [r.id, r.tenant_id]));
    const bTenant = tenantOf.get(b.person.id);
    for (const e of all.filter((x) => x.type.startsWith("contact.") || x.type === "interaction.logged")) {
      expect(e.tenant_id).toBe(bTenant);
    }
  });

  it("writes nothing to the outbox when the change is rolled back", async () => {
    const a = (await app.inject({ method: "POST", url: "/api/v1/cards", payload: { displayName: "A", fields: [] } })).json();
    const before = (await events()).length;
    // Missing contact → 404 before any write; nothing may be emitted.
    await app.inject({
      method: "POST",
      url: `/api/v1/contacts/${randomUUID()}/interactions`,
      headers: { "x-edit-token": a.editToken },
      payload: { channel: "note" },
    });
    expect((await events()).length).toBe(before);
  });
});
