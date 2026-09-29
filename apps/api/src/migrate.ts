import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import type pg from "pg";

// Resolves to apps/api/migrations from both src/ (tsx) and dist/ (compiled), since both
// sit one level below the package root. The Dockerfile copies migrations/ alongside dist/.
export const MIGRATIONS_DIR = fileURLToPath(new URL("../migrations/", import.meta.url));

const BASELINE = "0001_baseline";
// Arbitrary constant; serialises concurrent runners (two api replicas, api + seed).
const LOCK_KEY = 7_311_204;

interface Migration {
  version: string;
  sql: string;
  checksum: string;
}

async function loadMigrations(dir: string): Promise<Migration[]> {
  const files = (await readdir(dir)).filter((f) => /^\d{4}_.+\.sql$/.test(f)).sort();
  return Promise.all(
    files.map(async (file) => {
      const sql = await readFile(path.join(dir, file), "utf8");
      return {
        version: file.replace(/\.sql$/, ""),
        sql,
        checksum: createHash("sha256").update(sql).digest("hex"),
      };
    }),
  );
}

/**
 * Applies every migration in `dir` not yet recorded in schema_migrations, each in its own
 * transaction. A database created before migrations existed (tables present, no ledger)
 * has the baseline recorded as applied rather than re-run. An applied migration whose file
 * has since changed is an error: edit history by adding a migration, never by rewriting one.
 */
export async function runMigrations(
  pool: pg.Pool,
  options: { dir?: string; log?: (msg: string) => void } = {},
): Promise<string[]> {
  const log = options.log ?? (() => {});
  const migrations = await loadMigrations(options.dir ?? MIGRATIONS_DIR);
  const client = await pool.connect();
  const applied: string[] = [];
  try {
    await client.query("SELECT pg_advisory_lock($1)", [LOCK_KEY]);
    await client.query(`CREATE TABLE IF NOT EXISTS schema_migrations (
      version text PRIMARY KEY,
      checksum text NOT NULL,
      applied_at timestamptz NOT NULL DEFAULT now()
    )`);

    const ledger = await client.query<{ version: string; checksum: string }>(
      "SELECT version, checksum FROM schema_migrations",
    );
    const recorded = new Map(ledger.rows.map((r) => [r.version, r.checksum]));

    if (recorded.size === 0) {
      const legacy = await client.query<{ t: string | null }>("SELECT to_regclass('person') AS t");
      const baseline = migrations.find((m) => m.version === BASELINE);
      if (legacy.rows[0].t && baseline) {
        await client.query("INSERT INTO schema_migrations (version, checksum) VALUES ($1, $2)", [
          baseline.version,
          baseline.checksum,
        ]);
        recorded.set(baseline.version, baseline.checksum);
        log(`migrate: existing schema found, recorded ${BASELINE} as applied`);
      }
    }

    for (const m of migrations) {
      const prior = recorded.get(m.version);
      if (prior) {
        if (prior !== m.checksum) {
          throw new Error(
            `Migration ${m.version} was changed after being applied. Add a new migration instead.`,
          );
        }
        continue;
      }
      await client.query("BEGIN");
      try {
        await client.query(m.sql);
        await client.query("INSERT INTO schema_migrations (version, checksum) VALUES ($1, $2)", [
          m.version,
          m.checksum,
        ]);
        await client.query("COMMIT");
      } catch (err) {
        await client.query("ROLLBACK");
        throw new Error(`Migration ${m.version} failed: ${(err as Error).message}`);
      }
      applied.push(m.version);
      log(`migrate: applied ${m.version}`);
    }
    return applied;
  } finally {
    await client.query("SELECT pg_advisory_unlock($1)", [LOCK_KEY]).catch(() => {});
    client.release();
  }
}
