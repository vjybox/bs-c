import { pool } from "./db.js";

export async function truncateAll() {
  // company_profile is listed explicitly: it is global and has no foreign key back to
  // person, so the cascade from person does not reach it and rows would leak across tests.
  // tenant and outbox_event are listed for the same reason: neither is reached by a
  // cascade from person (person references tenant, not the other way round).
  await pool.query(
    "truncate table outbox_event, field_request, share_session, card_field, digital_card, company_profile, person, tenant restart identity cascade",
  );
}
