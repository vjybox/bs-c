# Identity & Card Core — apps

A thin vertical slice of the Identity & Card Core module: `apps/api` (Fastify + Postgres)
and `apps/web` (React + Vite). See `docs/` for the full product design corpus; this slice
intentionally omits real Account/OAuth auth (ADR-0008) — `edit_token` stands in for it — and
has not been deployed to any public host. The Docker stack has been run end to end (see
"Verified under Docker" below); no external hosting account has been touched.

## Trying it out (one command)

```
DEMO_MODE=true docker compose up --build
```

Then open `http://localhost:8080` and click **"Sign in as a demo persona"**. Compose brings up
Postgres, the API applies the schema migrations, the seed loads demo data, and nginx serves the
built web app with `/api/*` proxied to the API. Nothing else to install.

`DEMO_MODE` is **off by default**, and one flag controls both halves of demo mode: the seed only
loads the sample people when it is `true`, and their committed sign-in tokens are only accepted
when it is `true`. A plain `docker compose up --build` is a real, empty deployment. To keep demo
mode on across restarts, put `DEMO_MODE=true` in `.env`.

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

This exact dump/restore pair was verified against a seeded database (identical row counts and
content, and the restored database needed no further migrations), and the `backup` service was
seen writing its dump under Docker. The first dump is taken at startup, so on a brand-new
stack it may predate the seed; the next scheduled one includes everything.

### Verified under Docker

On 2026-09-29 the full stack was built and run under Docker Engine 29.3 with `docker compose`,
using the Dockerfiles and compose file exactly as committed. Two sandbox-only adjustments were
kept out of the repo: base images were pulled from a Docker Hub mirror (the sandbox's shared IP
was rate-limited), and the build containers were given the sandbox's TLS proxy certificate.
Checked:

- All images build (TypeScript compile, Vite bundle). The seed applies all migrations and loads
  the seven personas; the api becomes healthy; the backup service writes a dump.
- In a real browser through nginx on port 8080: demo sign-in, contacts, notes, and the full
  offline sequence (service worker, offline reload, queued capture, sync on reconnect, offline
  vCard share).
- **Over plain HTTP from a non-localhost address** (as `http://<nas-ip>:8080` is): saving a
  contact and logging a note work. Browsers only provide `crypto.randomUUID` on HTTPS or
  localhost, which previously made every save fail there; `apps/web/src/ids.ts` falls back.
- Data survives `docker compose restart` and `down` + `up`; the seed skips an existing database.
- `DEMO_MODE=false`: demo tokens refused (403), the personas route gone (404), card creation
  still works.
- **nginx follows a recreated api container.** It used to resolve `api` once at startup, so
  recreating only the api (any `.env` change or update) left every request failing with 502
  until the web container was restarted too. `apps/web/nginx.conf` now re-resolves via
  Docker's DNS; verified by forcing the api onto a new IP.

Not checked here: Synology's own Container Manager and its Compose version, and a real phone.

To reseed by hand, or to seed a non-Docker database (it refuses unless `DEMO_MODE=true`, set
in the environment or `apps/api/.env`):

```
DEMO_MODE=true npm run seed --workspace=apps/api
```

It is idempotent — it exits without doing anything if the database already has people in it.

## Running it on a Synology NAS (Container Manager)

Tested path: **x86_64 NAS, DSM 7.2 with Container Manager 24.x**, project downloaded as a ZIP,
reached from phones over **HTTPS through a free Synology DDNS name**. HTTPS is not optional
decoration: browsers disable offline mode, installing to the home screen and copy-to-clipboard
on plain HTTP. Plain `http://<nas-ip>:8080` still works for everything else, which makes it the
right first check.

### 1. Put the project on the NAS

1. On GitHub, switch to branch `claude/digital-identity-platform-design-gfrgn1` → **Code** →
   **Download ZIP**.
2. In **File Station**, create `/docker/digital-identity` (on `volume1`), upload the ZIP there
   and **Extract**. The ZIP contains one folder named after the repository and branch; move its
   *contents* up so that `docker-compose.yml` sits directly in `/docker/digital-identity`.

> Copy the whole folder, not just `docker-compose.yml` — the api, web and seed images build
> from the source in it.

### 2. Create `.env`

In that folder, copy `.env.example` to `.env` (File Station → Copy, then rename; or create it in
Text Editor) and set:

```
WEB_BASE_URL=https://yourname.synology.me
WEB_PORT=8080
POSTGRES_PASSWORD=pickLettersAndDigits42
DEMO_MODE=true
```

