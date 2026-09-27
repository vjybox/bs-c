# ADR-0013: Event as a First-Class Primitive

**Status**: Accepted · **Date**: 2026-09-27 · **Full reasoning**: [`01-architecture/09-experience-and-interaction-rulebook.md`](../01-architecture/09-experience-and-interaction-rulebook.md) §7

## Context

Conferences and meetups drive the platform's core capture flow — the persona narratives in [`identity-card-core.md`](../02-modules/identity-card-core/identity-card-core.md) §2, [`contacts-networking-graph.md`](../02-modules/contacts-networking-graph/contacts-networking-graph.md) §2/§5 and [`ai-assistant-layer.md`](../02-modules/ai-assistant-layer/ai-assistant-layer.md) §5 all open at one. Yet the corpus has no Event entity. The only trace is an undefined "recent-event suggestion" in the contact-capture prompt. Capture context is therefore unstructured, and "who did I meet at the Q3 conference" is not an answerable query.

## Decision

Introduce **`Event`** and **`EventParticipation`** as first-class entities owned by Contacts & Networking Graph. `Event` is deliberately minimal — a bounded, named occasion that contextualizes captures — not a social object with its own feed, attendee directory, or graph.

## Alternatives Considered

- **Free-text tag on `Contact`**: zero schema cost, but no dedup and no shared identity across two people who met at the same conference — "where did I meet them" stays a string match.
- **An attribute on `Interaction`**: closer, but an Event outlives any single interaction and must be referenceable by many captures from many people.
- **Extend the Meetings module**: Meetings models scheduled 1:1s against a calendar contract; a conference is not a meeting, and forcing it in distorts both models.

## Consequences

- Positive: recall queries become first-class; the AI layer gains a real grouping key for batch follow-ups; event check-in becomes a definable offline flow.
- Negative: events must be deduplicated across attendees (two users independently creating "KubeCon 2026") — the dedup strategy is an open question this ADR does not solve. Events now has an entity and binding rules but no module doc; promotion is tracked in [`TODO.md`](../TODO.md).
