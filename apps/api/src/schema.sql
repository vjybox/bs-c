-- Thin-slice schema for Identity & Card Core.
-- Mirrors the field names in docs/02-modules/identity-card-core/identity-card-core.md §7,
-- with Account/Organization/Membership/VerificationRecord intentionally omitted (see plan's
-- "What's Explicitly Out of Scope"). edit_token replaces real Account auth for this slice.

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

alter table person
  add constraint person_default_card_fk
  foreign key (default_card_id) references digital_card(id) on delete set null
  deferrable initially deferred;

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

create index if not exists idx_contact_owner on contact(owner_person_id);
create index if not exists idx_connection_person_a on connection(person_a_id);
create index if not exists idx_connection_person_b on connection(person_b_id);
create index if not exists idx_connection_last_interaction on connection(last_interaction_at);
create index if not exists idx_interaction_connection on interaction(connection_id);
