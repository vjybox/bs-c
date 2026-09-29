-- Notes belong to the person who wrote them.
--
-- Until now an interaction hung off the shared `connection`, so each side of a connection
-- read the other's private notes about them, and the shared strength/recency meant one
-- person's note-taking reordered the other's contact list. Interactions now hang off the
-- author's own contact row, and recency/strength live on contact.

alter table interaction add column contact_id uuid references contact(id) on delete cascade;

update interaction i
   set contact_id = c.id
  from connection conn, contact c
 where conn.id = i.connection_id
   and c.owner_person_id = i.logged_by_person_id
   and c.subject_person_id = case when conn.person_a_id = i.logged_by_person_id
                                  then conn.person_b_id else conn.person_a_id end;

-- An interaction whose author never saved the other person as a contact has no owner-side
-- home. Under the new model nobody may read it (its only reader was the leak), so it goes.
delete from interaction where contact_id is null;

alter table interaction alter column contact_id set not null;
-- A contact for someone who is not on the platform has no connection at all.
alter table interaction alter column connection_id drop not null;

create index idx_interaction_contact on interaction(contact_id, occurred_at desc);

alter table contact add column last_interaction_at timestamptz;
alter table contact add column strength double precision not null default 0.1;

update contact c
   set last_interaction_at = s.last_at,
       strength = least(1.0, 0.1 + s.recent * 0.15)
  from (select contact_id,
               max(occurred_at) as last_at,
               count(*) filter (where occurred_at > now() - interval '90 days') as recent
          from interaction group by contact_id) s
 where s.contact_id = c.id;

create index idx_contact_owner_recency on contact(owner_person_id, last_interaction_at desc nulls last);

-- connection.strength / last_interaction_at are no longer read or written. Left in place
-- rather than dropped so this migration cannot destroy anything a rollback would need.

-- One request per field per share session; the route already returns the existing row,
-- this closes the race between its check and its insert.
delete from field_request f
 using field_request g
 where f.share_session_id = g.share_session_id
   and f.field_id = g.field_id
   and (f.created_at, f.id) > (g.created_at, g.id);

create unique index uq_field_request_session_field on field_request(share_session_id, field_id);
