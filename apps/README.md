# Identity & Card Core — apps

A thin vertical slice of the Identity & Card Core module: `apps/api` (Fastify + Postgres)
and `apps/web` (React + Vite). See `docs/` for the full product design corpus; this slice
intentionally omits real Account/OAuth auth (ADR-0008) — `edit_token` stands in for it — and
has never been deployed anywhere. Everything below is either run locally or build-verified
locally; no external hosting account has been touched.

## Local development

1. Start Postgres 16 and create the database:
   ```
   sudo pg_ctlcluster 16 main start   # or: brew services start postgresql@16
   createdb digital_identity
   psql digital_identity -f apps/api/src/schema.sql
   ```
2. Configure env vars:
   ```
   cp apps/api/.env.example apps/api/.env
   cp apps/web/.env.example apps/web/.env   # currently no variables required
   ```
3. Install dependencies and run both apps:
   ```
   npm install
   npm run dev
   ```
   The web app proxies `/api/*` to `http://localhost:4000` (see `apps/web/vite.config.ts`).
   Open `http://localhost:5173`.

## Running tests

```
npm test --workspace=apps/api     # vitest + Fastify app.inject(), against the dev Postgres DB
npm test --workspace=apps/web     # vitest + @testing-library/react (jsdom)
npm run test:e2e                  # Playwright, drives both dev servers end-to-end
```

API tests truncate all tables in `beforeEach` and run against the same `digital_identity`
database used for local dev — a deliberate simplification for this slice rather than standing
up a separate test database.

## Validation and error handling

Every route validates its body/params against a JSON schema (`apps/api/src/schemas.ts`) via
Fastify's built-in `ajv` integration. Validation failures return `400 { error: "Validation
failed", details: [...] }`; any other unhandled error is logged server-side and returns a
generic `500 { error: "Internal server error" }` (see the `setErrorHandler` in
`apps/api/src/app.ts`). `GET /healthz` returns a plain `200` and backs the Docker healthcheck.

## Deploying (not done — these commands are unexecuted)

Nothing described here has been run against any external host. Outbound access to Docker Hub
is blocked by this session's network policy, so `docker compose build` has **not** been
verified in this environment; the Dockerfiles were checked by building the underlying `tsc`/
`vite` outputs directly. Verify the build yourself before trusting it in CI/production:

```
docker compose build
```

This builds:
- `apps/api/Dockerfile`: multi-stage — `npm ci` at the repo root (npm workspaces require the
  root lockfile), `tsc` build, then a slim `node:22-slim` runtime running `node dist/server.js`.
  Reads `DATABASE_URL`, `PORT`, `WEB_BASE_URL` from the environment; exposes `/healthz` for
  `HEALTHCHECK`.
- `apps/web/Dockerfile`: multi-stage — `vite build`, then served as static assets by
  `nginx:1.27-alpine` (`apps/web/nginx.conf`), which also reverse-proxies `/api/*` to the `api`
  service so the built frontend can keep using relative `fetch("/api/...")` calls.

`docker-compose.yml` at the repo root wires `postgres:16-alpine` + `api` + `web`, applying
`apps/api/src/schema.sql` via Postgres's `/docker-entrypoint-initdb.d` convention. To actually
run it locally (still not a deploy — everything stays on your machine):

```
docker compose up --build
```

Then `http://localhost:8080` (web) and `http://localhost:4000` (api). To deploy for real, push
the built images to a registry and a host of your choice (e.g. `docker compose push` against a
configured registry, or `docker build`/`docker push` per image) — no such host or registry has
been configured or touched as part of this work.
