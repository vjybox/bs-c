# Reputation (Condensed Brief)

> Depth tier: condensed (v0.2 candidate for full 18-section treatment) · Status: v0.1 · Last updated: 2026-06-30

## Business Goal

Give a professional a portable, verifiable trust signal — endorsements and reputation that travel with their identity (see [`identity-card-core`](../identity-card-core/identity-card-core.md)) rather than being locked inside one platform like LinkedIn endorsements are today.

## Key Functional Requirements

- Request and receive structured endorsements from Connections (see [`contacts-networking-graph`](../contacts-networking-graph/contacts-networking-graph.md)) tied to specific skills/claims, not just generic "+1"s.
- A computed `ReputationScore` (per-context, not a single global number — e.g. "reliability with deal follow-through" scored differently than "domain expertise") that is transparent about its inputs, not a black box.
- Verified trust signals can be sourced from Certifications (cross-module link) and from completed CRM `Activity`/`Deal` outcomes (with participant consent).

## Data Sketch

`Endorsement {endorser: PersonRef, subject: PersonRef, claim, context, createdAt}`, `TrustSignal {subject: PersonRef, source: EntityRef, weight, verifiedAt}`, `ReputationScore {subject: PersonRef, dimension, value, computedAt}` — `ReputationScore` is a derived/cached read model, never the source of truth (the source of truth is the underlying `Endorsement`/`TrustSignal` records, recomputed on change via the event bus).

## API Surface Summary

`POST /reputation/endorsements`, `GET /persons/{id}/reputation` (returns per-dimension scores + contributing signals), `POST /reputation/requests` (request an endorsement from a connection).

## AI Opportunities

AI-assisted endorsement-request drafting; AI-detected "you should ask X for an endorsement" based on recent successful Interactions; anomaly detection for endorsement-gaming/fraud patterns (a Security & Compliance Center concern at execution time).

## Recommended Future Enhancements

- Cross-tenant reputation portability with cryptographic attestation (a Person's reputation signed by the issuing org, verifiable even after leaving that org) — high business value for the recruiter persona (Yusuf), moderate complexity, depends on the Verification Record infrastructure in Identity & Card Core maturing first.
- "Reputation context" filters so a viewer sees reputation relevant to their relationship to the subject (a client sees client-relevant trust signals, a colleague sees different ones).
