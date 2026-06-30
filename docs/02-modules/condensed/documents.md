# Documents (Condensed Brief)

> Depth tier: condensed (v0.2 candidate for full 18-section treatment) · Status: v0.1 · Last updated: 2026-06-30

## Business Goal

Give professionals and teams a document layer (proposals, contracts, decks) tied natively to identity and relationships — a document is always linked to who it's with (a `Contact`/`Deal` via `EntityRef`), not a bare file in a folder.

## Key Functional Requirements

- `Document` upload/creation with `DocumentVersion` history and `DocumentShareGrant`s scoped to specific people or NetworkSegments.
- Link documents to CRM `Deal`s, Meetings, or Contacts via `EntityRef` so they surface in relationship context automatically.
- Read receipts / view tracking on shared documents (consent-respecting — see Privacy notes below).

## Data Sketch

`Document {owner: PersonRef|OrganizationRef, title, currentVersion, linkedTo: EntityRef[]}`, `DocumentVersion {documentId, objectStorageRef, createdAt, author}`, `DocumentShareGrant {documentId, grantee: PersonRef, permission, expiresAt}`.

## API Surface Summary

`POST /documents`, `POST /documents/{id}/versions`, `POST /documents/{id}/share`, `GET /documents/{id}/activity` (view/read receipts).

## AI Opportunities

AI-drafted proposals/contracts grounded in Deal/Contact context (via the AI Assistant Layer's RAG context assembly); AI-summarized document changes between versions.

## Recommended Future Enhancements

- E-signature integration as a built-in capability rather than a third-party redirect — high business value for the CRM-adjacent use case (closing deals), moderate-high complexity, likely built as a marketplace extension first to validate demand before native investment.
- Real-time collaborative document editing using the CRDT sync strategy already scoped for collaborative content in [ADR-0010](../../adr/0010-offline-first-sync-protocol.md).

## Privacy Note

View-tracking/read-receipts must respect `ConsentRecord` (see [`05-security-privacy-compliance.md`](../../01-architecture/05-security-privacy-compliance.md) §6) — a recipient can opt out of being tracked, which the platform must honor even though it reduces sender-side analytics value.
