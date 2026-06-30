# ADR-0011: Search and Relevance Architecture

**Status**: Accepted · **Date**: 2026-06-30 · **Related**: [`01-architecture/01-data-architecture.md`](../01-architecture/01-data-architecture.md) §6

## Context

Users need to search across contacts, CRM records, documents, and knowledge content, with relevance that ideally blends keyword and semantic matching, without committing to a dedicated search infrastructure before scale justifies it.

## Decision

Use **Postgres full-text search** as the default v1 search backend, blended with the existing embeddings layer ([`01-architecture/02-ai-abstraction-layer.md`](../01-architecture/02-ai-abstraction-layer.md) §5) for semantic relevance ranking on top of keyword matches. Migrate to a dedicated search engine (e.g., OpenSearch) when query latency or relevance-quality SLOs are breached at scale.

## Alternatives Considered

- **Dedicated search engine (OpenSearch/Elasticsearch) from day one**: best relevance tuning and faceting capability, but a meaningful operational dependency and a second index to keep in sync, premature before search volume/complexity justifies it.
- **Vector-only semantic search**: good for "find similar" use cases, but a poor default for precise keyword/field-filtered lookups (e.g., "contacts named Smith at Acme") that most search interactions actually are.

## Consequences

- Positive: no new infrastructure for v1; reuses the embeddings investment already made for AI features rather than building a parallel relevance system.
- Negative: Postgres FTS relevance tuning and faceted search are less sophisticated than a dedicated engine; accepted until the documented SLO-breach trigger fires.
