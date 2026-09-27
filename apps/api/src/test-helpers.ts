import { pool } from "./db.js";

export async function truncateAll() {
  // company_profile is listed explicitly: it is global and has no foreign key back to
  // person, so the cascade from person does not reach it and rows would leak across tests.
  await pool.query(
    "truncate table field_request, share_session, card_field, digital_card, company_profile, person restart identity cascade",
  );
}
