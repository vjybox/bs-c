# Identity & Card Core — apps

A thin vertical slice of the Identity & Card Core module: `apps/api` (Fastify + Postgres)
and `apps/web` (React + Vite). See `docs/` for the full product design corpus; this slice
intentionally omits real Account/OAuth auth (ADR-0008) — `edit_token` stands in for it — and
has never been deployed anywhere. Everything below is either run locally or build-verified
locally; no external hosting account has been touched.

## Trying it out (one command)

```
DEMO_MODE=true docker compose --profile demo up --build
```

Then open `http://localhost:8080` and click **"Sign in as a demo persona"**. Compose brings up
Postgres, the API applies the schema migrations, the `demo` profile seeds demo data, and nginx
serves the built web app with `/api/*` proxied to the API. Nothing else to install.

Both parts are needed and both are off by default: `--profile demo` creates the seeded people,
`DEMO_MODE=true` lets their committed tokens sign in. A plain `docker compose up --build` is a
real, empty deployment — no demo personas exist and the demo tokens are refused even if a demo
seed once ran against that database. To make demo mode stick, uncomment `COMPOSE_PROFILES=demo`
and `DEMO_MODE=true` in `.env`.

The seed creates seven people from the design corpus's personas. **Mara Oyelaran** has the most
to look at: six contacts with different relationship strengths, an interaction history going
back months, a pending field request to approve, and one relationship that has gone quiet so
reconnection suggestions actually fire.

Demo sign-in is gated: `GET /api/v1/demo/personas` hands out edit tokens, so it is only registered
when `DEMO_MODE=true`. With the flag off the route does not exist and returns 404.

### Schema changes

The schema lives in numbered SQL files in `apps/api/migrations/`, applied by
`apps/api/src/migrate.ts` every time the API starts (and by the seed and the test runner). Each
runs once, in its own transaction, recorded in `schema_migrations` with a checksum; an applied
file that is later edited stops the API with an error, so history is changed by adding a
migration, never by rewriting one. Upgrading is just `docker compose up --build` —
**never `docker compose down -v`**, which deletes the database volume and every contact in it.

A database created before migrations existed is detected (tables present, no ledger) and has
`0001_baseline` recorded as applied rather than re-run.

### Backups

The `backup` service writes a `pg_dump` custom-format dump to `./backups/` immediately and then
every `BACKUP_INTERVAL_SECONDS` (default daily — set `3600` around an event), deleting dumps
older than `BACKUP_RETENTION_DAYS` (default 14). The folder is on the host, so it survives the
containers; copy it off the machine too (Synology Hyper Backup, rsync) — a backup on the same
disk does not survive the disk.

To restore one, into an empty database:

```
docker compose stop api
docker compose exec -T postgres dropdb -U postgres digital_identity
docker compose exec -T postgres createdb -U postgres digital_identity
docker compose exec -T postgres pg_restore -U postgres --no-owner -d digital_identity < backups/digital_identity-<timestamp>.dump
docker compose start api
```

This exact dump/restore pair was verified against a seeded database here (identical row counts
and content, and the restored database needed no further migrations); the compose service
wrapping it was not run, as there is no Docker daemon in this environment.

> **Not verified here.** `docker compose up` has never been executed in the environment this was
> written in — no Docker daemon is available, and outbound access to Docker Hub is restricted.
> The application logic behind it (seed script, demo endpoint, full browser flow) was verified
> against a local Postgres; the image build and compose orchestration were not.

To reseed by hand, or to seed a non-Docker database:

```
npm run seed --workspace=apps/api
```

It is idempotent — it exits without doing anything if the database already has people in it.

## Running it on a Synology NAS (Container Manager)

> **Copy the whole project folder to the NAS — not just `docker-compose.yml`.** The api, web
> and seed services build from source in this folder; the compose file alone cannot build them.

1. **Copy the project** to a shared folder, e.g. `/volume1/docker/digital-identity`. File
   Station, `git clone` over SSH, or drag-and-drop all work.

2. **Create a `.env`** next to `docker-compose.yml`. Copy `.env.example` and set at minimum:

   ```
   WEB_BASE_URL=http://192.168.1.50:8080
   ```

   Use your NAS's real LAN address (DSM → Control Panel → Network → Network Interface). This
   one matters more than it looks: share links and QR codes are generated from it, so if it
   still says `localhost`, every QR code you scan from a phone points the phone at itself.

   If something already holds port 8080 — Web Station and a few other DSM packages do — set
   `WEB_PORT=8788` (or anything free) and use the same port in `WEB_BASE_URL`.

3. **Container Manager → Project → Create.** Set the path to the folder from step 1; it will
   detect `docker-compose.yml`. Start it. The first build takes a while: it compiles the API
   and bundles the web app on the NAS.

   For a demo with the seeded personas, also uncomment `COMPOSE_PROFILES=demo` and
   `DEMO_MODE=true`. Leave them commented for real use.

4. **Open `http://<nas-ip>:8080`.** In demo mode, click *"Sign in as a demo persona."*

Backups go to the `backups/` folder inside the project folder — include it in Hyper Backup.

Only the web port is published. Postgres and the API are reachable only from inside the compose
network, which is why the default database password is harmless — nothing outside the stack can
connect to it.

