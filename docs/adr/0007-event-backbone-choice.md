# ADR-0007: Event Backbone Choice

**Status**: Accepted · **Date**: 2026-06-30 · **Related**: [`01-architecture/00-system-architecture.md`](../01-architecture/00-system-architecture.md), [`01-architecture/03-automation-workflow-engine.md`](../01-architecture/03-automation-workflow-engine.md)

## Context

The modular-monolith-with-event-bus architecture (ADR-0004) and the automation engine (ADR-0006) both depend on a reliable event backbone for cross-module communication, automation triggers, audit logging, and webhook delivery.

## Decision

Use the **transactional outbox pattern over Postgres** (writes commit an event row in the same transaction as the state change; a relay process publishes via `LISTEN/NOTIFY` or polling) as the v1 event backbone, rather than introducing a separate message-broker dependency. Migrate to a dedicated broker (Kafka, managed pub/sub, or NATS) when sustained event throughput approaches the comfortable ceiling of a single well-tuned Postgres instance.

## Alternatives Considered

- **Kafka**: industry-standard durability and throughput at scale, but a meaningful operational dependency (cluster management, consumer-group tuning) to take on before there is throughput to justify it.
- **Managed pub/sub (SNS/SQS, Cloud Pub/Sub)**: low operational overhead, but a cloud-vendor coupling introduced earlier than necessary, and weaker transactional-outbox guarantees with the primary datastore.
- **NATS**: lightweight and fast, but a separate infrastructure component with a smaller operational ecosystem than the alternatives, for marginal benefit at v1 scale.

## Consequences

- Positive: no new infrastructure dependency for v1; outbox pattern guarantees event emission is transactionally consistent with the state change that caused it.
- Negative: throughput ceiling is lower than a dedicated broker; the migration is operationally real (new infra to run) when the trigger fires, even though the event *contract* (topics, payload shapes) does not need to change.
