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
| [0013](0013-event-as-first-class-primitive.md) | Event as a first-class primitive | Accepted | 2026-09-27 |
| [0014](0014-desktop-strategy-responsive-web.md) | Desktop strategy: responsive web, no native shell | Accepted | 2026-09-27 |
| [0015](0015-web-client-architecture.md) | Web client architecture | Accepted | 2026-09-27 |
| [0016](0016-public-company-directory-closed-people-graph.md) | Public company directory, closed people graph | Accepted | 2026-09-27 |
| [0017](0017-interim-authentication-magic-link.md) | Interim authentication: magic link and session cookie | Accepted (implementation pending) | 2026-09-29 |
| [0018](0018-wedge-first-sequencing.md) | Wedge-first sequencing | Accepted | 2026-09-29 |
| [0019](0019-installable-web-app-before-native.md) | Installable web app before native apps | Accepted | 2026-09-29 |
| [0020](0020-interactions-owned-by-contact.md) | Interactions belong to the author's contact | Accepted | 2026-09-29 |
| [0021](0021-schema-migrations.md) | Schema migrations: forward-only SQL with a small runner | Accepted | 2026-09-29 |
| [0022](0022-architecture-fitness-tests.md) | Architecture fitness tests enforce accepted ADRs | Accepted | 2026-09-29 |
| [0023](0023-ui-message-catalogue.md) | UI text lives in a message catalogue | Accepted | 2026-09-29 |

ADR-0012 is marked **Proposed** rather than **Accepted**: it depends on real enterprise contractual demand that does not yet exist, so it documents the planned approach without committing infrastructure spend ahead of need.

ADR-0013 through ADR-0016 were added in corpus v0.2 and are narrated in [`01-architecture/09-experience-and-interaction-rulebook.md`](../01-architecture/09-experience-and-interaction-rulebook.md) rather than in an earlier architecture doc. ADR-0016 was the corpus's first **scoped exception** to another accepted ADR — it narrows ADR-0001's absolute tenant isolation for non-person firmographic data, and states that boundary explicitly rather than leaving it implied. ADR-0020 adds the second, for the `connection` edge, which holds no private data.

ADR-0017 through ADR-0023 were added in corpus v0.3, after a drift review found the implementation had diverged from several accepted ADRs without any record. Four existing ADRs are **amended or deferred** rather than rewritten — 0008 by 0017, 0009 by 0019, and 0007 (payload rule) and 0015 by notes in place — and 0001, 0003, 0004, 0005, 0010 and 0012 carry dated **implementation-status notes** under their status line. Superseded text is kept, per the corpus convention. Checkable ADRs are enforced by the fitness tests in ADR-0022.
