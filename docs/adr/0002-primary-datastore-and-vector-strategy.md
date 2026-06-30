# ADR-0002: Primary Datastore and Vector Strategy

**Status**: Accepted · **Date**: 2026-06-30 · **Full reasoning**: [`01-architecture/01-data-architecture.md`](../01-architecture/01-data-architecture.md) §5

## Context

The platform needs both relational storage (identity, CRM, automation state) and vector storage (embeddings for AI semantic search, recommendation, dedup), with a path that doesn't lock in today's vector-database technology.

## Decision

Use Postgres with the pgvector extension as the single engine for v1, accessed exclusively through an `EmbeddingStore` repository abstraction. Migrate to a dedicated vector database when an explicit trigger fires: a tenant-shard's embedding corpus exceeds ~50M vectors, or measured p99 semantic-search latency breaches its SLO.

## Alternatives Considered

- **Postgres + dedicated vector DB (Pinecone/Weaviate/Qdrant/Milvus) from day one**: best ANN performance at scale, but introduces a second source of truth and eventual-consistency complexity before there is any scale pressure to justify it.
- **Multi-model platform** (separate wide-column/analytics stores too): right tool per workload, but operationally premature and requires a dedicated data-platform function the team does not yet have.

## Consequences

- Positive: one engine to operate at launch; transactional consistency between a record and its embedding; the migration path is a config/adapter change behind the existing abstraction, not a rewrite.
- Negative: pgvector's ANN recall/performance will trail purpose-built vector databases at very large scale — accepted deliberately, with the trigger condition as the explicit reconsideration point.
- Follow-up: every stored embedding must record its source model ID and dimensionality so future re-embedding migrations are tracked operations, not silent drift.
