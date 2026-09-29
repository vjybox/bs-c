import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { cp, mkdtemp, readFile, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import pg from "pg";
import { MIGRATIONS_DIR, runMigrations } from "./migrate.js";

// Each case gets a throwaway database so it can start from a genuinely empty or legacy state.
const base = new URL(process.env.DATABASE_URL ?? "postgres://localhost:5432/digital_identity");
const admin = new pg.Pool({ connectionString: base.toString() });
const created: string[] = [];

async function freshDb(): Promise<pg.Pool> {
  const name = `mig_test_${process.pid}_${created.length}`;
  await admin.query(`DROP DATABASE IF EXISTS ${name}`);
  await admin.query(`CREATE DATABASE ${name}`);
  created.push(name);
  const url = new URL(base);
  url.pathname = `/${name}`;
  return new pg.Pool({ connectionString: url.toString() });
}

let pools: pg.Pool[] = [];
async function db() {
  const p = await freshDb();
  pools.push(p);
  return p;
}

beforeAll(() => {
  pools = [];
});

afterAll(async () => {
  await Promise.all(pools.map((p) => p.end()));
  for (const name of created) await admin.query(`DROP DATABASE IF EXISTS ${name}`);
  await admin.end();
});

async function versions(p: pg.Pool) {
  const r = await p.query<{ version: string }>("SELECT version FROM schema_migrations ORDER BY version");
  return r.rows.map((x) => x.version);
}

describe("runMigrations", () => {
  it("builds an empty database and is a no-op the second time", async () => {
    const p = await db();
    const first = await runMigrations(p);
    expect(first[0]).toBe("0001_baseline");
    expect(first.length).toBeGreaterThanOrEqual(2);

    expect(await runMigrations(p)).toEqual([]);
    expect(await versions(p)).toEqual(first);
  });

  it("records the baseline on a pre-migration database instead of re-running it", async () => {
    const p = await db();
    await p.query(await readFile(path.join(MIGRATIONS_DIR, "0001_baseline.sql"), "utf8"));

    const applied = await runMigrations(p);
    expect(applied).not.toContain("0001_baseline");
    expect(applied).toContain("0002_private_interactions");
    expect(await versions(p)).toContain("0001_baseline");
  });

  it("moves legacy connection-scoped notes onto their author's contact", async () => {
    const p = await db();
    await p.query(await readFile(path.join(MIGRATIONS_DIR, "0001_baseline.sql"), "utf8"));
    const [a, b] = (
      await p.query<{ id: string }>(
        "INSERT INTO person (display_name, edit_token) VALUES ('A','ta'),('B','tb') RETURNING id",
      )
    ).rows.map((r) => r.id);
    const [lo, hi] = a < b ? [a, b] : [b, a];
    const conn = (
      await p.query<{ id: string }>("INSERT INTO connection (person_a_id, person_b_id) VALUES ($1,$2) RETURNING id", [lo, hi])
    ).rows[0].id;
    const aContact = (
      await p.query<{ id: string }>(
        "INSERT INTO contact (owner_person_id, subject_person_id, capture_source) VALUES ($1,$2,'manual') RETURNING id",
        [a, b],
      )
    ).rows[0].id;
    // A has a contact for B; B has none for A, so B's note has no owner-side home.
    await p.query(
      `INSERT INTO interaction (connection_id, logged_by_person_id, channel, summary, occurred_at)
       VALUES ($1,$2,'note','by A', now() - interval '10 days'), ($1,$3,'note','by B', now())`,
      [conn, a, b],
    );

    await runMigrations(p);

    const rows = await p.query("SELECT summary, contact_id FROM interaction ORDER BY summary");
    expect(rows.rows).toEqual([{ summary: "by A", contact_id: aContact }]);
    const c = await p.query("SELECT last_interaction_at, strength FROM contact WHERE id = $1", [aContact]);
    // Recency comes from A's own note (10 days ago), not B's newer one.
    expect(Date.now() - new Date(c.rows[0].last_interaction_at).getTime()).toBeGreaterThan(9 * 86_400_000);
    expect(c.rows[0].strength).toBeCloseTo(0.25);
  });

  it("refuses a migration edited after it was applied", async () => {
    const dir = await mkdtemp(path.join(tmpdir(), "migrations-"));
    try {
      await cp(MIGRATIONS_DIR, dir, { recursive: true });
      const p = await db();
      await runMigrations(p, { dir });
      await writeFile(path.join(dir, "0001_baseline.sql"), "-- edited\n", { flag: "a" });
      await expect(runMigrations(p, { dir })).rejects.toThrow(/changed after being applied/);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("rolls back a failing migration and leaves it unrecorded", async () => {
    const dir = await mkdtemp(path.join(tmpdir(), "migrations-"));
    try {
      await cp(MIGRATIONS_DIR, dir, { recursive: true });
      await writeFile(path.join(dir, "9999_broken.sql"), "CREATE TABLE half_done (id int); SELECT nonsense_fn();");
      const p = await db();
      await expect(runMigrations(p, { dir })).rejects.toThrow(/9999_broken failed/);
      expect(await versions(p)).not.toContain("9999_broken");
      const t = await p.query("SELECT to_regclass('half_done') AS t");
      expect(t.rows[0].t).toBeNull();
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});
