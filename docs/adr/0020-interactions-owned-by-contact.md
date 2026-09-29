# ADR-0020: Interactions Belong to the Author's Contact, Not the Shared Connection

**Status**: Accepted · **Date**: 2026-09-29 · **Amends**: [`contacts-networking-graph.md`](../02-modules/contacts-networking-graph/contacts-networking-graph.md) §7, [`er-overview.md`](../03-data-model/er-overview.md) · **Applies**: [rulebook](../01-architecture/09-experience-and-interaction-rulebook.md) §10.5 · **Scoped exception to**: [ADR-0001](0001-multi-tenant-data-isolation.md) (for `connection`)

## Context

The Contacts module doc (§7) modelled `Interaction.connectionId` — an interaction hung off `Connection`, the symmetric edge shared by both people. `strength` and `lastInteractionAt` also lived on `Connection`. The code followed that model, and the result was a privacy failure: **each person read the other's private notes about them**, and one person's note-taking reordered the other's contact list and reconnection suggestions. It was found in a review, verified in code, and fixed in migration `0002`.

The design corpus contradicted itself here. Rulebook §10.5 — which outranks module docs — already said personal notes are private to their author. The module doc and ER diagram were wrong, and the code implemented the wrong one.

## Decision

1. `Interaction` belongs to exactly one `Contact` — the author's own relationship record — via `interaction.contact_id`. Reads are always by contact and never through a connection. `interaction.connection_id` survives as nullable provenance only.
2. `strength` and `lastInteractionAt` are **per contact**, recomputed from that contact's own interactions. Recency is the latest `occurredAt`, not the time of writing, so a back-dated or replayed offline capture does not look fresh.
3. `interaction.visibility` is `private` today. `organization` is reserved for rulebook §10.5's shared engagement layer: interactions logged in a Workspace's context, visible to that Workspace.
4. `Connection` remains a graph edge — "these two people are connected", for mutual-connection discovery. It carries **no private data** and is therefore **tenant-less**: its two endpoints may sit in different tenants. This is the second scoped exception to ADR-0001, after ADR-0016.
5. Client-generated UUIDs are the idempotency key for contacts and interactions. A replayed offline write creates exactly one row.

## Alternatives Considered

| Option | Advantages | Disadvantages |
|---|---|---|
| **Keep interactions on Connection; filter by `loggedBy`** | Smallest code change | Privacy by a WHERE clause that every future query must remember; shared strength still leaks ordering; non-users have no connection at all |
| **Two connection rows per pair (directional)** | Private per direction | Duplicates the graph edge; mutual-connection queries double in cost; still no home for non-users |
| **Interaction on Contact** (chosen) | Private by construction; works for non-users (no connection needed); fits the §10.5 layer model | Mutual strength ("how well do we know each other") must be derived from both contacts if ever wanted; migration had to move data |

## Consequences

- Positive: the leak cannot recur through a missed filter, because no read path goes through the shared edge. Manual capture of non-users (Phase 1 Slice 3) needs no connection.
- Negative: `connection.strength` and `connection.last_interaction_at` are dead columns, kept so migration 0002 destroyed nothing (tech-debt TD-07). Notes whose author held no contact for the other person had no owner-side home and were deleted by 0002. There were no real users at the time.
- **Privacy:** a regression test (`interactions.test.ts`, "private notes stay with their author") asserts both directions. The outbox carries no note text ([ADR-0007](0007-event-backbone-choice.md) amendment).
- **Scalability:** `idx_interaction_contact (contact_id, occurred_at desc)` and `idx_contact_owner_recency` serve the two hot reads. Both are partition-friendly by `tenant_id`.

## Extension points

- `visibility` for Workspace sharing.
- `interaction.connection_id` for graph analytics across both sides, which must be aggregate-only and never content.
- `sourceRef` (module doc §7) for interactions originating in Meetings or Communication.
