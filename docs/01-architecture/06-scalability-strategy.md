# Scalability Strategy: 1 User → 100M Users

> Status: v0.1 · Owner: Architecture · Last updated: 2026-06-30

## 1. Principle

Each tier below is reached by *adding* infrastructure behind existing abstractions (datastore repository, cache interface, queue interface, `AuthProvider`, `ModelRouter`), not by rewriting application logic. This is the payoff of the abstraction-heavy design choices made throughout [`01-architecture/`](.).

## 2. Tiers

| Tier | Users | What changes | What does not change |
|---|---|---|---|
| T0 — Single user | 1 – 100 | Single small instance, single DB, no caching tier needed | Full data model, full module set already present (no "lite mode") |
| T1 — Early product | 100 – 50K | Horizontal app-instance scaling behind a load balancer; AI/automation already on separate worker pools (§System Architecture) | Schema, API contracts, tenancy model |
| T2 — Growth | 50K – 5M | Read replicas for hot read paths; cache tier (Redis) in front of identity/card lookups; autoscaling workers tied to queue depth; CDN for public card/portfolio pages | Module boundaries, RLS-based default tenancy |
| T3 — Scale | 5M – 50M | Sharding by `tenant_id` once the documented write-throughput trigger fires ([`01-data-architecture.md`](01-data-architecture.md) §4); selective module extraction (AI already extracted; Communication/notification fan-out likely next) | `EntityRef` contract, event-bus semantics |
| T4 — Hyperscale / Enterprise multi-region | 50M – 100M+ | Multi-region active-active or regional-pod deployment for residency and latency ([ADR-0012](../adr/0012-multi-region-data-residency.md)); dedicated vector DB migration if triggered ([`01-data-architecture.md`](01-data-architecture.md) §5); per-enterprise database-per-tenant placement (§1 of the same doc) | Core data model and module contracts remain stable across all tiers |

## 3. What Forces a Tier Transition

Every transition above is gated by a named, measurable trigger (not a calendar date or a guess) — consistent with the corpus-wide pattern of stating migration triggers explicitly: write-throughput percentage (sharding), replica lag tolerance (read/write split), p99 latency SLO breaches (vector DB, search engine), and per-tenant contractual requirements (database-per-tenant, multi-region). This list is intentionally the same set of triggers referenced throughout `01-architecture/`, collected here for fast scanning.

## 4. Cost Curve Shape

Cost per active user should be roughly flat-to-declining through T1–T3 (shared infrastructure, RLS-tenancy economics) with a deliberate step-up only at T4 for tenants that contractually require dedicated isolation/residency — and that step-up is paid for by those tenants' enterprise contracts, not amortized across the individual-user base. This is the economic argument for the tiered multi-tenancy decision in [`01-data-architecture.md`](01-data-architecture.md) §1.

## 5. Non-Functional Targets (Illustrative, to Be Replaced by Measured SLOs)

- Card render / identity lookup: p99 < 200ms at T2+.
- AI task completion (non-streaming): p99 < 5s for standard capability tier; streaming tasks begin emitting within 1s.
- Automation action execution latency: best-effort, not real-time-guaranteed (workflows are not in the request/response critical path).

## 6. Risks

- Sharding is the single highest-complexity transition in this table; the explicit trigger condition exists specifically to prevent premature sharding, which is a more common and more damaging mistake at this stage than under-provisioning.
- Multi-region (T4) introduces data-consistency trade-offs (see [ADR-0012](../adr/0012-multi-region-data-residency.md)) that must be resolved per-module, since not every module has the same consistency requirements (e.g., audit logs tolerate different consistency trade-offs than real-time CRM pipeline state).
