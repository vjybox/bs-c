# ADR-0003: API Paradigm

**Status**: Accepted · **Date**: 2026-06-30 · **Full reasoning**: [`01-architecture/04-integration-api-gateway.md`](../01-architecture/04-integration-api-gateway.md)

## Context

The product brief requires every module to expose REST, GraphQL, Webhooks, SDK, and CLI. Read literally as five independently authored surfaces per module, this multiplies engineering cost without proportional value.

## Decision

REST is the canonical, system-of-record API for every module (serves SDK, CLI, webhooks, and partner integrations). GraphQL is a federation/aggregation layer used by first-party web/mobile clients for composed, cross-module views. Both are generated from the same underlying module service layer / OpenAPI schema rather than hand-maintained independently.

## Alternatives Considered

- **REST + BFF per client only**: simplest and most cacheable, but leaves cross-module composed views (e.g., a Contact detail screen needing four modules' data) prone to over-fetching/N+1 patterns.
- **GraphQL Federation only**: best composed-query ergonomics for first-party clients, but a poor default for integrators, CLI users, and webhook consumers who expect REST/JSON.

## Consequences

- Positive: resolves the brief's apparent "build five surfaces" requirement into one coherent architecture; integrators get a simple, cacheable, universal surface; first-party clients get composition where it pays off.
- Negative: two paradigms still need to be operated, mitigated (not eliminated) by code generation off one source of truth.
