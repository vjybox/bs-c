# Communication (Condensed Brief)

> Depth tier: condensed (v0.2 candidate for full 18-section treatment) · Status: v0.1 · Last updated: 2026-06-30

## Business Goal

Close the loop on every other module by being the messaging/email/notification layer that actually reaches the user and the people in their network — without this module, AI-drafted follow-ups and automation actions have nowhere to go.

## Key Functional Requirements

- `MessageThread`s spanning email/in-app/SMS channels, linked to the relevant `Contact`/`Deal`/`Meeting` via `EntityRef` so conversation history is visible in relationship context.
- `NotificationPreference`s per channel, per category (a user can mute automation-generated notifications without muting direct messages).
- `DeliveryLog` for auditability of what was sent, when, and via which channel — feeding both user-facing "sent" confirmation and the platform audit log.

## Data Sketch

`MessageThread {linkedTo: EntityRef[], participants: PersonRef[], channel}`, `NotificationPreference {person: PersonRef, category, channel, enabled}`, `DeliveryLog {threadId, channel, status, deliveredAt}`.

## API Surface Summary

`POST /messages/threads`, `POST /messages/threads/{id}/send`, `PUT /notifications/preferences`, webhook events for inbound replies (`Message.Received`).

## AI Opportunities

This module is where AI-drafted outputs from the AI Assistant Layer and Automation Engine actually get sent — critically, always behind a human-approval trust boundary by default per [`00-vision/00-product-philosophy.md`](../../00-vision/00-product-philosophy.md) §4 ("automation never sends on a human's behalf without an explicit trust boundary the user configures"); AI-suggested optimal send-time based on historical engagement.

## Recommended Future Enhancements

- Configurable autonomous-send trust tiers (e.g. "auto-send routine meeting confirmations, always require approval for new-business outreach") — directly extends the human-approval-by-default principle into a graduated trust model; moderate complexity, meaningful business value for power users willing to delegate more, depends on reliable AI output-quality measurement from the AI Assistant Layer's testing strategy.
- Unified inbox across all linked channels (email, SMS, in-app) as a single triaged view — high user value, moderate-high complexity, depends on stable third-party email/SMS provider integrations (marketplace/extension candidates).
