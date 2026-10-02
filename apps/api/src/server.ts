import { buildApp } from "./app.js";
import { pool } from "./db.js";
import { runMigrations } from "./migrate.js";
import { seedDemoData } from "./seed.js";

try {
  await runMigrations(pool, { log: (msg) => console.log(msg) });
} catch (err) {
  // The classic first-deploy trap: Postgres reads POSTGRES_PASSWORD only when its volume is
  // first created, so editing .env afterwards locks the api out. Say so in one line instead
  // of a stack trace repeated on every restart.
  if ((err as { code?: string }).code === "28P01") {
    console.error(
      "Database refused the password. POSTGRES_PASSWORD in .env differs from the one the " +
        "database was created with (Postgres only reads it when its volume is first created). " +
        "Restore the original password, or, if the database holds nothing you need, delete the " +
        "postgres-data volume and start again. See apps/README.md, Synology troubleshooting.",
    );
    process.exit(1);
  }
  throw err;
}
// No-op unless DEMO_MODE=true and the database is empty.
await seedDemoData();

const app = await buildApp();

const port = Number(process.env.PORT ?? 4000);

app.listen({ port, host: "0.0.0.0" }).catch((err) => {
  app.log.error(err);
  process.exit(1);
});
