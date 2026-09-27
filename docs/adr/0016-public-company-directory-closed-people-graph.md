# ADR-0016: Public Company Directory, Closed People Graph

**Status**: Accepted · **Date**: 2026-09-27 · **Full reasoning**: [`01-architecture/09-experience-and-interaction-rulebook.md`](../01-architecture/09-experience-and-interaction-rulebook.md) §8–§9 · **Scoped exception to**: [ADR-0001](0001-multi-tenant-data-isolation.md)

## Context

The product needs a public directory of companies — enriched by AI or entered manually — with a user's captured contacts auto-arranged into an org tree beneath each company. Two existing commitments constrain how: [ADR-0001](0001-multi-tenant-data-isolation.md) makes tenant isolation absolute, and [`05-security-privacy-compliance.md`](../01-architecture/05-security-privacy-compliance.md) §1 calls cross-tenant leakage "the platform's worst-case failure mode"; separately, [`00-vision/00-product-philosophy.md`](../00-vision/00-product-philosophy.md) §2 rules out building "another LinkedIn," whose noted boundary is a massive public *people* graph owned by the platform. The existing `Organization` entity cannot serve the purpose: it is tenant-scoped and models a paying customer, not a company one merely has contacts at.

## Decision

Split the boundary **by data kind**. Introduce **`CompanyProfile`** — a global, tenant-less record carrying firmographic data only (`name`, `domain`, `industry`, `sizeBand`, `logoRef`, `enrichmentSource`, `verificationStatus`). People discovery and org-tree placement stay inside the owner's own graph: a tree is composed solely of the owner's own `Contact` rows, via `Contact.companyProfileId` and a private `Contact.reportsToContactId` edge. This is a named exception to ADR-0001, scoped strictly to non-person data.

`enrichmentSource` is one of `derived` (deterministic extraction, e.g. a company inferred from an email domain), `ai` (model-backed, reserved and not yet implemented), `claimed`, or `manual`. The shipped implementation produces only `derived` and `manual`; nothing is labelled `ai` until real model enrichment exists.

## Alternatives Considered

- **Widen `Organization` to be global**: conflates customer-tenant with directory-company and drags `tenantId`/`brandConfig` into a public record.
- **Per-tenant company records**: preserves isolation absolutely, but every tenant re-enriches the same companies and no shared skeleton ever forms.
- **Crowdsourced public org chart**: richest data and a genuine growth loop, but publishes who works where — the public people graph the philosophy doc rules out.

## Consequences

- Positive: "a viewer sees only their own contacts" holds **by construction** — no cross-tenant read path for person data exists to be misconfigured. Firmographic enrichment happens once platform-wide instead of per tenant.
- Negative: ADR-0001 is no longer absolute, and every future reviewer must know the exception's exact boundary. A global write path needs abuse and dedup controls — two tenants editing the same `CompanyProfile` — that this ADR does not design.
