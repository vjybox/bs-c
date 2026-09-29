# ADR-0021: Schema Migrations — Forward-Only SQL with a Small Runner

**Status**: Accepted · **Date**: 2026-09-29 · **Related**: [ADR-0012](0012-multi-region-data-residency.md) (restore), [`../04-implementation/tech-debt.md`](../04-implementation/tech-debt.md)

## Context

The schema was one `schema.sql`, applied by Postgres's `docker-entrypoint-initdb.d` only when a volume was first created. Every schema change was documented as `docker compose down -v`, which deletes all data. That was tolerable for demo data and unacceptable once anyone real captures a contact.

## Decision

Numbered, forward-only SQL files in `apps/api/migrations/`, applied by `apps/api/src/migrate.ts` (about 100 lines) at API boot, by the seed, and by the test runner:

- A ledger `schema_migrations(version, checksum, applied_at)`, with each migration in its own transaction.
- A `pg_advisory_lock` so two API replicas, or the API and the seed, never migrate concurrently.
- An applied file whose checksum changed stops the boot. History is changed by adding a migration, never by editing one.
- A database created before migrations existed (tables present, no ledger) has `0001_baseline` recorded as applied rather than re-run.
- **No down migrations.** Rollback is restore-from-backup (nightly `pg_dump`, verified by a real restore) or a new forward migration.

## Alternatives Considered

| Option | Advantages | Disadvantages |
|---|---|---|
| **node-pg-migrate / Knex / Drizzle Kit** | Mature; down migrations; CLI | A dependency and a DSL for a tiny schema; the ORM options pull in a query layer we do not use |
| **Flyway / Liquibase / Sqitch** | Industry standard; enterprise familiarity; strong ordering and verification | Java or Perl runtime in the image, or a separate container; heavier than the problem |
| **Hand-rolled runner** (chosen) | Plain SQL; no dependency; about 100 lines, fully tested (idempotence, baseline detection, checksum refusal, rollback on failure) | We own it; no down migrations; no dry-run or diff tooling |

## Consequences

- Positive: upgrades are `docker compose up --build`, with no data loss. Five tests on throwaway databases cover the runner's guarantees.
- Negative: large-table migrations need care, because each runs in one transaction and can lock. There is no online-migration tooling.
- **Scalability:** at the database-per-tenant tier (ADR-0001), the same runner runs per database. Its advisory lock is per database, so a fleet migration is a loop, not a new mechanism.

## Revisit when

Any of these, whichever is first:

- The first migration that needs online or batched execution (a backfill over a large table).
- More than about 50 migrations.
- A database-per-tenant fleet.

Adopt Flyway or Sqitch then. The ledger's shape maps directly onto theirs.
