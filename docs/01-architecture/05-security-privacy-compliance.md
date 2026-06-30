# Security, Privacy, and Compliance Framework

> Status: v0.1 · Owner: Security · Last updated: 2026-06-30 · Formalized in [ADR-0001](../adr/0001-multi-tenant-data-isolation.md) and [ADR-0008](../adr/0008-identity-and-auth-strategy.md)
> See also: [`02-modules/security-compliance-center/security-compliance-center.md`](../02-modules/security-compliance-center/security-compliance-center.md) for the user/admin-facing product surface.

## 1. Threat Model Summary

Primary asset at risk: the identity/relationship graph itself — professional contact data, private notes, deal information, and credential/verification records. Primary threat actors: external attackers seeking bulk contact-data exfiltration (high value: sellable, phishing-enabling); malicious or compromised tenant insiders; cross-tenant data leakage from a platform bug (the platform's worst-case failure mode given multi-tenancy); supply-chain risk from third-party AI providers and marketplace extensions.

## 2. Data Classification

| Class | Examples | Handling |
|---|---|---|
| Public | Card fields marked shareable, public portfolio items | No special handling beyond integrity |
| Internal | CRM pipeline data, automation definitions | Tenant-isolated, standard encryption at rest/in transit |
| Sensitive PII | Contact personal details, meeting notes, raw AI prompts containing personal data | Tenant-isolated + redaction-before-third-party-AI-call ([`02-ai-abstraction-layer.md`](02-ai-abstraction-layer.md) §6) + field-level encryption for highest-sensitivity fields |
| Regulated/Credential | Certification/verification records, identity-verification documents | Sensitive PII handling + immutable audit trail + retention policy aligned to credentialing-body requirements |

## 3. Identity & Auth Strategy (ADR-0008)

**Alternatives**: (A) build in-house auth/SSO/SCIM; (B) buy a CIAM platform (Auth0, Clerk, WorkOS); (C) adopt an open-source IdP (Keycloak, Ory) self-hosted or managed.

- *(A) Advantages*: full control, no per-MAU vendor cost at scale. *Disadvantages*: auth is a notoriously easy place to introduce critical vulnerabilities; ongoing compliance certification burden (SOC2 auth controls) falls entirely on the team.
- *(B) Advantages*: fastest to enterprise-ready SSO/SCIM/MFA; vendor carries compliance certification burden; mature attack-surface hardening. *Disadvantages*: per-MAU cost at scale; vendor lock-in risk on a security-critical dependency.
- *(C) Advantages*: avoids per-MAU vendor cost; open-source auditability. *Disadvantages*: self-hosting a security-critical system shifts operational/compliance burden back to the team, similar downside to (A) without full control's upside.

**Recommendation**: **(B)** for v1 — buy a CIAM platform behind an internal `AuthProvider` abstraction (mirroring the AI/embeddings abstraction pattern), so the underlying vendor is swappable without rewriting application auth logic. Revisit build vs. buy once per-MAU vendor cost at scale materially exceeds the cost of an in-house team capable of carrying the compliance burden — a crossover that should be modeled with real usage data, not assumed at design time.

## 4. Authorization Model

Role-Based Access Control (RBAC) as the default, with **resource-scoped policy bindings** for finer-grained enterprise needs: `Role ←N:N→ Permission`, `PolicyBinding(role, scope)` where scope is a tenant, an Organization, or a specific resource (via `EntityRef`, see [`01-data-architecture.md`](01-data-architecture.md) §3). This is deliberately the same shape used by the Security & Compliance Center module's data model — defined once here, referenced there.

Extension point: attribute-based access control (ABAC) policies can layer on top of RBAC for enterprises with complex conditional-access needs, without replacing the RBAC core.

## 5. Audit Logging

Every state-changing action (human or automation- or AI-initiated) emits an `AuditLogEntry{actor, action, subject: EntityRef, timestamp, context}` to the same event bus used for automation triggers (§System Architecture) — audit logging is not a bolted-on interceptor but a first-class consumer of the platform's existing event backbone. Audit logs are immutable (append-only, tamper-evident via hash chaining) and exportable per-tenant for compliance review.

## 6. Privacy by Design

- **Consent**: `ConsentRecord` tracks what a Person has agreed to (data processing, AI usage of their data, marketing) at a granular level, queryable before any AI task or automation acts on their data.
- **Right to erasure**: a `DataSubjectRequest` triggers a fan-out deletion across every module via the event bus, using the same `EntityRef`-addressed mechanism as audit logging and automation — deletion is generic platform infrastructure, not a per-module bespoke script.
- **Data minimization**: AI redaction-before-send (§2 table) and field-level encryption are applied by default to the Sensitive PII class, not opt-in.
- **Data residency**: tenant-level residency constraints flow into both the `RoutingPolicy` (AI calls, [`02-ai-abstraction-layer.md`](02-ai-abstraction-layer.md)) and the database-per-tenant placement decision (§1 of [`01-data-architecture.md`](01-data-architecture.md)) — see [ADR-0012](../adr/0012-multi-region-data-residency.md).

## 7. Compliance Posture Targets

| Standard | Relevance | Posture |
|---|---|---|
| SOC 2 Type II | Enterprise sales blocker without it | Target for first enterprise GA; audit logging (§5) and access control (§4) are foundational controls |
| GDPR | EU individuals/tenants | Consent (§6), erasure (§6), residency (§6) designed in from v1, not retrofitted |
| CCPA/CPRA | US consumers | Subsumed by the GDPR-aligned consent/erasure model with US-specific request-handling SLAs |
| HIPAA | Only if recruiting/healthcare-adjacent tenants handle PHI | Explicitly out of scope for v1; flagged as a future compliance tier requiring its own data-handling review, not assumed covered by the above |

## 8. Extension Points

- New compliance regimes register additional `DataSubjectRequest` types and retention policies without changing the deletion/export mechanism.
- New auth methods (passkeys, future standards) register as new `Account` types without changing the Person/Account model.
- Marketplace/third-party extensions are sandboxed behind the same permission model real modules use — an extension cannot exceed the permissions of the user who installed it.

## 9. Risks

- Multi-tenant RLS policy gaps are the single highest-severity risk class (§1 of [`01-data-architecture.md`](01-data-architecture.md)) — requires isolation-specific test coverage as a release gate, not just functional tests.
- Third-party AI provider data handling is outside direct platform control; mitigated by contractual data-processing agreements and the redaction-before-send default, but not eliminated — disclosed explicitly rather than implied away.
