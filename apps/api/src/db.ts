import pg from "pg";

const { Pool } = pg;

export const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL ?? "postgres://localhost:5432/digital_identity",
});

export async function query<T extends pg.QueryResultRow = pg.QueryResultRow>(
  text: string,
  params: unknown[] = [],
): Promise<pg.QueryResult<T>> {
  return pool.query<T>(text, params);
}

// An idle client losing its connection (Postgres restart, network blip) emits 'error' on
// the pool; unhandled, that would crash the process. The pool discards the client itself.
pool.on("error", (err) => {
  console.error("postgres pool error:", err.message);
});

// Single source of truth for the strength formula, used both when an interaction is logged
// directly and when a contact-save implicitly logs the first one. Recency is the latest
// interaction's own date — not the time of writing — so a back-dated or replayed offline
// capture does not make an old relationship look fresh.
export async function recomputeContactStrength(
  client: pg.Pool | pg.PoolClient,
  contactId: string,
): Promise<{ strength: number; last_interaction_at: string | null }> {
  const result = await client.query<{ strength: number; last_interaction_at: string | null }>(
    `UPDATE contact SET
       last_interaction_at = (SELECT max(occurred_at) FROM interaction WHERE contact_id = $1),
       strength = LEAST(1.0, 0.1 + (
         SELECT count(*) FROM interaction
         WHERE contact_id = $1
           AND occurred_at > now() - interval '90 days'
       ) * 0.15)
     WHERE id = $1
     RETURNING strength, last_interaction_at`,
    [contactId],
  );
  return result.rows[0];
}

/** Runs `fn` in one transaction: every write and its outbox event commit together. */
export async function withTransaction<T>(fn: (client: pg.PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}
