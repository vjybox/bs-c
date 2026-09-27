import Fastify, { type FastifyError } from "fastify";
import cors from "@fastify/cors";
import cardsRoutes from "./routes/cards.js";
import shareSessionsRoutes from "./routes/shareSessions.js";
import fieldRequestsRoutes from "./routes/fieldRequests.js";
import contactsRoutes from "./routes/contacts.js";
import connectionsRoutes from "./routes/connections.js";
import demoRoutes from "./routes/demo.js";

export async function buildApp() {
  const app = Fastify({ logger: true });

  app.setErrorHandler((err: FastifyError, request, reply) => {
    if (err.validation) {
      return reply.code(400).send({ error: "Validation failed", details: err.validation });
    }
    request.log.error(err);
    reply.code(500).send({ error: "Internal server error" });
  });

  app.get("/healthz", async () => ({ status: "ok" }));

  await app.register(cors, { origin: true });
  await app.register(cardsRoutes);
  await app.register(shareSessionsRoutes);
  await app.register(fieldRequestsRoutes);
  await app.register(contactsRoutes);
  await app.register(connectionsRoutes);

  // Demo-only identity switcher. Registered at buildApp() time so the env var is read per
  // call (tests build a fresh app each time). Unregistered means unreachable, not forbidden.
  if (process.env.DEMO_MODE === "true") {
    await app.register(demoRoutes);
  }

  return app;
}
