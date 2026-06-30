# Personas & Jobs-to-Be-Done

> Status: v0.1 · Owner: Product · Last updated: 2026-06-30

These five personas drive prioritization across all modules. Every module doc's "Business Goal" and "User Story" sections should trace back to at least one JTBD listed here.

## 1. The Independent Professional ("Mara")

Freelance consultant / founder / creator. No org, no IT department, pays out of pocket.

- **JTBD**: "When I meet someone worth remembering, I want to capture and act on that relationship without manual data entry, so that I build a durable network instead of a pile of business cards I'll never look at again."
- Cares most about: frictionless card sharing, AI-drafted follow-ups, a network that compounds in value over time.
- Price sensitivity: high. Must get value free or near-free before paying for AI/automation depth.

## 2. The Quota-Carrying Seller ("Devon")

Account executive / SDR at a mid-market company. Lives in a CRM, hates double-entry.

- **JTBD**: "When I'm at an event or call, I want every new contact to flow straight into my pipeline with context, so that I spend my time selling, not logging activity."
- Cares most about: CRM module fidelity, integration with existing CRM (not replacing it on day one — see Open Questions in CRM module doc), automation for follow-up cadence.
- Price sensitivity: low if it demonstrably saves pipeline time; procurement usually org-paid.

## 3. The Enterprise Admin ("Priya")

IT/security lead provisioning the platform for a 2,000-person org.

- **JTBD**: "When I roll this out company-wide, I want centralized identity, role-based access, audit trails, and compliance guarantees, so that I'm not creating a shadow-IT or data-leak liability."
- Cares most about: SSO/SCIM, the Security & Compliance Center module, data residency, exportability, admin analytics.
- Price sensitivity: low; evaluates on risk and TCO, not sticker price.

## 4. The Recruiter / Talent Partner ("Yusuf")

Sources and tracks candidates as relationships, not just CRM "deals."

- **JTBD**: "When I source a candidate, I want to track their certifications, portfolio, and our relationship history over multiple roles and years, so that I can re-engage them intelligently instead of cold-restarting every search."
- Cares most about: Certifications + Portfolio + Reputation modules, long-horizon relationship/Knowledge tracking, AI-assisted re-engagement detection.

## 5. The Agency / Team Lead ("Lena")

Runs a small team (5-20 people) sharing client relationships and a brand identity.

- **JTBD**: "When my team meets people on behalf of the agency, I want shared visibility into the relationship graph and a consistent brand card, so that the agency's network is an asset of the business, not of individual employees."
- Cares most about: Collaboration module, org-level card branding, shared CRM pipeline, leaving-employee data continuity (a relationship doesn't vanish when an employee does).

## Cross-Persona Tension to Design For

Mara's data is hers alone; Lena's and Priya's orgs need shared, governed, sometimes employee-departure-resilient data. The platform must support both **personal-tenant** and **org-tenant** ownership models on the same schema (see [`01-architecture/01-data-architecture.md`](../01-architecture/01-data-architecture.md) §Multi-Tenancy) and a clean **personal → org upgrade path** (Mara joins a company and brings her network; the org can optionally claim shared ownership of relationships formed on its behalf, governed by policy, never silently).
