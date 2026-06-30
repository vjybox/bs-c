# ADR-0001: Multi-Tenant Data Isolation

**Status**: Accepted · **Date**: 2026-06-30 · **Full reasoning**: [`01-architecture/01-data-architecture.md`](../01-architecture/01-data-architecture.md) §1

## Context

The platform must serve individual professionals (millions of tiny tenants) and enterprises (a small number of large, compliance-sensitive tenants) on one data model, scaling toward 100M users without a tenancy-model rewrite.

## Decision

Adopt a **tiered hybrid**: Row-Level Security (RLS) on a shared schema as the default tenancy tier for individuals and small teams; database-per-tenant as an opt-in, contractually-gated tier for enterprises with hard isolation or residency requirements. The logical data model is identical across tiers; only physical placement differs, enforced by a tenant-routing layer application code cannot bypass.

## Alternatives Considered

- **RLS, shared schema (only)**: cheapest, scales to many small tenants, but cannot offer the strong isolation/residency guarantees some enterprise deals require.
- **Schema-per-tenant**: stronger isolation than RLS without the cost of separate databases, but migrations must run per-schema and the model is awkward for millions of individual-user tenants — dominated by the hybrid below.
- **Database-per-tenant (only)**: strongest isolation, but operationally and economically unworkable as the default for the majority individual-user case.

## Consequences

- Positive: cheap default path for the dominant tenant population; a credible enterprise isolation story without forcing its cost onto every user.
- Negative: two tenancy code paths to test and operate; RLS policy coverage becomes a release-gating concern (a missing policy is a tenant-isolation breach).
- Follow-up: isolation-specific automated test coverage must be added as a standing release gate, not a one-time check.
