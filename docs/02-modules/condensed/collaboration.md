# Collaboration (Condensed Brief)

> Depth tier: condensed (v0.2 candidate for full 18-section treatment) · Status: v0.1 · Last updated: 2026-06-30

## Business Goal

Give teams (the Lena persona — agency/small team leads) shared workspaces over the same identity/relationship graph, so the network and pipeline are assets of the team, not fragmented across individual employees' personal accounts.

## Key Functional Requirements

- `Workspace` as a shared container scoping visibility across Contacts, Deals, and Knowledge for its `WorkspaceMember`s, layered on top of the Organization/Membership model from Identity & Card Core (a Workspace is not a new tenancy concept — it's a visibility/collaboration grouping within an existing Organization).
- `SharedView`s — saved, shareable filters/dashboards over CRM pipeline or Networking Graph data, scoped to a Workspace.
- Departing-employee data continuity: when a `Membership` ends, the Organization can (per policy, never silently) retain Workspace-owned relationship data rather than losing it with the departing individual.

## Data Sketch

`Workspace {organization: OrganizationRef, name}`, `WorkspaceMember {workspaceId, person: PersonRef, role}`, `SharedView {workspaceId, name, filterDefinition, targetModule}`.

## API Surface Summary

`POST /workspaces`, `POST /workspaces/{id}/members`, `GET /workspaces/{id}/views`.

## AI Opportunities

AI-suggested SharedViews based on observed team query patterns; AI-summarized workspace activity digests ("what happened in this workspace this week").

## Recommended Future Enhancements

- Cross-workspace benchmarking for multi-team agencies (compare pipeline health across client-facing workspaces) — moderate complexity, depends on the Analytics & Insights module's aggregation infrastructure.
- ~~Granular per-field visibility within a shared Contact~~ — **no longer a proposal; decided in corpus v0.2.** [`01-architecture/09-experience-and-interaction-rulebook.md`](../../01-architecture/09-experience-and-interaction-rulebook.md) §10.5 splits a shared `Contact` into a travelling *engagement layer* and a *private layer* (`captureContext`, personal notes and tags, segment membership) that stays private by default, shares only per-field, and never retroactively. This is now a binding requirement on this module, not an enhancement to consider.
