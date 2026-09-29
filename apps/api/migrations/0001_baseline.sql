-- Baseline: the schema as it stood before migrations existed. Never edit this file;
-- add a new numbered migration instead (src/migrate.ts rejects a changed checksum).

create extension if not exists pgcrypto;

create table if not exists person (
  id uuid primary key default gen_random_uuid(),
  display_name text not null,
  headline text,
  edit_token text not null unique,
  default_card_id uuid,
  created_at timestamptz not null default now()
);

create table if not exists digital_card (
  id uuid primary key default gen_random_uuid(),
  person_id uuid not null references person(id) on delete cascade,
  label text not null default 'Default',
  is_default boolean not null default true,
  status text not null default 'active' check (status in ('active', 'revoked')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Guarded so the whole file stays re-runnable; `add constraint` has no IF NOT EXISTS form.
do $$
begin
  alter table person
    add constraint person_default_card_fk
    foreign key (default_card_id) references digital_card(id) on delete set null
    deferrable initially deferred;
exception
  when duplicate_object then null;
end $$;

create table if not exists card_field (
  id uuid primary key default gen_random_uuid(),
  card_id uuid not null references digital_card(id) on delete cascade,
  field_type text not null check (field_type in ('text', 'phone', 'email', 'url', 'social', 'custom')),
  label text not null,
  value text not null default '',
  visibility text not null default 'public' check (visibility in ('public', 'link_only', 'request_required', 'hidden')),
  display_order integer not null default 0
);

create table if not exists share_session (
  id uuid primary key default gen_random_uuid(),
  card_id uuid not null references digital_card(id) on delete cascade,
  channel text not null check (channel in ('link', 'qr')),
  scoped_field_ids uuid[] not null default '{}',
  created_at timestamptz not null default now(),
  expires_at timestamptz not null
);

create table if not exists field_request (
  id uuid primary key default gen_random_uuid(),
  share_session_id uuid not null references share_session(id) on delete cascade,
  field_id uuid not null references card_field(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'approved', 'denied')),
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

create index if not exists idx_digital_card_person on digital_card(person_id);
create index if not exists idx_card_field_card on card_field(card_id);
create index if not exists idx_share_session_card on share_session(card_id);
create index if not exists idx_field_request_session on field_request(share_session_id);

-- Contacts & Networking Graph module tables.

create table if not exists contact (
  id uuid primary key default gen_random_uuid(),
  owner_person_id uuid not null references person(id) on delete cascade,
  subject_person_id uuid references person(id) on delete set null,
  unmatched_profile jsonb,
  capture_source text not null check (capture_source in ('card_share', 'manual')),
  capture_context text,
  created_at timestamptz not null default now()
);

-- One Contact per (owner, subject) pair.
create unique index if not exists uq_contact_owner_subject
  on contact(owner_person_id, subject_person_id)
  where subject_person_id is not null;

create table if not exists connection (
  id uuid primary key default gen_random_uuid(),
  person_a_id uuid not null references person(id) on delete cascade,
  person_b_id uuid not null references person(id) on delete cascade,
  strength float not null default 0.1,
  last_interaction_at timestamptz,
  context text,
  created_at timestamptz not null default now(),
  -- person_a_id < person_b_id enforced in application code to prevent duplicate edges.
  unique(person_a_id, person_b_id)
);

create table if not exists interaction (
  id uuid primary key default gen_random_uuid(),
  connection_id uuid not null references connection(id) on delete cascade,
  logged_by_person_id uuid not null references person(id) on delete cascade,
  channel text not null check (channel in ('meeting', 'call', 'email', 'message', 'note')),
  summary text,
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

-- Company Directory (ADR-0016). Deliberately GLOBAL: no tenant_id, no owner. It is public
-- firmographic reference data shared by every tenant, and it is the platform's only entity
-- exempt from tenant isolation. It MUST NOT gain any person-identifying column — no names,
-- no titles, no employee lists. Anything identifying a human stays on person/contact.
create table if not exists company_profile (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  domain text unique,
  industry text,
  size_band text check (size_band in ('1-10', '11-50', '51-200', '201-1000', '1000+')),
  logo_ref text,
  -- 'derived' = extracted deterministically (e.g. from an email domain). 'ai' is reserved
  -- for genuine model-backed enrichment, which does not exist yet.
  enrichment_source text not null default 'manual'
    check (enrichment_source in ('derived', 'manual', 'ai', 'claimed')),
  verification_status text not null default 'unverified'
    check (verification_status in ('unverified', 'verified')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- The org tree is composed only of the owner's own contact rows (rulebook 9.3), so both
-- edges live on contact: company membership, and a private reporting line to another
-- contact the same owner holds.
alter table contact add column if not exists company_profile_id uuid
  references company_profile(id) on delete set null;
alter table contact add column if not exists reports_to_contact_id uuid
  references contact(id) on delete set null;

create index if not exists idx_company_profile_domain on company_profile(domain);
create index if not exists idx_contact_company on contact(company_profile_id);
create index if not exists idx_contact_reports_to on contact(reports_to_contact_id);
create index if not exists idx_contact_owner on contact(owner_person_id);
create index if not exists idx_connection_person_a on connection(person_a_id);
create index if not exists idx_connection_person_b on connection(person_b_id);
create index if not exists idx_connection_last_interaction on connection(last_interaction_at);
create index if not exists idx_interaction_connection on interaction(connection_id);
