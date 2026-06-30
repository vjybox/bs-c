# ADR-0005: AI Model Abstraction Strategy

**Status**: Accepted · **Date**: 2026-06-30 · **Full reasoning**: [`01-architecture/02-ai-abstraction-layer.md`](../01-architecture/02-ai-abstraction-layer.md)

## Context

The platform must support OpenAI, Anthropic, Google, Meta, local/self-hosted, enterprise-private, and future-unknown models, with per-tenant policy control (compliance allow-lists, data residency) and the ability to swap providers without rewriting feature code.

## Decision

Introduce a `ModelRouter` abstraction: a `ModelProvider` interface (capabilities, complete/embed/healthCheck) that any provider — commercial API, local model, or future-unknown — implements; a router that matches per-task `CapabilitySet` requirements against registered providers and tenant `RoutingPolicy`, with an explicit fallback chain. A separate, independently versioned `EmbeddingProvider` abstraction handles embeddings.

## Alternatives Considered

- **Direct per-provider SDK calls in feature code**: fastest to a first integration, but makes every future requirement (new provider, per-tenant policy, fallback, audit) an expensive retrofit touching every call site.
- **Adopt a third-party orchestration framework wholesale**: faster initial integration breadth, but couples the platform's core AI contract to an external project's release cadence and abstractions, working against "never lock into today's technology."

## Consequences

- Positive: new providers register without router changes; new task types declare a capability requirement without provider changes; per-tenant compliance policy (model allow-lists, residency) is enforced from one code path.
- Negative: real upfront engineering investment in router/policy/fallback logic, amortized across every AI feature in every module rather than paid once per module.
