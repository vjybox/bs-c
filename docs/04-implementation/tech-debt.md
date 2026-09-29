# Technical Debt Register

> Status: v0.3 · Owner: Architecture · Last updated: 2026-09-29
> Every entry is a known, deliberate gap between the code and an accepted design decision. Entries are closed by linking the commit that fixed them, never deleted.

**Severity:** **High** = could leak data or lose it; **Medium** = blocks a planned phase or will be costly to fix later; **Low** = cleanup.

| ID | Debt | Violates / relates to | Severity | Why it exists | Fix | Due |
|---|---|---|---|---|---|---|
| TD-01 | Row-level security is not enabled; tenant isolation relies on owner checks in each route | ADR-0001 | High (at scale) | Only personal tenants exist; every read is already owner-filtered and tested | `ENABLE ROW LEVEL SECURITY` + policies on `tenant_id`, with a per-request `SET app.tenant_id`; fitness test asserting RLS is on | Before the first organization tenant, or 1,000 users |
| TD-02 | No outbox relay; events accumulate unpublished and are never pruned | ADR-0004, ADR-0007 | Medium | No consumer exists yet | Relay via `LISTEN/NOTIFY` with a polling fallback; mark `published_at`; retention job | With the first consumer (Phase 2) |
| TD-03 | Auth is a static `edit_token` in `localStorage`: no expiry, no revocation, lost after 7 days on iOS | ADR-0008, ADR-0017 | High | Placeholder from the demo slice | ADR-0017 (Phase 1 Slice 2) | Before any real user |
| TD-04 | The service worker caches `/api` responses by URL, while the credential is a header; on a shared device the next user offline can see the previous user's data | Rulebook §10 | High | Offline read support shipped before real auth | Cache only responses tagged with an account id; `signOut()` clears caches | Slice 2 |
| TD-05 | Sign-out does not clear the IndexedDB queue (which stores the token per item); the queue drops 401/403 items silently | Rulebook §4.3 | High | Same | Queue stores an account id, keeps items on 401/403, shows "Sign in to sync N captures" | Slice 2 |
| TD-06 | No rate limiting on unauthenticated writes (card creation, field requests) | `04-integration-api-gateway.md` (rate limiting at the gateway) | Medium | No public deployment yet | `@fastify/rate-limit` with `trustProxy` | Slice 2 |
| TD-07 | `connection.strength` and `connection.last_interaction_at` are dead columns | ADR-0020 | Low | Kept so migration 0002 destroyed nothing | Drop in a later migration once a backup cycle has passed | Any time after the conference |
| TD-08 | The server stores the automatic note text ("Contact saved via card share") as English in `interaction.summary` | ADR-0023 | Low | Predates the catalogue | Store a system-note code; render through the catalogue | Before the second language |
| TD-09 | API errors are English strings with no stable error codes | ADR-0023, ADR-0003 | Medium | Grew route by route | `{ code, message }` error envelope; the web maps codes to catalogue keys | Before the second language, or the first SDK |
| TD-10 | Routes declare request schemas but not response schemas; the OpenAPI document has no per-route security | ADR-0003 | Medium | Fast iteration | Response schemas (these also make Fastify serialise faster); security per route; fitness check | Before publishing an SDK |
| TD-11 | Offline sync covers new records only; there are no record versions, so a queued edit would overwrite blindly | ADR-0010 | Medium | Only captures are queued | Version column + conflict surfacing, as ADR-0010 describes | Before any edit is queued offline |
| TD-12 | The global `CompanyProfile` write path is undesigned; `PATCH /api/v1/companies/:id` returns 403 | ADR-0016 | Medium | Any signed-in person could otherwise rename a company for everyone | Moderated suggestions, or claimed-domain ownership | Before the directory is promoted |
| TD-13 | Backups sit on the same host; the compose stack itself has never run under Docker in CI | ADR-0012 | High (for real data) | No CI with a Docker daemon; single-host deployment | Off-host copy (Hyper Backup / object storage); a CI job running `docker compose up` and a restore | Before the conference |
| TD-14 | Restore is a manual procedure | ADR-0012 | Medium | Same | A scripted restore, rehearsed monthly | With TD-13 |
| TD-15 | Strength is recomputed synchronously in the write transaction; the module doc wants it asynchronous with decay | Contacts module §4 (non-functional requirements) | Low | Cheap at current size, and exact | Move to an outbox consumer with time decay | Phase 2, or when p99 write latency needs it |
| TD-16 | No metrics, tracing or alerting | `07-observability-and-platform-ops.md` | Medium | Pre-deployment | OpenTelemetry traces + a health dashboard; alert on backup failure | Slice 2 (at minimum, backup-failure alert) |
| TD-17 | API tests share the local dev database and truncate it | — | Low | Simplicity | A dedicated test database created by the global setup | Any time |
| TD-18 | The recipient view polls every 3 s for approvals | — | Low | No realtime channel | Server-sent events fed by the outbox | Phase 2 |
| TD-19 | Demo fixtures are captured by a hand-run script | — | Low | One-off need | Make capture an npm script run in CI against a seeded database | Any time |

## Closed

_None yet._ Slice 1 and the platform-hooks work closed debt that was never registered: the notes leak, non-idempotent replays, wrong recency, `down -v` schema changes, no backups, demo tokens open by default, a field-request race, and unrecorded ADR drift. Those fixes are described in [`../CHANGELOG.md`](../CHANGELOG.md) 0.3.0.
