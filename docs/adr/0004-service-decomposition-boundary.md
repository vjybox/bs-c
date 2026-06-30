# ADR-0004: Service Decomposition Boundary

**Status**: Accepted · **Date**: 2026-06-30 · **Full reasoning**: [`01-architecture/00-system-architecture.md`](../01-architecture/00-system-architecture.md)

## Context

The platform must scale from a single user to 100M users without a major architectural rewrite, while staying operationally simple enough to ship a v1 quickly.

## Decision

Build a **modular monolith with an event-bus contract**: modules communicate only through a small internal-API surface (synchronous reads) or an event bus with the transactional outbox pattern (everything else). The contract between modules is microservice-shaped from day one; the deployment stays monolith-shaped until a specific module's load profile (first candidate: AI inference) justifies extraction.

## Alternatives Considered

- **Pure modular monolith** (single DB, internal calls only): simplest operationally, but scales as a whole and creates a real rewrite risk once any one module's load diverges sharply.
- **Microservices per module from day one**: independent scaling and fault isolation, but distributed-transaction/saga complexity and operational overhead (service mesh, per-service observability) are premature at low user counts and the dominant source of early-stage platform pain in practice.

## Consequences

- Positive: extraction of any module later is a deployment change, not a contract rewrite; avoids paying microservices' operational tax before data justifies it.
- Negative: requires sustained module-boundary discipline; a cross-schema shortcut join under deadline pressure is the realistic failure mode, mitigated by DB-user-level permission enforcement per module schema (not just code review).
