# Architecture Decision Records

Lightweight Nygard-style ADRs (Context / Decision / Alternatives Considered / Consequences / Status). Each ADR formalizes a decision already narrated in prose in [`01-architecture/`](../01-architecture/) — the ADR is the terse, durable record; the architecture doc is the full reasoning.

| # | Title | Status | Date |
|---|---|---|---|
| [0001](0001-multi-tenant-data-isolation.md) | Multi-tenant data isolation | Accepted | 2026-06-30 |
| [0002](0002-primary-datastore-and-vector-strategy.md) | Primary datastore and vector strategy | Accepted | 2026-06-30 |
| [0003](0003-api-paradigm.md) | API paradigm | Accepted | 2026-06-30 |
| [0004](0004-service-decomposition-boundary.md) | Service decomposition boundary | Accepted | 2026-06-30 |
| [0005](0005-ai-model-abstraction-strategy.md) | AI model abstraction strategy | Accepted | 2026-06-30 |
| [0006](0006-automation-engine-build-vs-adopt.md) | Automation engine: build vs. adopt | Accepted | 2026-06-30 |
| [0007](0007-event-backbone-choice.md) | Event backbone choice | Accepted | 2026-06-30 |
| [0008](0008-identity-and-auth-strategy.md) | Identity and auth strategy | Accepted | 2026-06-30 |
| [0009](0009-mobile-client-architecture.md) | Mobile client architecture | Accepted | 2026-06-30 |
| [0010](0010-offline-first-sync-protocol.md) | Offline-first sync protocol | Accepted | 2026-06-30 |
| [0011](0011-search-and-relevance-architecture.md) | Search and relevance architecture | Accepted | 2026-06-30 |
| [0012](0012-multi-region-data-residency.md) | Multi-region data residency | Proposed | 2026-06-30 |

ADR-0012 is marked **Proposed** rather than **Accepted**: it depends on real enterprise contractual demand that does not yet exist, so it documents the planned approach without committing infrastructure spend ahead of need.
