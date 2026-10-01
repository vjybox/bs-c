import { buildApp } from "./app.js";
import { pool } from "./db.js";
import { runMigrations } from "./migrate.js";
import { seedDemoData } from "./seed.js";

await runMigrations(pool, { log: (msg) => console.log(msg) });
// No-op unless DEMO_MODE=true and the database is empty.
await seedDemoData();

const app = await buildApp();

const port = Number(process.env.PORT ?? 4000);

app.listen({ port, host: "0.0.0.0" }).catch((err) => {
  app.log.error(err);
  process.exit(1);
});
