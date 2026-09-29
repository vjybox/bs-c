-- Extension points the accepted ADRs require, added while there is no real data to move.
-- None of them changes behaviour today; each makes a later step additive instead of a rewrite.

-- ADR-0001: tenancy. Every person gets a personal tenant; every tenant-scoped row carries
-- the tenant it belongs to. Row-level security policies are NOT enabled yet (see
-- docs/04-implementation/tech-debt.md, TD-01) — this is the column they will key on.
create table tenant (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('personal', 'organization')),
  created_at timestamptz not null default now()
);

alter table person add column tenant_id uuid;
update person set tenant_id = gen_random_uuid();
insert into tenant (id, kind, created_at) select tenant_id, 'personal', created_at from person;
alter table person alter column tenant_id set not null;
alter table person add constraint person_tenant_fk foreign key (tenant_id) references tenant(id);

alter table digital_card add column tenant_id uuid references tenant(id);
update digital_card d set tenant_id = p.tenant_id from person p where p.id = d.person_id;
alter table digital_card alter column tenant_id set not null;

alter table card_field add column tenant_id uuid references tenant(id);
update card_field f set tenant_id = d.tenant_id from digital_card d where d.id = f.card_id;
alter table card_field alter column tenant_id set not null;

alter table share_session add column tenant_id uuid references tenant(id);
update share_session s set tenant_id = d.tenant_id from digital_card d where d.id = s.card_id;
alter table share_session alter column tenant_id set not null;

-- A field request belongs to the card owner's tenant; the requester is anonymous.
alter table field_request add column tenant_id uuid references tenant(id);
update field_request r set tenant_id = s.tenant_id from share_session s where s.id = r.share_session_id;
alter table field_request alter column tenant_id set not null;

alter table contact add column tenant_id uuid references tenant(id);
update contact c set tenant_id = p.tenant_id from person p where p.id = c.owner_person_id;
alter table contact alter column tenant_id set not null;

alter table interaction add column tenant_id uuid references tenant(id);
update interaction i set tenant_id = c.tenant_id from contact c where c.id = i.contact_id;
alter table interaction alter column tenant_id set not null;

create index idx_person_tenant on person(tenant_id);
create index idx_digital_card_tenant on digital_card(tenant_id);
create index idx_card_field_tenant on card_field(tenant_id);
create index idx_share_session_tenant on share_session(tenant_id);
create index idx_field_request_tenant on field_request(tenant_id);
create index idx_contact_tenant on contact(tenant_id);
create index idx_interaction_tenant on interaction(tenant_id);

-- Deliberately tenant-less (asserted by src/architecture.test.ts):
--   company_profile  global firmographic reference data (ADR-0016)
--   connection       an edge between two people who may sit in different tenants; it holds
--                    no private data since 0002 (ADR-0020)

-- Rulebook 10.5: an interaction is private to its author unless it was logged in an
-- organization's context. Only 'private' is produced today; 'organization' is reserved for
-- shared Workspace contacts.
alter table interaction add column visibility text not null default 'private'
  check (visibility in ('private', 'organization'));

-- ADR-0004 / ADR-0007: transactional outbox. A state change and its event commit together
-- or not at all. Payloads carry ids and non-sensitive attributes only — never field values
-- or note text — so a consumer must re-read through the API, where permissions apply.
-- No relay publishes these yet (tech-debt TD-02); they accumulate and are queryable.
create table outbox_event (
  id uuid primary key default gen_random_uuid(),
  -- The tenant on whose behalf the change was made (for a global company, the actor's).
  tenant_id uuid not null references tenant(id),
  type text not null,
  aggregate_type text not null,
  aggregate_id uuid not null,
  payload jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now(),
  published_at timestamptz
);

create index idx_outbox_unpublished on outbox_event(occurred_at) where published_at is null;
create index idx_outbox_tenant on outbox_event(tenant_id);
