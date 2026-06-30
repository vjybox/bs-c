# Meetings (Condensed Brief)

> Depth tier: condensed (v0.2 candidate for full 18-section treatment) · Status: v0.1 · Last updated: 2026-06-30

## Business Goal

Close the loop between "met someone" and "the relationship actually progressed" — scheduling, notes, and follow-through tied back to the relationship graph, so a meeting is never a dead-end calendar event.

## Key Functional Requirements

- `Meeting` scheduling with `MeetingParticipant`s resolved against existing `Person`/`Contact` records (or creating new ones on the fly).
- `MeetingNote` capture (manual or AI-transcribed/summarized) and `ActionItem` extraction, which can feed directly into the Automation Engine as workflow triggers ("meeting ended with 3 action items → create follow-up reminders").
- Post-meeting Interaction logging back into the Networking Graph automatically (no duplicate manual entry).

## Data Sketch

`Meeting {organizer: PersonRef, participants: MeetingParticipant[], scheduledAt, linkedTo: EntityRef[]}`, `MeetingParticipant {meetingId, person: PersonRef, rsvpStatus}`, `MeetingNote {meetingId, content, author}`, `ActionItem {meetingId, description, assignee: PersonRef, status}`.

## API Surface Summary

`POST /meetings`, `POST /meetings/{id}/notes`, `GET /meetings/{id}/action-items`, webhook event `Meeting.Completed` (consumed by Automation Engine).

## AI Opportunities

AI meeting-note summarization and action-item extraction (a flagship AI Assistant Layer use case — see that module doc); AI-suggested agenda items based on open Deal/Contact context ahead of a scheduled meeting.

## Recommended Future Enhancements

- Live AI meeting-assistant (real-time transcription + suggested talking points during the call) — high business value, high complexity (real-time streaming + low-latency capability requirements on the `ModelRouter`'s `CapabilitySet`), depends on streaming support maturing across registered AI providers.
- Calendar-platform-native integrations (Google Calendar, Outlook) as bidirectional sync rather than one-way scheduling, depends on a dedicated Calendar integration in the marketplace/extensions surface.
