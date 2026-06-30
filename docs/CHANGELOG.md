# Changelog

All notable changes to this documentation corpus are recorded here. Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/). This project does not ship versioned software releases — "versions" below refer to milestones in the design corpus itself, governed by git history (no document is ever overwritten in place; revisions land as new commits, and superseded content is marked rather than deleted).

## [0.1.0] - 2026-06-30

### Added — Initial corpus established

The first complete pass of the Digital Identity Platform design corpus, scoped deliberately to a two-tier depth model (see `TODO.md` for the v0.2 promotion backlog).

**Vision (`00-vision/`)**
- Product philosophy: "the operating system for professional identity" thesis, anti-clone differentiation analysis against 11 named adjacent products, the Twelve Pillars, design tenets.
- Five personas with jobs-to-be-done: independent professional, quota-carrying seller, enterprise admin, recruiter/talent partner, agency/team lead.

**Architecture (`01-architecture/`)** — 9 docs covering system decomposition, data architecture & multi-tenancy, the AI abstraction layer (`ModelProvider`/`ModelRouter`), the automation/workflow engine, the integration & API gateway strategy, security/privacy/compliance, the scalability strategy (1 → 100M users), observability & platform ops, and a consolidated tech-stack options matrix.

**Architecture Decision Records (`adr/`)** — 12 ADRs in lightweight Nygard format, covering multi-tenant isolation, datastore & vector strategy, API paradigm, service decomposition, AI model abstraction, automation engine build-vs-adopt, event backbone, identity & auth, mobile client architecture, offline-first sync, search & relevance, and multi-region data residency.

**Modules (`02-modules/`)**
- Six flagship modules at full 18-section depth: Identity & Card Core, Contacts & Networking Graph, AI Assistant Layer, CRM & Relationship Pipeline, Automation & Workflow Engine, Security & Compliance Center.
- Ten condensed modules: Reputation, Portfolio, Certifications, Documents, Meetings, Knowledge, Collaboration, Communication, Analytics & Insights, Marketplace & Extensions.

**Data Model (`03-data-model/`)**
- Consolidated cross-module ER overview, entity-ownership map, and the `EntityRef{module, entityType, entityId}` polymorphic-reference pattern used platform-wide.

### Scoping Decisions
- Full 18-section depth was applied to 6 flagship modules; the remaining 10 modules received a condensed template (business goal, key functional requirements, data sketch, API summary, AI opportunities, future enhancements). This trade-off is documented in `README.md` and tracked as a v0.2 backlog item in `TODO.md` rather than left implicit.
- Two modules — Analytics & Insights and Marketplace & Extensions — were added beyond the brief's original twelve pillars because other modules' documentation implied their existence (every module needed an analytics consumer and an extensibility story). Both are flagged inline in their own docs.
