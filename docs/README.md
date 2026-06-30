# Digital Identity Platform — Documentation Corpus

> Status: v0.1 (initial corpus) · Last updated: 2026-06-30 · See [`CHANGELOG.md`](CHANGELOG.md) for revision history and [`TODO.md`](TODO.md) for the v0.2 backlog.

This is the design documentation for the Digital Identity Platform — positioned as "the operating system for professional identity": a single, AI-native system unifying identity, networking, reputation, portfolio, certifications, documents, meetings, AI assistants, knowledge, CRM, collaboration, and communication, which today live fragmented across a digital-business-card app, a CRM, a knowledge base, a meeting tool, and a handful of point integrations between them. See [`00-vision/00-product-philosophy.md`](00-vision/00-product-philosophy.md) for the full thesis and explicit non-goals (this is not a clone of any single named competitor).

This corpus is pure design documentation — Markdown + Mermaid diagrams, no application code. It is the output of a single architecture/design pass, not a finished product spec; open questions and explicitly deferred decisions are called out throughout rather than papered over.

## How to Read This Corpus

Read in this order if you're new to it:

1. **Vision** (`00-vision/`) — why this platform exists, who it's for, what "done" looks like.
2. **Architecture** (`01-architecture/`) — the master technical decisions every module builds on: service decomposition, data architecture, AI abstraction, automation engine, API gateway strategy, security, scalability, observability, and a consolidated tech-stack matrix.
3. **ADRs** (`adr/`) — the same decisions in formal, scannable Architecture Decision Record format, for when you need the "what we decided and why" without the narrative prose.
4. **Modules** (`02-modules/`) — the ~16 product modules, at two depth tiers (see [`02-modules/README.md`](02-modules/README.md)).
5. **Data Model** (`03-data-model/`) — the consolidated entity-relationship view across every module.

## Directory Map

```
docs/
├── README.md                  ← you are here
├── CHANGELOG.md                Keep-a-Changelog history of this corpus
├── TODO.md                     v0.2 backlog, deferred decisions, rolled-up future-feature proposals
├── 00-vision/                  product philosophy, personas & JTBD
├── 01-architecture/            9 master architecture/decision docs
├── 02-modules/                 6 flagship (full-depth) + 10 condensed module docs
├── 03-data-model/              consolidated cross-module ER overview
└── adr/                        12 Architecture Decision Records + index
```

## Conventions

- **File naming**: `kebab-case.md`. Master-tier docs under `01-architecture/` use numeric prefixes for reading order; module docs do not (they're read independently, not sequentially).
- **ADRs**: lightweight [Nygard style](https://cognitect.com/blog/2011/11/15/documenting-architecture-decisions) (Context / Decision / Alternatives Considered / Consequences / Status) under `adr/NNNN-title.md`, indexed in [`adr/README.md`](adr/README.md). Every ADR cross-links to the architecture doc section that narrates the same decision in full prose — the ADR is the terse reference, the architecture doc is the explanation.
- **Diagrams**: Mermaid fenced code blocks live inline in the doc that explains them, not as separate `.mmd` files — a diagram without the prose next to it loses its meaning.
- **Versioning**: this corpus is never overwritten in place. Revisions land as new commits and a new `CHANGELOG.md` entry; git history is the authoritative version record, not parallel `v1/`, `v2/` directories.
- **Cross-linking over restating**: module docs link to the relevant `01-architecture/` doc for shared concerns (data model, AI abstraction, security model) instead of re-explaining them. If a module doc and an architecture doc ever disagree, the architecture doc wins — module docs apply the platform's shared patterns, they don't redefine them.
- **API/DB sections are design-level**: endpoint lists, request/response shape sketches, and ER diagrams — not complete OpenAPI specs or DDL. Generating those is implementation work that follows from this design, not part of it.
- **"Recommended Future Feature" entries**: every module doc proactively proposes 2-3 enhancements beyond what's described in its core sections, each with a stated business-value/complexity/dependency rationale. The strongest of these are rolled up in [`TODO.md`](TODO.md) so they don't get lost inside individual module docs.

## Scoping Decision (v0.1)

The full brief implies full 18-section-depth documentation (Business Goal → Open Questions) across roughly sixteen modules, plus a full master-architecture tier and a complete ADR log — a multi-week effort at production-documentation quality. This v0.1 pass scopes to:

- **Full depth** (all 18 sections) for the 6 modules judged highest in architectural novelty and cross-module fan-in: Identity & Card Core, Contacts & Networking Graph, AI Assistant Layer, CRM & Relationship Pipeline, Automation & Workflow Engine, Security & Compliance Center.
- **Condensed depth** (6-section brief) for the remaining 10 modules: Reputation, Portfolio, Certifications, Documents, Meetings, Knowledge, Collaboration, Communication, Analytics & Insights, Marketplace & Extensions.
- **Full depth, no compromise**, for the master architecture tier and ADR log — these carry the corpus's real technical substance (multi-tenancy, AI routing, automation engine internals, security model) and every module, flagship or condensed, depends on them being complete and correct.

This trade-off is stated here deliberately rather than left implicit. The condensed-to-flagship promotion path is tracked in [`TODO.md`](TODO.md).

## Key Cross-Cutting Concepts

A handful of patterns recur across nearly every doc in this corpus. Understanding these five up front makes everything else faster to read:

| Concept | Defined in | Used by |
|---|---|---|
| `EntityRef{module, entityType, entityId}` polymorphic reference | [`01-architecture/01-data-architecture.md`](01-architecture/01-data-architecture.md) §3 | Automation (`ActionNode` targets), Security (`AuditLogEntry` subjects), AI (`KnowledgeContextRef`), every module's cross-references |
| `ModelProvider` / `ModelRouter` AI abstraction | [`01-architecture/02-ai-abstraction-layer.md`](01-architecture/02-ai-abstraction-layer.md) | AI Assistant Layer module, every module's "AI Opportunities" section |
| Trigger→Condition→Action workflow DAG | [`01-architecture/03-automation-workflow-engine.md`](01-architecture/03-automation-workflow-engine.md) | Automation & Workflow Engine module, referenced by Communication, Collaboration, Knowledge |
| Modular monolith + event-bus contract | [`01-architecture/00-system-architecture.md`](01-architecture/00-system-architecture.md) | Every module's Backend Architecture section |
| "Defer the expensive decision, keep the seam real" | Recurring pattern across ADR-0002 (vector DB), ADR-0006 (automation engine), ADR-0012 (multi-region) | Anywhere a v1 choice is paired with an explicit, numeric migration trigger |

## Status Legend

| Marker | Meaning |
|---|---|
| Accepted (ADR) | Decision is the documented default; build against it. |
| Proposed (ADR) | Direction is documented but not yet committed to; see the ADR's Status section for what would trigger acceptance. |
| Flagship (module) | Full 18-section depth. |
| Condensed (module) | 6-section brief; v0.2 promotion candidate. |
