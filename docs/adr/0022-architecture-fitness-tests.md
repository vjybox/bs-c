# ADR-0022: Architecture Fitness Tests Enforce Accepted ADRs

**Status**: Accepted · **Date**: 2026-09-29 · **Enforces**: [ADR-0001](0001-multi-tenant-data-isolation.md), [ADR-0003](0003-api-paradigm.md), [ADR-0004](0004-service-decomposition-boundary.md), [ADR-0007](0007-event-backbone-choice.md), [ADR-0023](0023-ui-message-catalogue.md)

## Context

A drift review in September 2026 found the code contradicting several accepted ADRs with nothing recording it:

- no `tenant_id` anywhere (ADR-0001);
- no domain events (ADR-0004, ADR-0007);
- an unversioned, undocumented API (ADR-0003);
- hard-coded English (the brief's multi-language requirement).

Each was a reasonable shortcut on its own. Together they meant the ADR log described a system that did not exist. Documentation cannot catch this; only something that runs on every change can.

## Decision

Accepted ADRs that can be checked mechanically get a test that fails on drift. Each assertion names the ADR it protects.

| Check | Protects | Where |
|---|---|---|
| Every table has `tenant_id NOT NULL`, except a recorded allowlist with the ADR permitting each entry; stale exemptions also fail | ADR-0001, 0016, 0020 | `apps/api/src/architecture.test.ts` |
| Every route is under `/api/v1/` | ADR-0003 | same |
| Every versioned route appears in the generated OpenAPI document | ADR-0003 | same |
| Every POST/PUT/PATCH/DELETE route is listed in `ROUTE_EVENTS` with its event, or with an explicit reason it emits none; stale entries also fail | ADR-0004, 0007 | same + `apps/api/src/events.ts` |
| A scenario touching every write path emits each declared event exactly once, replays and no-ops emit none, events land in the right tenant, and **no event payload contains a field value, note or name** | ADR-0007 amendment, 0020 | same |
| No page or component contains literal user-visible text | ADR-0023 | `apps/web/src/i18n/i18n.test.tsx` |

The tenancy, event-registry and UI-text checks were each shown to fail when the drift they guard against was deliberately introduced.

## Alternatives Considered

| Option | Advantages | Disadvantages |
|---|---|---|
| **Review checklist** | No code | Relies on reviewers remembering; the drift being fixed here got through exactly this way |
| **Lint rules (ESLint, SQL linters)** | Fast; editor feedback | Cannot see the database catalog or the registered routes; custom rules are costly |
| **ArchUnit-style library** | Rich dependency rules | JS equivalents are immature; they check imports, not schemas or event emission |
| **Plain tests against the real catalog and router** (chosen) | Checks the running system, not the source text; uses the existing test runner | Heuristic in places (the UI-text scan is a regex); a determined author can add an exemption, though it is visible in review |

## Consequences

- Positive: an ADR becomes an executable contract. Adding a table, route or write path without its hook fails CI in the change that introduces it.
- Negative: exemptions are deliberate friction. The allowlists must be maintained, and each entry needs an ADR reference.

## Extension points

Candidates as their ADRs are implemented:

- RLS enabled on every tenant table (ADR-0001, tech-debt TD-01);
- the `ModelRouter` as the only import site of provider SDKs (ADR-0005);
- the `EmbeddingStore` as the only writer of vector columns (ADR-0002);
- every route having a response schema (tech-debt TD-10).
