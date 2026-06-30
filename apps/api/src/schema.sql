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
