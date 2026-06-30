# Tech Stack Options Matrix (Decision Roll-Up)

> Status: v0.1 · Owner: Architecture · Last updated: 2026-06-30
> Purpose: one scannable table of every alternatives-considered decision in this corpus, so "never lock into today's technology" is auditable at a glance rather than buried across nine documents.

| Decision | Options Considered | Recommendation | Migration Trigger | Detail |
|---|---|---|---|---|
| Service decomposition | Modular monolith / Microservices / Modular monolith + event bus | Modular monolith + event bus | Per-module load-profile divergence (AI already extracted day one) | [`00-system-architecture.md`](00-system-architecture.md), [ADR-0004](../adr/0004-service-decomposition-boundary.md) |
| Multi-tenancy isolation | RLS shared schema / Schema-per-tenant / DB-per-tenant | Tiered hybrid: RLS default, DB-per-tenant for enterprise opt-in | Contractual enterprise residency/isolation requirement | [`01-data-architecture.md`](01-data-architecture.md), [ADR-0001](../adr/0001-multi-tenant-data-isolation.md) |
| Primary datastore + vectors | Postgres+pgvector / Postgres+dedicated vector DB / Multi-model | Postgres+pgvector behind repository abstraction | >50M embeddings/shard or p99 semantic-search SLO breach | [`01-data-architecture.md`](01-data-architecture.md), [ADR-0002](../adr/0002-primary-datastore-and-vector-strategy.md) |
| API paradigm | REST+BFF / GraphQL federation / Hybrid | REST canonical + GraphQL aggregation layer | N/A (steady-state hybrid by design) | [`04-integration-api-gateway.md`](04-integration-api-gateway.md), [ADR-0003](../adr/0003-api-paradigm.md) |
| AI model integration | Direct per-provider SDK calls / Framework dependency (e.g. LangChain-style) / ModelRouter abstraction | ModelRouter abstraction | N/A (foundational from v1) | [`02-ai-abstraction-layer.md`](02-ai-abstraction-layer.md), [ADR-0005](../adr/0005-ai-model-abstraction-strategy.md) |
| Automation engine | Temporal-style durable execution / Inngest/n8n-style / Custom DAG executor | Custom DAG executor, v1-scoped | Durable waits >7 days or saga/compensation complexity | [`03-automation-workflow-engine.md`](03-automation-workflow-engine.md), [ADR-0006](../adr/0006-automation-engine-build-vs-adopt.md) |
| Event backbone | Kafka / Postgres outbox+LISTEN/NOTIFY / Managed pub/sub / NATS | Postgres outbox+LISTEN/NOTIFY for v1 | Sustained event throughput exceeds single-Postgres-instance comfortable ceiling | [ADR-0007](../adr/0007-event-backbone-choice.md) |
| Identity & auth | Build in-house / Buy CIAM platform / Self-hosted OSS IdP | Buy CIAM platform behind `AuthProvider` abstraction | Per-MAU vendor cost exceeds in-house team cost at scale | [`05-security-privacy-compliance.md`](05-security-privacy-compliance.md), [ADR-0008](../adr/0008-identity-and-auth-strategy.md) |
| Mobile client | Native (Swift/Kotlin) / React Native / Flutter / PWA-first | React Native (shared logic, near-native UX, fastest cross-platform velocity) | Platform-specific feature ceiling reached (e.g. deep NFC/wallet integration) requiring native modules | [ADR-0009](../adr/0009-mobile-client-architecture.md) |
| Offline sync | CRDT / Operational Transform / Last-write-wins+versioning | Last-write-wins+versioning for v1; CRDT for collaborative fields | Genuine concurrent-edit collaboration needs (e.g. shared Knowledge docs) outgrow LWW | [ADR-0010](../adr/0010-offline-first-sync-protocol.md) |
| Search & relevance | Postgres FTS / OpenSearch / Vector-only semantic | Postgres FTS for v1, hybrid with embeddings for semantic ranking | Query latency/relevance SLO breach at scale | [ADR-0011](../adr/0011-search-and-relevance-architecture.md) |
| Multi-region/residency | Single-region+DR / Active-active multi-region / Regional data pods | Single-region+DR for v1; regional pods for enterprise residency tenants | Enterprise contractual data-residency requirement | [ADR-0012](../adr/0012-multi-region-data-residency.md) |

## How to Read This Table

Every row follows the same shape deliberately: **what was considered**, **what we picked and why** (detailed in the linked doc/ADR), and **the specific, measurable condition that would make us revisit it**. A decision without a migration trigger is either genuinely foundational (API paradigm, AI abstraction — these are interface shapes, not infrastructure choices, so there's no "outgrow" condition) or under-specified and should be flagged for follow-up.
