# Changelog

All notable changes to this documentation corpus are recorded here. Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/). This project does not ship versioned software releases — "versions" below refer to milestones in the design corpus itself, governed by git history (no document is ever overwritten in place; revisions land as new commits, and superseded content is marked rather than deleted).

## [0.2.0] - 2026-09-27

### Added

- **Experience & Interaction Rulebook** (`01-architecture/09-experience-and-interaction-rulebook.md`) — the corpus's first cross-cutting product rulebook: twelve chapters and roughly forty-five numbered MUST/SHOULD rules covering who we build for and their time budgets, a published friction budget, the four core journeys, surface doctrine across phone/browser/desktop, sharing of connections and events, discovery, the company directory and org trees, and the public/private boundary. It sits in the architecture tier deliberately — the corpus's only declared precedence rule is that an architecture doc outranks a module doc, and a rulebook of binding rules needs that standing. Its own precedence clause is stated in §1.
- **Four ADRs** — 0013 (Event as a first-class primitive), 0014 (Desktop strategy: responsive web, no native shell), 0015 (Web client architecture), 0016 (Public company directory, closed people graph). ADR-0016 is the corpus's first *scoped exception* to another accepted ADR, narrowing ADR-0001's absolute tenant isolation for non-person firmographic data only.
- **Three entities** — `Event` and `EventParticipation` (Contacts & Networking Graph), and `CompanyProfile` (Identity & Card Core), added to the ER overview and the shared-core entity list. `CompanyProfile` is the corpus's only tenant-less entity.
- **Accessibility rules** — WCAG 2.2 Level AA as a stated MUST with checkable specifics (rulebook §3.4), closing the gap `TODO.md` recorded as "asserted as a design tenet throughout but not given its own dedicated treatment anywhere in this corpus."

### Changed

- **Product philosophy §4** gains two design tenets — "Mobile-first, surface-honest" and "Offline-first where the moment demands it." Both were already *cited* by ADR-0009 and ADR-0010, which called mobile-first "a hard, explicit requirement," but neither had ever existed in the tenet list. Those two citations now resolve. Purely additive; no existing tenet was altered.
- **Personas** each gain a time-scarcity profile and a primary surface — the two attributes rulebook §2 and §5 bind feature proposals against.
- **ADR-0009 and ADR-0010** Related lines now point at the real §4 tenets and at rulebook §5.
- **Tech-stack options matrix** gains four rows (event modelling, desktop client, web client, company directory scope), keeping its stated promise to list every alternatives-considered decision in the corpus. The web and desktop rows fill a gap where only "Mobile client" existed.
- **Security, privacy & compliance** §2 classifies `CompanyProfile` as Public; §6 points at rulebook §10 for the user-visible rules its mechanisms must deliver.
- **Two open questions resolved** — the "shared team asset vs. individual's private working notes" tension (rulebook §10.5, splitting a shared `Contact` into a travelling engagement layer and a private layer) and `Connection` visibility symmetry (§10.6). Both were previously flagged unresolved in `TODO.md`, the Contacts & Networking Graph module doc §18, and the condensed Collaboration doc.

### Known Gaps Accepted

- Every module doc's §11 is still titled "Mobile Considerations" now that desktop is a real surface. Rulebook §5.7 defines how to read it; the rename across 16 files is tracked in `TODO.md`.
- The friction budgets in rulebook §3 are chosen design targets, not measurements, and the chapter says so in its opening line.
- Rulebook rules are forward-looking. Existing v0.1 content is not retroactively non-compliant, and the compliance audit is backlogged rather than performed in this pass.

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
