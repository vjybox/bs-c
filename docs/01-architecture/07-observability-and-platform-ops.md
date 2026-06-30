# Observability & Platform Operations

> Status: v0.1 · Owner: Architecture/Platform · Last updated: 2026-06-30
> Note: not explicitly requested by the original brief's section list, but added because "enterprise-ready" and the explicit SLA/scale requirements throughout this corpus are not credible without an observability stance — flagged here as a deliberate scope addition, not silent scope creep.

## 1. Pillars

- **Logging**: structured, tenant-scoped, correlated by a request/trace ID that propagates through the event bus (so an AI invocation triggered by an automation triggered by a webhook is traceable end-to-end).
- **Metrics**: per-module RED metrics (rate, errors, duration) plus business metrics (cards shared, contacts enriched, AI invocations by capability tier, automation runs) — the latter feeding both internal product analytics and tenant-facing analytics (see each module's Analytics section).
- **Tracing**: distributed tracing across the gateway → module → event bus → AI/automation worker path, essential once any module is extracted per [`00-system-architecture.md`](00-system-architecture.md) §3.

## 2. SLOs and Alerting

Each module defines its own SLOs (see module docs' Non-functional Requirements sections); platform-wide SLOs (API availability, p99 latency bands per [`06-scalability-strategy.md`](06-scalability-strategy.md) §5) are tracked centrally and feed the enterprise tenant-facing status page.

## 3. Multi-Region Failover Stance

v1: single-region with documented disaster-recovery (backup + restore RPO/RTO targets); multi-region active topology is deferred until [ADR-0012](../adr/0012-multi-region-data-residency.md)'s trigger (enterprise contractual residency requirement) fires, consistent with the corpus's "defer the expensive decision, keep the seam real" pattern.

## 4. Extension Points

- Observability backend (logging/metrics/tracing vendor) sits behind standard open instrumentation (e.g., OpenTelemetry-shaped conventions) so the vendor is swappable, mirroring the abstraction pattern used for auth, AI providers, and datastores elsewhere in this corpus.

## 5. Risks

- Under-investing in tracing before the first module extraction (AI/automation, already split out in v1) makes that split's operational debugging materially harder — this is called out as a day-one requirement, not a "later" item, precisely because that extraction happens immediately.
