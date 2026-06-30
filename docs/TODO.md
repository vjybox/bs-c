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
- **Granular per-field visibility within a shared Workspace Contact** (Collaboration) — a real, currently-unresolved tension between "shared team asset" and "individual's private working notes," also flagged as an Open Question in the Contacts & Networking Graph flagship doc. Worth resolving once, not independently in both modules.

## Other Known Gaps

- No module doc in this corpus has been validated against a real OpenAPI/GraphQL schema generation pass — API Design sections are design-level sketches, consistent with the corpus convention stated in `docs/README.md`, but turning them into implementable contracts is unstarted work.
- No load-testing or capacity-planning numbers back the scalability tier triggers in `01-architecture/06-scalability-strategy.md` — they are designed thresholds, not measured ones, until the platform has real traffic.
- Accessibility (WCAG conformance level, specific component-level guidance) is asserted as a design tenet throughout but not given its own dedicated treatment anywhere in this corpus — a candidate for either a new `01-architecture/` doc or a section added to an existing one in v0.2.
