import { pool } from "./db.js";

export async function truncateAll() {
  await pool.query(
    "truncate table field_request, share_session, card_field, digital_card, person restart identity cascade",
  );
}
