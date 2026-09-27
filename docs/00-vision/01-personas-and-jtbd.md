# Personas & Jobs-to-Be-Done

> Status: v0.2 · Owner: Product · Last updated: 2026-09-27

These five personas drive prioritization across all modules. Every module doc's "Business Goal" and "User Story" sections should trace back to at least one JTBD listed here.

Each persona also carries a **time-scarcity profile** and a **primary surface**. These are not colour — they are the two attributes that [`01-architecture/09-experience-and-interaction-rulebook.md`](../01-architecture/09-experience-and-interaction-rulebook.md) §2 and §5 bind feature proposals against. A design that ignores a persona's time budget or ships their core action on the wrong surface fails review regardless of how well it serves the JTBD.

## 1. The Independent Professional ("Mara")

Freelance consultant / founder / creator. No org, no IT department, pays out of pocket.

- **JTBD**: "When I meet someone worth remembering, I want to capture and act on that relationship without manual data entry, so that I build a durable network instead of a pile of business cards I'll never look at again."
- Cares most about: frictionless card sharing, AI-drafted follow-ups, a network that compounds in value over time.
- Price sensitivity: high. Must get value free or near-free before paying for AI/automation depth.
- **Time scarcity**: extreme and unforgiving — she is her own operations department, so any task over a minute competes directly with billable work. She abandons setup flows rather than returning to finish them.
- **Primary surface**: phone. She meets people out in the world; her desk hours are client work, not tool maintenance.

## 2. The Quota-Carrying Seller ("Devon")

Account executive / SDR at a mid-market company. Lives in a CRM, hates double-entry.

- **JTBD**: "When I'm at an event or call, I want every new contact to flow straight into my pipeline with context, so that I spend my time selling, not logging activity."
- Cares most about: CRM module fidelity, integration with existing CRM (not replacing it on day one — see Open Questions in CRM module doc), automation for follow-up cadence.
- Price sensitivity: low if it demonstrably saves pipeline time; procurement usually org-paid.
- **Time scarcity**: high but org-sanctioned — he will tolerate onboarding his employer paid for, but not repeated per-contact data entry, which is precisely the tax he already resents in his CRM.
- **Primary surface**: genuinely both — phone at events and between calls, desktop for pipeline review.

## 3. The Enterprise Admin ("Priya")

IT/security lead provisioning the platform for a 2,000-person org.

- **JTBD**: "When I roll this out company-wide, I want centralized identity, role-based access, audit trails, and compliance guarantees, so that I'm not creating a shadow-IT or data-leak liability."
- Cares most about: SSO/SCIM, the Security & Compliance Center module, data residency, exportability, admin analytics.
- Price sensitivity: low; evaluates on risk and TCO, not sticker price.
- **Time scarcity**: low per task, high in aggregate — she will spend an afternoon on a rollout configuration, but she administers thousands of users, so anything whose cost scales per-user is unaffordable.
- **Primary surface**: desktop. Admin consoles, audit review, and policy configuration are at-desk work and should not pretend otherwise.

## 4. The Recruiter / Talent Partner ("Yusuf")

Sources and tracks candidates as relationships, not just CRM "deals."

- **JTBD**: "When I source a candidate, I want to track their certifications, portfolio, and our relationship history over multiple roles and years, so that I can re-engage them intelligently instead of cold-restarting every search."
- Cares most about: Certifications + Portfolio + Reputation modules, long-horizon relationship/Knowledge tracking, AI-assisted re-engagement detection.
- **Time scarcity**: bursty — deep sourcing sessions punctuated by fast capture at events and on calls. Tolerates depth when he has chosen to go deep; intolerant of friction when he has not.
- **Primary surface**: both — phone for capture, desktop for long-horizon research and re-engagement review.

## 5. The Agency / Team Lead ("Lena")

Runs a small team (5-20 people) sharing client relationships and a brand identity.

- **JTBD**: "When my team meets people on behalf of the agency, I want shared visibility into the relationship graph and a consistent brand card, so that the agency's network is an asset of the business, not of individual employees."
- Cares most about: Collaboration module, org-level card branding, shared CRM pipeline, leaving-employee data continuity (a relationship doesn't vanish when an employee does).
- **Time scarcity**: high and fragmented — she is client-facing *and* managing a team, so her tool time exists only in the gaps between other obligations.
- **Primary surface**: phone for her own networking, desktop for the shared-team view and brand configuration.

## Cross-Persona Tension to Design For

Mara's data is hers alone; Lena's and Priya's orgs need shared, governed, sometimes employee-departure-resilient data. The platform must support both **personal-tenant** and **org-tenant** ownership models on the same schema (see [`01-architecture/01-data-architecture.md`](../01-architecture/01-data-architecture.md) §Multi-Tenancy) and a clean **personal → org upgrade path** (Mara joins a company and brings her network; the org can optionally claim shared ownership of relationships formed on its behalf, governed by policy, never silently).
