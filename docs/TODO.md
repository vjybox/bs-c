# TODO / Roadmap

This is the living backlog for the Digital Identity Platform design corpus: what's deliberately deferred from v0.1, what would need to happen for it to land, and the best of the "Recommended Future Feature" proposals scattered across individual module docs, rolled up here so they stay visible instead of getting buried.

## v0.2: Condensed → Flagship Promotion

Ten modules currently have condensed (6-section) docs instead of full 18-section depth. None of them are lower-priority forever — they were simply not in the highest-architectural-novelty / highest-cross-module-fan-in set chosen for v0.1's flagship tier (see `docs/README.md` § Scoping Decision). Suggested promotion order, by estimated product/business value and dependency readiness:

1. **Documents** — high business value (e-signature/closing-deals adjacency to CRM), and its condensed doc already surfaces a real open design question (read-receipt privacy vs. `ConsentRecord`) that full depth would resolve properly.
2. **Meetings** — natural AI-Assistant-Layer consumer (live transcription, talking-point suggestions); promoting this clarifies the `CapabilitySet` streaming requirements referenced in `02-ai-abstraction-layer.md`.
3. **Communication** — explicitly named as the module every AI-drafted output and automation action depends on to reach a human; the trust-tier model proposed in its condensed doc deserves full UX-flow treatment.
4. **Reputation** — cross-tenant attestation portability (its top proposed feature) has real architectural weight (signing, verification chains) that a condensed doc can't responsibly spec.
5. **Knowledge** — the platform's primary RAG source; full depth should formalize the `KnowledgeContextRef` ingestion/indexing pipeline referenced but not detailed in `02-ai-abstraction-layer.md` §4.
6. Remaining six (Portfolio, Certifications, Collaboration, Analytics & Insights, Marketplace & Extensions) — promote opportunistically, no strict ordering dependency among them.

## Deferred / Proposed Architecture Decisions

