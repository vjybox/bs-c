// Shared by the companies routes, the contacts routes, and the seed, so all three agree on
// what a domain is and when one implies an employer.
import type { Pool, PoolClient } from "pg";

// Consumer mailbox providers: a personal address says nothing about an employer, and
// deriving "Gmail" as a company would be worse than deriving nothing.
const CONSUMER_EMAIL_DOMAINS = new Set([
  "gmail.com", "googlemail.com", "outlook.com", "hotmail.com", "live.com", "msn.com",
  "yahoo.com", "yahoo.co.uk", "icloud.com", "me.com", "mac.com", "aol.com",
  "proton.me", "protonmail.com", "pm.me", "gmx.com", "gmx.de", "web.de",
  "fastmail.com", "mail.com", "zoho.com", "yandex.com", "tutanota.com",
]);

export function normalizeDomain(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const trimmed = raw.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/^www\./, "");
  const host = trimmed.split("/")[0];
  return host.length > 0 ? host : null;
}

/** "northwind.cloud" -> "Northwind". Crude, and deliberately correctable by the user. */
export function companyNameFromDomain(domain: string): string {
  const label = domain.split(".")[0].replace(/[-_]+/g, " ");
  return label.replace(/\b\w/g, (ch) => ch.toUpperCase());
}

/**
 * Derives a company for a captured contact from the subject's *public* email domain.
 * Restricted to public fields on purpose: the owner may not be entitled to see a gated
 * address, and the directory it would feed is global.
 *
 * Returns null whenever there is no confident answer — no public email, a consumer
 * mailbox, or a malformed address. A contact with no employer is perfectly normal.
 */
export async function deriveCompanyForPerson(
  client: Pool | PoolClient,
  subjectPersonId: string,
): Promise<string | null> {
  const emailRes = await client.query<{ value: string }>(
    `SELECT cf.value
       FROM card_field cf
       JOIN digital_card dc ON dc.id = cf.card_id
       JOIN person p ON p.default_card_id = dc.id
      WHERE p.id = $1 AND cf.field_type = 'email' AND cf.visibility = 'public'
      ORDER BY cf.display_order
      LIMIT 1`,
    [subjectPersonId],
  );
  const email = emailRes.rows[0]?.value;
  if (!email || !email.includes("@")) return null;

  const domain = normalizeDomain(email.split("@").pop());
  if (!domain || !domain.includes(".") || CONSUMER_EMAIL_DOMAINS.has(domain)) return null;

  const companyRes = await client.query<{ id: string }>(
    `INSERT INTO company_profile (name, domain, enrichment_source)
     VALUES ($1, $2, 'derived')
     ON CONFLICT (domain) DO UPDATE SET domain = EXCLUDED.domain
     RETURNING id`,
    [companyNameFromDomain(domain), domain],
  );
  return companyRes.rows[0].id;
}
