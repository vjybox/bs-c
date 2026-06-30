# ADR-0008: Identity and Auth Strategy

**Status**: Accepted · **Date**: 2026-06-30 · **Full reasoning**: [`01-architecture/05-security-privacy-compliance.md`](../01-architecture/05-security-privacy-compliance.md) §3

## Context

The platform needs enterprise-ready authentication (SSO, SCIM provisioning, MFA) and individual-user authentication on the same `Account` model, with auth being one of the highest-severity places to introduce a security vulnerability.

## Decision

Buy a CIAM (customer identity and access management) platform (e.g., Auth0, Clerk, or WorkOS — evaluated at implementation time, not pinned here) for v1, integrated behind an internal `AuthProvider` abstraction so the vendor is swappable without rewriting application auth logic.

## Alternatives Considered

- **Build in-house**: full control and no per-MAU vendor cost at scale, but the ongoing compliance-certification burden (SOC2 auth controls) and vulnerability surface fall entirely on the team — high risk for a security-critical system at an early stage.
- **Self-hosted open-source IdP (Keycloak, Ory)**: avoids per-MAU cost, but shifts operational and compliance burden back to the team similarly to building in-house, without the upside of full customization being a near-term priority.

## Consequences

- Positive: fastest path to enterprise-ready SSO/SCIM/MFA; vendor carries security-certification burden during the highest-risk early period.
- Negative: per-MAU cost at scale; a security-critical dependency on a vendor, mitigated (not eliminated) by the `AuthProvider` abstraction.
- Follow-up: revisit build vs. buy once per-MAU vendor cost at scale materially exceeds the cost of an in-house team capable of carrying the compliance burden, modeled against real usage data.
