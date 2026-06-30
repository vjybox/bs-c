# ADR-0006: Automation Engine — Build vs. Adopt

**Status**: Accepted · **Date**: 2026-06-30 · **Full reasoning**: [`01-architecture/03-automation-workflow-engine.md`](../01-architecture/03-automation-workflow-engine.md)

## Context

Every repetitive task across the platform (enrichment, follow-up reminders, pipeline assignment) needs to be automatable via a generic trigger→condition→action model, usable by users, the system, and AI agents alike — without each module building bespoke automation logic.

## Decision

Build a **custom DAG executor** on the platform's existing event bus and job queue, scoped for v1 to short/medium-duration workflows (seconds to a few days). Workflow definitions are first-class, queryable, permissioned platform entities. A documented extension point allows swapping the execution backend to a durable-execution engine (e.g., Temporal) if workflow durability needs exceed what the custom executor can responsibly handle, without changing the workflow definition format.

## Alternatives Considered

- **Adopt Temporal (or equivalent durable execution engine)**: battle-tested durability/retry/versioning semantics, but real operational weight and likely overkill for the majority short/medium-duration use case in this product.
- **Adopt an Inngest/n8n-style event-driven function engine**: lighter weight, but weaker durable-execution guarantees for long-running/human-in-the-loop workflows, and (for n8n specifically) closer to an external visual-automation tool than a first-class platform primitive with deep tenancy/permission integration.

## Consequences

- Positive: workflow data lives in the platform's own audit/permission/event infrastructure, with no second source of truth; reuses infrastructure already required by the modular-monolith architecture.
- Negative: durable-execution semantics (retries, effectively-once delivery, long waits) must be built and hardened in-house — the single largest build-vs-buy risk in this corpus; explicitly flagged for re-evaluation against real usage data, with a named migration trigger (sustained need for >7-day durable waits or saga/compensation logic).