- `WEB_BASE_URL` is the address phones will open: share links and QR codes are built from it.
  Until step 5 is done you can use `http://<nas-ip>:8080` and change it later (then rebuild —
  step 3 again — or just restart the project).
- `POSTGRES_PASSWORD`: letters and digits only, and set it **before the first start** —
  Postgres only reads it when its volume is created.
- If DSM already uses port 8080 (Web Station does), set `WEB_PORT=8788` or any free port and
  use it in the reverse proxy below.

### 3. Build and start

**Container Manager → Project → Create**:
- Project name: `digital-identity`
- Path: `/docker/digital-identity` — it detects the existing `docker-compose.yml`; choose to use it.
- Skip the Web Station portal option. Finish; it builds and starts.

The first build takes roughly 5–15 minutes (it installs dependencies and compiles on the NAS).
When done, under **Container** you should see `postgres`, `api`, `web` and `backup` running and
`seed` **stopped** — the seed runs once and exits; that is correct. Its log should end with the
list of demo personas.

### 4. Check it on the LAN

Open `http://<nas-ip>:8080` (DSM → Control Panel → Network → Network Interface shows the IP),
click **Sign in as a demo persona**, pick Mara, open a contact and log a note.

### 5. HTTPS with a Synology DDNS name

1. **DDNS** — Control Panel → External Access → DDNS → **Add**: service provider *Synology*,
   choose a hostname (`yourname.synology.me`), external address *Auto*. Tick *Get a certificate
   from Let's Encrypt* if offered.
2. **Router** — forward TCP **443** and **80** to the NAS's LAN IP. Port 80 is needed for
   Let's Encrypt to issue and renew the certificate.
3. **Certificate** (if not created in 1) — Control Panel → Security → Certificate → **Add** →
   *Add a new certificate* → *Get a certificate from Let's Encrypt* → domain
   `yourname.synology.me`.
4. **Reverse proxy** — Control Panel → Login Portal → Advanced → **Reverse Proxy** → Create:
   - Source: protocol **HTTPS**, hostname `yourname.synology.me`, port **443**
   - Destination: protocol **HTTP**, hostname `localhost`, port **8080** (or your `WEB_PORT`)
5. **Assign the certificate** — Control Panel → Security → Certificate → **Settings**: set the
   `yourname.synology.me` reverse-proxy entry to use the Let's Encrypt certificate.
6. Make sure `.env` has `WEB_BASE_URL=https://yourname.synology.me`, then in Container Manager
   → Project → `digital-identity` → **Action → Restart**.

### 6. Test from a phone

Turn Wi-Fi **off** (use mobile data, so you are really coming in from outside), then:

1. Open `https://yourname.synology.me` → Sign in as a demo persona → Mara.
2. **Add to Home Screen** (Safari: Share → Add to Home Screen; Chrome: ⋮ → Install app), and
   open it from the icon.
3. **Share** → a QR code appears; scan it with a second phone → the card opens.
4. Turn on **airplane mode** → the app shows *Offline*; open a contact and log a note → it
   shows *1 waiting to sync*. Turn airplane mode off → the banner clears; reload → the note is
   there.
5. In airplane mode, **Share** again → the QR carries a vCard with public details only.

### Security while testing

With ports 443/80 open and `DEMO_MODE=true`, **anyone who finds the address can sign in as the
demo personas and create cards**. That is acceptable for fake demo data during a test window,
not for real people:

- Close the router forwards when you are not testing.
- Real sign-in (ADR-0017) and rate limiting are not built yet (tech-debt TD-03, TD-06). Set
  `DEMO_MODE=false` and wait for them before anyone enters real details.
- Add the project's `backups/` folder to **Hyper Backup** so dumps leave the NAS (TD-13).
- Postgres and the API are never published; only nginx (`WEB_PORT`) is.

### Updating to a newer version

Download the new ZIP and replace the project files, **keeping `.env` and `backups/`**. Then
Container Manager → Project → `digital-identity` → **Action → Build** (it rebuilds and restarts).
Schema changes apply themselves on start. **Never delete the project's volume** — that is the
database.

### Architecture notes

`postgres:16-alpine`, `node:22-slim` and `nginx:1.27-alpine` are multi-arch and nothing compiles
native code, so ARM64 models work too. On a 2 GB model the build may be tight (it runs `npm ci`
twice plus `tsc` and Vite); if it fails for memory, build on a desktop and load the images.

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

## Deploying

Nothing described here has been run against any external host. The images and compose stack
were built and run locally under Docker (see "Verified under Docker"). To build:

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
