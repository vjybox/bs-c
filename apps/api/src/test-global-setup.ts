import "dotenv/config";
import pg from "pg";
import { runMigrations } from "./migrate.js";

// Brings the test database up to the current schema once per run, exactly as the server
// does at boot, so tests never run against a schema the app would not have.
export default async function setup() {
  const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL ?? "postgres://localhost:5432/digital_identity",
  });
  try {
    await runMigrations(pool);
  } finally {
    await pool.end();
  }
}
