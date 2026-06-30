# ADR-0010: Offline-First Sync Protocol

**Status**: Accepted · **Date**: 2026-06-30 · **Related**: Product Philosophy's "offline-first where possible" tenet ([`00-vision/00-product-philosophy.md`](../00-vision/00-product-philosophy.md))

## Context

Mobile card-sharing and contact-capture flows must work without connectivity (events, venues with poor signal) and sync cleanly when connectivity returns. Most platform data (a captured contact, a meeting note) has a clear single-owner-at-a-time write pattern; a smaller set (shared Knowledge docs, Collaboration module content) has genuine concurrent-edit needs.

## Decision

Use **last-write-wins with explicit versioning** (a monotonic version/timestamp per record, conflicts surfaced to the user rather than silently dropped) as the default offline-sync strategy for single-owner data. Apply **CRDTs** specifically to genuinely collaborative, concurrently-edited content (e.g., shared Knowledge/Collaboration documents) where last-write-wins would silently lose work.

## Alternatives Considered

- **CRDTs everywhere**: strongest conflict-resolution guarantees, but materially higher implementation complexity applied uniformly to data (most contact/CRM records) that is rarely if ever concurrently edited offline — disproportionate cost for the common case.
- **Operational Transform**: well-suited to real-time collaborative text editing specifically, but a narrower fit than CRDTs for the platform's broader mixed data shapes (structured records, not just text), and historically harder to implement correctly outside a small set of mature OT libraries.

## Consequences

- Positive: simple, predictable conflict behavior for the common case (single-owner records); the more complex CRDT investment is scoped only to where it earns its cost.
- Negative: last-write-wins can still surface a conflict the user must resolve manually for the rare genuine concurrent-edit case on single-owner data; trigger for expanding CRDT usage is observed user-reported data loss/conflict friction in a specific module, not a default applied everywhere upfront.
