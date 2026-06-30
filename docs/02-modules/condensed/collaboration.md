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
- Granular per-field visibility within a shared Contact (e.g. personal notes stay private even within a shared Workspace contact record) — addresses a real privacy tension between "shared team asset" and "individual's private working notes," flagged also as an Open Question in the Contacts/Networking Graph flagship doc.
