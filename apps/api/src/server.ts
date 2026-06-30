import Fastify from "fastify";
import cors from "@fastify/cors";
import cardsRoutes from "./routes/cards.js";
import shareSessionsRoutes from "./routes/shareSessions.js";
import fieldRequestsRoutes from "./routes/fieldRequests.js";

const app = Fastify({ logger: true });

await app.register(cors, { origin: true });
await app.register(cardsRoutes);
await app.register(shareSessionsRoutes);
await app.register(fieldRequestsRoutes);

const port = Number(process.env.PORT ?? 4000);

app.listen({ port, host: "0.0.0.0" }).catch((err) => {
  app.log.error(err);
  process.exit(1);
});
