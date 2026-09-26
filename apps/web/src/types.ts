export type FieldVisibility = "public" | "link_only" | "request_required" | "hidden";
export type FieldType = "text" | "phone" | "email" | "url" | "social" | "custom";

export interface OwnerField {
  id: string;
  fieldType: FieldType;
  label: string;
  value: string;
  visibility: FieldVisibility;
  displayOrder: number;
}

export interface OwnerPerson {
  id: string;
  displayName: string;
  headline: string | null;
}

export interface OwnerCard {
  id: string;
  label: string;
  isDefault: boolean;
  status: "active" | "revoked";
  fields: OwnerField[];
}

export interface RecipientField {
  id: string;
  fieldType: FieldType;
  label: string;
  value: string;
  displayOrder: number;
}

export interface RequestableField {
  id: string;
  fieldType: FieldType;
  label: string;
}

export interface RecipientCardView {
  person: { displayName: string; headline: string | null };
  card: { id: string; label: string };
  fields: RecipientField[];
  requestableFields: RequestableField[];
}

export interface FieldRequest {
  id: string;
  fieldId: string;
  status: "pending" | "approved" | "denied";
  createdAt: string;
  resolvedAt: string | null;
  fieldLabel: string;
  shareSessionId: string;
}

export type InteractionChannel = "meeting" | "call" | "email" | "message" | "note";

export interface Interaction {
  id: string;
  channel: InteractionChannel;
  summary: string | null;
  occurredAt: string;
  loggedByPersonId: string;
}

export interface Contact {
  id: string;
  subject: { displayName: string; headline: string | null } | null;
  captureSource: "card_share" | "manual";
  captureContext: string | null;
  connectionId: string | null;
  connectionStrength: number | null;
  lastInteractionAt: string | null;
  createdAt: string;
}

export interface ContactDetail extends Contact {
  interactions: Interaction[];
}

export interface ReconnectionSuggestion {
  contactId: string;
  subject: { displayName: string; headline: string | null };
  daysSinceInteraction: number | null;
  connectionStrength: number;
}