- **ADR-0012 (Multi-Region Data Residency)** is the only ADR with Status: Proposed rather than Accepted. Per its own text, it should be revisited "when a sales-qualified enterprise opportunity makes residency contractual" — not on a calendar trigger. Until then, the regional-data-pods direction is documented but not committed to.
- **Vector datastore migration (ADR-0002)** — Postgres+pgvector is accepted for v1 with an explicit numeric trigger (>50M embeddings per tenant-shard, or p99 vector-query latency SLO breach) for migrating to a dedicated vector database. No action needed until that trigger fires; tracked here so it isn't forgotten as a "someday" item with no defined someday.
- **Automation engine durable-execution escape hatch (ADR-0006)** — the custom DAG executor is accepted for v1; migrating execution semantics to a Temporal-style durable workflow engine is pre-approved in direction but gated on a concrete trigger (>7-day durable waits or saga/compensation complexity exceeding the custom executor's model). Not started.

## Rolled-Up Recommended Future Features

The strongest proposals from each module doc's own Future Enhancements section, gathered here for cross-module visibility. Full detail (technical design sketch, dependencies) lives in the source doc — this is an index, not a duplicate.

### Identity & Trust
- **Offline-signed share payloads** (Identity & Card Core) — fully offline NFC/QR handshake using short-lived per-card signing keys, removing the platform's last connectivity dependency in its signature interaction.
- **Cross-organization verified-badge federation** (Identity & Card Core) — a `VerifyingAuthority` registry enabling portable, signed verification claims checkable across tenants without re-verification. Blocked primarily on a legal/trust-framework policy owner, not engineering.
- **Cross-tenant reputation portability with cryptographic attestation** (Reputation, condensed) — depends on the above maturing first.

### Networking & Relationships
- **Second-degree (multi-hop) network exploration** (Contacts & Networking Graph) — bounded 2-hop traversal via cached adjacency lists, with relational self-joins as the documented fallback before a dedicated graph engine.
- **Relationship-decay-aware automated nudges** (Contacts & Networking Graph) — publishes a new event-bus topic consumed by user-configured Automation Engine workflows; pure integration work, no new execution infrastructure.
- **Org-wide relationship heat map / account coverage** (Contacts & Networking Graph) — exposed as a CRM-facing read API rather than owning its own UI surface.

### AI
- **Multi-agent orchestration** (AI Assistant Layer) — parent/child `AITaskInvocation` fan-out with recursion-depth and cost-ceiling limits; ship behind a feature flag to internal dogfooding first.
- **User-reviewable agent memory** (AI Assistant Layer) — explicit-only memory before any inferred-memory detection, to avoid a "creepy" surfacing experience.
- **Per-agent cost budgets with org chargeback** (AI Assistant Layer) — extends `RoutingPolicy`; instrument usage analytics before exposing limits.

### CRM & Pipeline
- **Configurable stage-entry/exit validation gates** (CRM & Relationship Pipeline) — open question on whether to reuse the Automation Engine's `ConditionNode` model instead of a purpose-built rule format; worth resolving before building.
- **AI-assisted pipeline/stage configuration for new pipelines** (CRM & Relationship Pipeline) — template-matching against a curated archetype library before attempting free-form generative stage design.

### Automation
- **Workflow simulation against historical data ("backtest")** (Automation & Workflow Engine) — batch job against retained event-bus history, dry-run reuse, no live execution path. High value for Priya's org-wide-automation approval workflow.
- **Fan-in / shared-node support** (Automation & Workflow Engine) — gated on real usage-data demand per the module's own stated trigger condition.

### Security & Compliance
- **ABAC policy layer on top of RBAC** (Security & Compliance Center) — start with a small fixed attribute set (time-of-day, IP range, device-trust signal) rather than a general policy language.
- **Real-time SIEM streaming integration** (Security & Compliance Center) — reuses existing webhook delivery infrastructure; removes a recurring enterprise-sales objection.
- **Automated DSR reconciliation auditor** (Security & Compliance Center) — converts an informally-described mitigation into a verifiable, auditable control; start with deletion requests only.

### Cross-Module / Platform
- **Revenue-sharing model for paid third-party extensions** (Marketplace & Extensions) — high ecosystem value, explicitly blocked on billing infrastructure not scoped anywhere in this v0.1 corpus. Flagged as a dependency gap, not just a feature.
- **Extension capability versioning/compatibility checks** (Marketplace & Extensions) — extends the API versioning policy in `04-integration-api-gateway.md` §5 to third-party code.
- **Benchmarking against anonymized cross-tenant norms** (Analytics & Insights) — requires aggregate-only, non-tenant-identifiable design reviewed against the Security & Compliance Center's data-classification policy before building.
- **Granular per-field visibility within a shared Workspace Contact** (Collaboration) — **resolved in v0.2.** [`01-architecture/09-experience-and-interaction-rulebook.md`](01-architecture/09-experience-and-interaction-rulebook.md) §10.5 settles it once for both modules: a shared `Contact` splits into a travelling *engagement layer* (subject reference, company, org-scoped tags and interactions) and a *private layer* (`captureContext`, personal notes and tags, segment membership, reporting edges) that stays private by default and is shared only per-field, never retroactively. Remaining work is implementing the split, not deciding it.

## Other Known Gaps

- No module doc in this corpus has been validated against a real OpenAPI/GraphQL schema generation pass — API Design sections are design-level sketches, consistent with the corpus convention stated in `docs/README.md`, but turning them into implementable contracts is unstarted work.
- No load-testing or capacity-planning numbers back the scalability tier triggers in `01-architecture/06-scalability-strategy.md` — they are designed thresholds, not measured ones, until the platform has real traffic.
- Accessibility — **resolved in v0.2.** WCAG 2.2 Level AA is now a binding MUST with checkable component-level specifics (contrast ratios, target sizes, colour-independence, screen-reader and keyboard completability, reduced motion) in [`01-architecture/09-experience-and-interaction-rulebook.md`](01-architecture/09-experience-and-interaction-rulebook.md) §3.4. What remains is a per-component implementation guide, not the conformance decision.

## Created by v0.2 (Experience & Interaction Rulebook)

Adding a binding cross-cutting rulebook settled several open questions and created these:

- **Rename §11 "Mobile Considerations" → "Surface Considerations"** across all 16 module docs. Desktop is now a real surface ([ADR-0014](adr/0014-desktop-strategy-responsive-web.md)), which makes the existing section title wrong everywhere. Rulebook §5.7 defines how to read it in the meantime; the rename itself is mechanical but touches 16 files and was deliberately kept out of the v0.2 pass.
- **Audit existing module docs against the rulebook.** Its rules are forward-looking by declaration (§1), so no v0.1 content is retroactively non-compliant — but the gap is real and unmeasured. Most likely failures: workflows with no declared surface class, and capture flows that have never been checked against the §3 friction budgets.
- **Promote Events and the Company Directory to module docs.** Both have entities ([ADR-0013](adr/0013-event-as-first-class-primitive.md), [ADR-0016](adr/0016-public-company-directory-closed-people-graph.md)) and binding rules, but no module doc of their own. **The Company Directory is now built** — `CompanyProfile`, domain-derived enrichment, and owner-private org trees ship in `apps/`, with rulebook 9.1–9.6 covered by tests in `apps/api/src/routes/companies.test.ts` — which makes a proper module doc more overdue, not less. Events remains unbuilt and is the stronger doc candidate of the two: it still has an unresolved dedup question and a deliberately-omitted organizer role.
- **Build Events.** ADR-0013 designed `Event`/`EventParticipation` and rulebook §7 constrains them, but nothing is implemented. Until it is, "where and when did I meet them" (rulebook 8.3) is unanswerable, and the seed's `captureContext` strings ("SaaStr Annual 2026") stay unstructured text.
- **No AI enrichment exists.** Rulebook 9.5 allows `enrichmentSource = ai`; the shipped code only produces `derived` (email-domain extraction) and `manual`. Real model-backed enrichment of company fields is unstarted, and both the rulebook and ADR-0016 now say so explicitly rather than implying otherwise.
- **Design the `CompanyProfile` global write path.** A tenant-less, user-writable record needs moderation, abuse controls, and conflict resolution between two tenants editing the same row. ADR-0016 names this as undesigned and it blocks any real directory rollout. Until it exists, `PATCH /api/companies/:id` returns 403: the endpoint as first built let any signed-in person rename a company for every tenant.
- **Instrument the friction budgets.** Rulebook §3's figures are chosen, not observed. The first instrumentation pass should be treated as evidence to revise them rather than as a score against them.
