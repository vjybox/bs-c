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

// Single source of truth for the strength formula, used both when an interaction
// is logged directly and when a contact-save implicitly logs the first one.
export async function recomputeConnectionStrength(
  client: pg.Pool | pg.PoolClient,
  connectionId: string,
): Promise<{ strength: number; last_interaction_at: string }> {
  const result = await client.query<{ strength: number; last_interaction_at: string }>(
    `UPDATE connection SET
       last_interaction_at = now(),
       strength = LEAST(1.0, 0.1 + (
         SELECT count(*) FROM interaction
         WHERE connection_id = $1
           AND occurred_at > now() - interval '90 days'
       ) * 0.15)
     WHERE id = $1
     RETURNING strength, last_interaction_at`,
    [connectionId],
  );
  return result.rows[0];
}
