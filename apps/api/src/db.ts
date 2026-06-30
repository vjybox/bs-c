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
