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

export type CaptureSource = "card_share" | "manual";
export type InteractionChannel = "meeting" | "call" | "email" | "message" | "note";

export interface ContactRow {
  id: string;
  owner_person_id: string;
  subject_person_id: string | null;
  unmatched_profile: Record<string, unknown> | null;
  capture_source: CaptureSource;
  capture_context: string | null;
  company_profile_id: string | null;
  reports_to_contact_id: string | null;
  last_interaction_at: string | null;
  strength: number;
  created_at: string;
}

/** 'derived' is deterministic extraction (an email domain); 'ai' is reserved, not yet used. */
export type EnrichmentSource = "derived" | "manual" | "ai" | "claimed";
export type SizeBand = "1-10" | "11-50" | "51-200" | "201-1000" | "1000+";

/** Global and tenant-less by design (ADR-0016). Must never gain a person-identifying field. */
export interface CompanyProfileRow {
  id: string;
  name: string;
  domain: string | null;
  industry: string | null;
  size_band: SizeBand | null;
  logo_ref: string | null;
  enrichment_source: EnrichmentSource;
  verification_status: "unverified" | "verified";
  created_at: string;
  updated_at: string;
}

export interface ConnectionRow {
  id: string;
  person_a_id: string;
  person_b_id: string;
  strength: number;
  last_interaction_at: string | null;
  context: string | null;
  created_at: string;
}

export interface InteractionRow {
  id: string;
  contact_id: string;
  connection_id: string | null;
  logged_by_person_id: string;
  channel: InteractionChannel;
  summary: string | null;
  occurred_at: string;
  created_at: string;
}
