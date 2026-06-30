# Portfolio (Condensed Brief)

> Depth tier: condensed (v0.2 candidate for full 18-section treatment) · Status: v0.1 · Last updated: 2026-06-30

## Business Goal

Let a professional attach proof of capability (work samples, case studies) directly to their identity, viewable in context when sharing a `DigitalCard` (see [`identity-card-core`](../identity-card-core/identity-card-core.md)) — turning a card share into more than a contact exchange.

## Key Functional Requirements

- Upload/link `PortfolioItem`s (case studies, media, external links) with visibility scoping (public, connections-only, specific NetworkSegment).
- Attach portfolio items to specific `DigitalCard` variants (a "Design card" shows design work, a "Sales card" shows case studies).
- Track engagement (views, clicks) on shared portfolio items for the owner's own analytics — never exposed to viewers without consent.

## Data Sketch

`PortfolioItem {owner: PersonRef, title, description, mediaAssets, visibilityScope, linkedCards: DigitalCard[]}`, `MediaAsset {type, objectStorageRef, ...}` (binary content lives in object storage per [`01-data-architecture.md`](../../01-architecture/01-data-architecture.md) §6, never as a DB blob), `CaseStudy {portfolioItemId, outcome, relatedOrganization: OrganizationRef}`.

## API Surface Summary

`POST /portfolio/items`, `GET /persons/{id}/portfolio` (visibility-filtered to the requester), `POST /portfolio/items/{id}/media`.

## AI Opportunities

AI-assisted case-study drafting from raw project notes (via the Knowledge module and AI Assistant Layer); AI-suggested portfolio items to attach to a given card variant based on the viewer's inferred context.

## Recommended Future Enhancements

- AI-generated portfolio summaries tailored per-viewer (e.g. a recruiter sees a different framing of the same work than a prospective client) — moderate complexity, depends on viewer-context signals from the Networking Graph and the AI Assistant Layer's prompt templating.
- Embeddable portfolio widgets for external sites (a real "extension point" instance — see [`01-architecture/04-integration-api-gateway.md`](../../01-architecture/04-integration-api-gateway.md)), low complexity, high distribution value.
