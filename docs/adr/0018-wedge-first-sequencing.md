# ADR-0018: Wedge-First Sequencing

**Status**: Accepted · **Date**: 2026-09-29 · **Scope**: sequencing of the whole corpus; changes no architectural decision · **Related**: [`../04-implementation/phases.md`](../04-implementation/phases.md)

## Context

The product brief describes an "operating system for professional identity" spanning identity, networking, reputation, portfolio, certifications, documents, meetings, AI assistants, knowledge, CRM, collaboration and communication — AI-first and enterprise-ready. The corpus designs all of it (six flagship and ten condensed modules, sixteen ADRs).

By September 2026 the design corpus was roughly 55,000 words and the code roughly 6,700 lines, with **zero users**. A three-reviewer panel (product, engineering, skeptic) and a competitive scan found the following:

- The core loop — capture a person, keep private notes, get nudged to reconnect — had never been exercised by a real user.
- You could not even capture someone who was not already on the platform, which at a conference is nearly everyone.
- Competitors already sell cards for $0.50–$4 a month, so breadth alone is not a moat.

The decision to narrow was taken in a review and recorded only in a private plan file. A later drift review flagged that as a hidden limitation. This ADR records it.

## Decision

**Build one wedge, test it with real people, and let the result decide the next module.**

- **Wedge persona:** the independent professional (Mara, in [`../00-vision/01-personas-and-jtbd.md`](../00-vision/01-personas-and-jtbd.md)). This persona has no CRM to compete with and feels the lost-contact problem most.
- **Wedge journey:** create a card before an event → share by QR, including with no signal → capture the people you meet, most of whom are not users → come back within fourteen days to follow up.
- **Gate:** a conference test with about fifteen participants and pass bars fixed *before* the event (see [`phases.md`](../04-implementation/phases.md) §3).
- **Deferred, not dropped:** AI assistance, CRM pipeline, teams/Workspaces, SSO, native apps, Events as a primitive, marketplace, and the ten condensed modules. Each has a named resumption trigger in `phases.md`.

**Architecture is not narrowed.** Every accepted ADR still describes the target. What changes is the order, and the rule that every deferral leaves its extension point in the code now. Examples:

- `tenant_id` on every row
- an outbox event on every write
- a versioned, OpenAPI-described REST surface
- `interaction.visibility`
- a message catalogue

Architecture fitness tests (`apps/api/src/architecture.test.ts`) keep those hooks from eroding while the modules they serve are unbuilt.

## Alternatives Considered

| Option | Advantages | Disadvantages |
|---|---|---|
| **Build breadth to the brief** | Matches the vision document; impressive demo | Months before learning whether anyone wants the core; highest chance of building the wrong product well |
| **Pivot the brief to "digital business card"** | Honest about today's scope | Throws away the platform thesis before it is tested; a crowded commodity market |
| **Wedge-first with hooks** (chosen) | Learns in weeks; keeps the long-term architecture reachable without rewrites | Delays enterprise and AI revenue; the hooks cost a little effort before they pay off |

## Consequences

- Positive: an answer in weeks rather than quarters. Decisions about the next module are made on evidence.
- Negative: the product visibly under-delivers against the brief until the gate passes. Enterprise prospects cannot be served in Phase 1.
- **Kill criteria** (set now, so they cannot be rationalised later):
  - If fewer than three testers log a second interaction on any contact by day 21, the relationship layer is not a habit.
  - If the share-back rate is near zero, the capture positioning fails.
  - If a $5/month pre-order page converts under 1% of about 300 targeted visitors, stop treating this as a business and fall back to a self-hosted open-source framing.

## Revisit when

After the conference test, whatever its result. `phases.md` §4 lists which deferred item each outcome unlocks.
