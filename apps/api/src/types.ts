export type FieldVisibility = "public" | "link_only" | "request_required" | "hidden";
export type FieldType = "text" | "phone" | "email" | "url" | "social" | "custom";
export type ShareChannel = "link" | "qr";
export type FieldRequestStatus = "pending" | "approved" | "denied";

export interface PersonRow {
  id: string;
  display_name: string;
  headline: string | null;
  edit_token: string;
  default_card_id: string | null;
  created_at: string;
}

export interface DigitalCardRow {
  id: string;
  person_id: string;
  label: string;
  is_default: boolean;
  status: "active" | "revoked";
  created_at: string;
  updated_at: string;
}

export interface CardFieldRow {
  id: string;
  card_id: string;
  field_type: FieldType;
  label: string;
  value: string;
  visibility: FieldVisibility;
  display_order: number;
}

export interface ShareSessionRow {
  id: string;
  card_id: string;
  channel: ShareChannel;
  scoped_field_ids: string[];
  created_at: string;
  expires_at: string;
}

export interface FieldRequestRow {
  id: string;
  share_session_id: string;
  field_id: string;
  status: FieldRequestStatus;
  created_at: string;
  resolved_at: string | null;
}
