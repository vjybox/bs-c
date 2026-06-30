# Knowledge (Condensed Brief)

> Depth tier: condensed (v0.2 candidate for full 18-section treatment) · Status: v0.1 · Last updated: 2026-06-30

## Business Goal

Give individuals and teams a durable notes/wiki layer tied to people, deals, and projects — the platform's long-term memory, and the primary RAG source for the AI Assistant Layer.

## Key Functional Requirements

- `KnowledgeArticle`s organized into `KnowledgeSpace`s (personal, team, org-wide), with `ArticleRevision` history.
- Bidirectional linking between articles and any platform entity via `EntityRef` (an article about "Acme Corp strategy" links to the Acme `Organization`, relevant `Deal`s, and `Contact`s).
- Full-text + semantic search across a user's accessible Knowledge content (built on the platform search strategy — see [ADR-0011](../../adr/0011-search-and-relevance-architecture.md)).

## Data Sketch

`KnowledgeSpace {owner: PersonRef|OrganizationRef, visibility}`, `KnowledgeArticle {spaceId, title, currentRevision, linkedEntities: EntityRef[]}`, `ArticleRevision {articleId, content, author, createdAt}`.

## API Surface Summary

`POST /knowledge/articles`, `GET /knowledge/search?q=...`, `POST /knowledge/articles/{id}/revisions`.

## AI Opportunities

This module is the single largest RAG context source for the AI Assistant Layer (`KnowledgeContextRef` — see [`02-ai-abstraction-layer.md`](../../01-architecture/02-ai-abstraction-layer.md) §4); AI-suggested article links to relevant entities as content is written; AI-generated article drafts from meeting notes/email threads.

## Recommended Future Enhancements

- Knowledge-graph visualization (surface the EntityRef link structure visually, not just as inline links) — moderate complexity, high value for the enterprise admin/analyst use case, depends on a graph-rendering frontend investment shared with the Networking Graph module's relationship visualization.
- Collaborative real-time editing using CRDTs (this module is the primary candidate named in [ADR-0010](../../adr/0010-offline-first-sync-protocol.md) for CRDT investment, since concurrent editing is a genuine, common use case here unlike most single-owner records).