**Demo mode is off by default.** Turned on, `GET /api/v1/demo/personas` hands out edit tokens —
full access to every demo identity — to anyone who can reach the app. On a home LAN, for a
demo, that is the point. If this NAS is reachable from anywhere else, leave it off.

Architecture is not a concern: `postgres:16-alpine`, `node:22-slim` and `nginx:1.27-alpine` are
all multi-arch, and the dependency tree has no native compilation, so this builds on x86_64 and
ARM64 Synology models alike. On a 2 GB model the build may be tight — it runs `npm ci` twice
plus `tsc` and Vite — in which case build the images on a desktop and load them onto the NAS.

## Local development

1. Start Postgres 16 and create the database:
   ```
   sudo pg_ctlcluster 16 main start   # or: brew services start postgresql@16
   createdb digital_identity
   ```
   No schema step: the API applies `apps/api/migrations/` when it starts. For demo data, run
   `npm run seed --workspace=apps/api` and set `DEMO_MODE=true` in `apps/api/.env`.
2. Configure env vars (optional — the code defaults to the same values, and the dev script
   uses `--env-file-if-exists`, so a missing `.env` is not fatal):
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

## Offline behaviour

The web app is an installable PWA and the capture moment works with no network, which is the
point: the flows that matter happen in conference halls and basements.

- **Service worker** (`apps/web/public/sw.js`) — hand-rolled runtime caching, no build plugin.
  Cache-first for content-hashed assets, network-first for `GET /api` so already-synced records
  stay readable; a cache-served response carries `x-from-cache` so the UI can mark it stale.
  Registered only in a production, non-demo build — artifacts do not support service workers,
  and registering in dev fights HMR.
- **Offline write queue** (`apps/web/src/offline-queue.ts`) — saving a contact and logging an
  interaction queue in IndexedDB when there is no network and replay on reconnect, oldest first
  so ordering holds. IndexedDB rather than memory so a capture survives the app being closed.
  A 4xx is dropped rather than retried forever; only network errors and 5xx are requeued.
  Card editing is at-desk work and is deliberately *not* queued — it fails loudly.
- **Offline share** — when a scoped session cannot be created, the QR falls back to a vCard
  containing **public fields only**, which scans with no network on either phone. This is a
  stated exception in rulebook §6.7: a public field is already unrestricted, so a copy bypasses
  no gate and forfeits no revocation. Gated fields never appear in an offline payload, and
  `apps/web/src/vcard.test.ts` enforces that directly. The UI names which form it handed over.
- **Connectivity banner** — the visible staleness marker rulebook §5.6 requires, with the count
  of writes still waiting to sync.

To exercise it, build and preview rather than using the dev server (the service worker only
registers in a production build):

```
npm run build --workspace=apps/web
npm run preview --workspace=apps/web    # http://localhost:4173
```

Then use your browser's offline toggle. `vite preview` proxies `/api` to port 4000 the same way
the dev server does.

## Static demo build

There is a second build mode that produces a fully standalone version of the web app with no
backend at all — useful for sharing a clickable walkthrough:

```
npm run build --workspace=apps/web -- --mode demo --outDir dist-demo
```

How it works: every network call in the app goes through `apps/web/src/api.ts`, so the demo
build swaps that one module for `api.demo.ts` (see the `useDemoApi` plugin in
`apps/web/vite.config.ts`). Reads are served from `apps/web/src/demo-fixtures.json`, which was
captured verbatim from the real API running against a seeded database — so the data shown is
genuine backend output rather than a re-derivation of it. Writes are simulated in memory and
reset on reload.

The build also switches to `HashRouter` (no server to rewrite unknown paths) and uses relative
asset paths, so `dist-demo/` can be served from any static host or subdirectory. A banner marks
it as a demo. To refresh the fixtures after changing the seed or an API response shape, run the
API against a seeded database and re-capture; `demo-fixtures.json` records its `capturedAt`.

## API surface and platform hooks

- **Versioned REST.** Every route is under `/api/v1/`; the OpenAPI 3 document is served at
  `GET /api/v1/openapi.json`, generated from the same JSON schemas the routes validate with.
- **Tenancy.** Every person has a personal tenant, and every tenant-scoped row carries a
  `tenant_id` (ADR-0001). Row-level security policies are not enabled yet.
- **Domain events.** Each successful write also writes an `outbox_event` row in the same
  transaction (ADR-0004, ADR-0007). Payloads carry ids only — no field values or notes. Nothing
  consumes them yet; they are the hook automations, webhooks and AI context will read.
- **Architecture fitness tests** (`apps/api/src/architecture.test.ts`,
  `apps/web/src/i18n/i18n.test.tsx`) fail if a table lacks `tenant_id`, a route is unversioned
  or undocumented, a write path declares no event, an event leaks private content, or a page
  contains literal UI text instead of a catalogue key (`apps/web/src/i18n/en.ts`).

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

`docker-compose.yml` at the repo root wires `postgres:16-alpine` + `api` + `web` + `backup`;
the API migrates the schema at boot. To actually run it locally (still not a deploy —
everything stays on your machine):

```
docker compose up --build
```

Then `http://localhost:8080`. (The API is not published; nginx proxies to it.) To deploy for real, push
the built images to a registry and a host of your choice (e.g. `docker compose push` against a
configured registry, or `docker build`/`docker push` per image) — no such host or registry has
been configured or touched as part of this work.
