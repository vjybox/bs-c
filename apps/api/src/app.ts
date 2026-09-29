import Fastify, { type FastifyError, type RouteOptions } from "fastify";
import cors from "@fastify/cors";
import swagger from "@fastify/swagger";
import cardsRoutes from "./routes/cards.js";
import shareSessionsRoutes from "./routes/shareSessions.js";
import fieldRequestsRoutes from "./routes/fieldRequests.js";
import contactsRoutes from "./routes/contacts.js";
import companiesRoutes from "./routes/companies.js";
import demoRoutes from "./routes/demo.js";

export interface BuildAppOptions {
  /** Observes every route as it is registered (used by the architecture fitness tests). */
  onRoute?: (route: RouteOptions) => void;
}

export async function buildApp(options: BuildAppOptions = {}) {
  const app = Fastify({ logger: true });
  if (options.onRoute) app.addHook("onRoute", options.onRoute);

  app.setErrorHandler((err: FastifyError, request, reply) => {
    if (err.validation) {
      return reply.code(400).send({ error: "Validation failed", details: err.validation });
    }
    request.log.error(err);
    reply.code(500).send({ error: "Internal server error" });
  });

  // ADR-0003: REST is canonical and described by OpenAPI. Generated from the same JSON
  // schemas Fastify validates with, so the document cannot drift from the running API.
  // Registered before the routes so its onRoute hook sees every one of them.
  await app.register(swagger, {
    openapi: {
      info: { title: "Digital Identity Platform API", version: "1" },
      components: {
        securitySchemes: {
          // Interim credential; replaced by a session cookie in ADR-0017.
          editToken: { type: "apiKey", in: "header", name: "x-edit-token" },
        },
      },
    },
  });

  app.get("/healthz", { schema: { hide: true } }, async () => ({ status: "ok" }));
  app.get("/api/v1/openapi.json", { schema: { hide: true } }, async () => app.swagger());

  await app.register(cors, { origin: true });
  await app.register(cardsRoutes);
  await app.register(shareSessionsRoutes);
  await app.register(fieldRequestsRoutes);
  await app.register(contactsRoutes);
  await app.register(companiesRoutes);

  // Demo-only identity switcher. Registered at buildApp() time so the env var is read per
  // call (tests build a fresh app each time). Unregistered means unreachable, not forbidden.
  if (process.env.DEMO_MODE === "true") {
    await app.register(demoRoutes);
  }

  return app;
}
