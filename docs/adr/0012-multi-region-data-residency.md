# ADR-0012: Multi-Region Data Residency

**Status**: Proposed · **Date**: 2026-06-30 · **Full reasoning**: [`01-architecture/06-scalability-strategy.md`](../01-architecture/06-scalability-strategy.md), [`01-architecture/05-security-privacy-compliance.md`](../01-architecture/05-security-privacy-compliance.md) §6

> **Implementation status (2026-09-29).** Single region. Disaster recovery today: a `backup` service writes `pg_dump` custom-format dumps daily (hourly around an event) with 14-day retention; a restore was verified on a seeded database. **RPO = the backup interval (24 h default, 1 h during an event); RTO = a manual restore, minutes at current size.** Backups sit on the same host unless the operator copies them off ([TD-14](../04-implementation/tech-debt.md)).

## Context

Enterprise tenants in regulated industries or specific jurisdictions (EU, etc.) may require contractual data-residency guarantees. This decision is marked **Proposed** rather than **Accepted** because no real enterprise contractual demand exists yet to validate the approach against — committing infrastructure spend ahead of need would contradict the corpus's own "defer the expensive decision, keep the seam real" pattern.

## Decision (Proposed)

Default to **single-region deployment with documented disaster recovery** (backup/restore RPO/RTO targets) for v1. When an enterprise contract requires data residency, place that tenant's data in a **regional data pod** — a per-region deployment of the same modular-monolith stack, selected via the same tenant-routing layer already responsible for database-per-tenant placement ([ADR-0001](0001-multi-tenant-data-isolation.md)) — rather than building full active-active multi-region replication.

## Alternatives Considered

- **Active-active multi-region from day one**: best latency and failover characteristics globally, but very high complexity (cross-region consistency trade-offs per module) for a need that does not yet exist.
- **Single-region + DR only, no residency option ever**: simplest, but forecloses enterprise deals with hard residency requirements — a real revenue risk given the enterprise-readiness goal.

## Consequences

- Positive: zero added complexity until a real enterprise deal requires it; the regional-pod approach reuses the tenant-routing mechanism already built for database-per-tenant placement rather than inventing new infrastructure.
- Negative: regional pods are not the same as true active-active multi-region — cross-region features (e.g., a global search across an enterprise's regionally-split data) would need explicit design work if ever required; deliberately left unresolved here pending real demand.
- Follow-up: revisit and re-status this ADR (Proposed → Accepted, with a chosen concrete implementation) the first time a sales-qualified enterprise opportunity makes residency a contractual requirement.
