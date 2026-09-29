import type pg from "pg";

/**
 * Domain events (ADR-0004, ADR-0007). Written to outbox_event in the same transaction as
 * the change they describe, so an event exists if and only if the change committed — and a
 * replayed request that changes nothing emits nothing.
 *
 * Payloads carry ids and non-sensitive attributes only. Never a field value, a note, a
 * name or an email: consumers (automations, webhooks, AI context) must re-read through the
 * API, where the caller's permissions apply. That keeps the outbox from becoming a second,
 * unpermissioned copy of private data.
 */
export type EventType =
  | "card.created"
  | "card.field_added"
  | "card.field_updated"
  | "card.field_removed"
  | "share_session.created"
  | "field_request.created"
  | "field_request.resolved"
  | "contact.created"
  | "contact.updated"
  | "interaction.logged"
  | "company.created";

export interface DomainEvent {
  tenantId: string;
  type: EventType;
  aggregateType: "card" | "card_field" | "share_session" | "field_request" | "contact" | "interaction" | "company";
  aggregateId: string;
  payload?: Record<string, string | number | boolean | null | string[]>;
}

export async function emitEvent(client: pg.PoolClient, event: DomainEvent): Promise<void> {
  await client.query(
    `INSERT INTO outbox_event (tenant_id, type, aggregate_type, aggregate_id, payload)
     VALUES ($1, $2, $3, $4, $5)`,
    [event.tenantId, event.type, event.aggregateType, event.aggregateId, JSON.stringify(event.payload ?? {})],
  );
}

/**
 * Every mutating route and the event it emits on success. src/architecture.test.ts fails
 * if a POST/PATCH/PUT/DELETE route is missing here, so a new write path cannot silently
 * skip the event stream. `null` means "deliberately emits nothing", with the reason.
 */
export const ROUTE_EVENTS: Record<string, EventType | { none: string }> = {
  "POST /api/v1/cards": "card.created",
  "POST /api/v1/cards/:cardId/fields": "card.field_added",
  "PATCH /api/v1/cards/:cardId/fields/:fieldId": "card.field_updated",
  "DELETE /api/v1/cards/:cardId/fields/:fieldId": "card.field_removed",
  "POST /api/v1/cards/:cardId/share-sessions": "share_session.created",
  "POST /api/v1/share-sessions/:sessionId/field-requests": "field_request.created",
  "POST /api/v1/field-requests/:id/respond": "field_request.resolved",
  "POST /api/v1/contacts": "contact.created",
  "PATCH /api/v1/contacts/:contactId": "contact.updated",
  "POST /api/v1/contacts/:contactId/interactions": "interaction.logged",
  "POST /api/v1/companies": "company.created",
  "PATCH /api/v1/companies/:companyId": { none: "closed; always 403 until edits are attributable" },
};
