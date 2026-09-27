// Demo seed data. Run via `npm run seed --workspace=apps/api`, or automatically by the
// `seed` service in docker-compose.yml. Idempotent: exits 0 if the database already
// has people in it.
import type { PoolClient } from "pg";
import { pool, recomputeConnectionStrength } from "./db.js";
import { deriveCompanyForPerson } from "./company-derivation.js";
import type { FieldType, FieldVisibility, InteractionChannel } from "./types.js";

const DAY_MS = 86_400_000;

function daysAgo(n: number): Date {
  return new Date(Date.now() - n * DAY_MS);
}

function daysFromNow(n: number): Date {
  return new Date(Date.now() + n * DAY_MS);
}

interface SeedField {
  fieldType: FieldType;
  label: string;
  value: string;
  visibility: FieldVisibility;
}

interface SeedPerson {
  key: string;
  displayName: string;
  headline: string;
  editToken: string;
  fields: SeedField[];
}

// Tokens are fixed and readable so they stay stable across reseeds and can be pasted
// into curl. They are only reachable when DEMO_MODE=true (see routes/demo.ts).
const PEOPLE: SeedPerson[] = [
  {
    key: "mara",
    displayName: "Mara Oyelaran",
    headline: "Independent brand consultant",
    editToken: "demo-mara-token",
    fields: [
      { fieldType: "email", label: "Work email", value: "mara@oyelaran.studio", visibility: "public" },
      { fieldType: "url", label: "Website", value: "https://oyelaran.studio", visibility: "public" },
      { fieldType: "phone", label: "Mobile", value: "+44 7700 900101", visibility: "link_only" },
      { fieldType: "email", label: "Personal email", value: "mara.p@fastmail.com", visibility: "request_required" },
      { fieldType: "text", label: "Home address", value: "12 Orchard Lane, Bristol", visibility: "hidden" },
    ],
  },
  {
    key: "devon",
    displayName: "Devon Park",
    headline: "Account Executive, Northwind Cloud",
    editToken: "demo-devon-token",
    fields: [
      { fieldType: "email", label: "Work email", value: "devon.park@northwind.cloud", visibility: "public" },
      { fieldType: "text", label: "Territory", value: "EMEA mid-market", visibility: "public" },
      { fieldType: "phone", label: "Direct line", value: "+1 415 555 0142", visibility: "link_only" },
      { fieldType: "phone", label: "Mobile", value: "+1 415 555 0199", visibility: "request_required" },
      { fieldType: "text", label: "Quota notes", value: "Internal only", visibility: "hidden" },
    ],
  },
  {
    key: "priya",
    displayName: "Priya Raman",
    headline: "Head of IT Security, Meridian Health",
    editToken: "demo-priya-token",
    fields: [
      { fieldType: "email", label: "Work email", value: "p.raman@meridianhealth.org", visibility: "public" },
      { fieldType: "text", label: "Title", value: "Head of IT Security", visibility: "public" },
      { fieldType: "url", label: "LinkedIn", value: "https://linkedin.com/in/priyaraman", visibility: "link_only" },
      { fieldType: "phone", label: "Desk", value: "+44 20 7946 0321", visibility: "request_required" },
      { fieldType: "phone", label: "Personal mobile", value: "+44 7700 900444", visibility: "hidden" },
    ],
  },
  {
    key: "yusuf",
    displayName: "Yusuf Demir",
    headline: "Talent Partner, Lattice Search",
    editToken: "demo-yusuf-token",
    fields: [
      { fieldType: "email", label: "Work email", value: "yusuf@latticesearch.com", visibility: "public" },
      { fieldType: "url", label: "Booking link", value: "https://cal.com/yusuf", visibility: "public" },
      { fieldType: "phone", label: "Mobile", value: "+49 151 2345 6789", visibility: "link_only" },
      { fieldType: "email", label: "Referrals inbox", value: "refer@latticesearch.com", visibility: "request_required" },
    ],
  },
  {
    key: "lena",
    displayName: "Lena Brandt",
    headline: "Founder & Creative Director, Studio Brandt",
    editToken: "demo-lena-token",
    fields: [
      { fieldType: "email", label: "Studio", value: "hello@studiobrandt.de", visibility: "public" },
      { fieldType: "text", label: "Title", value: "Founder & Creative Director", visibility: "public" },
      { fieldType: "url", label: "Portfolio", value: "https://studiobrandt.de/work", visibility: "link_only" },
      { fieldType: "phone", label: "Mobile", value: "+49 170 9876 543", visibility: "request_required" },
    ],
  },
  // Two more at Devon's domain, so one company has a real hierarchy to look at rather
  // than a single lonely node.
  {
    key: "noor",
    displayName: "Noor Haddad",
    headline: "VP Sales, Northwind Cloud",
    editToken: "demo-noor-token",
    fields: [
      { fieldType: "email", label: "Work email", value: "noor.haddad@northwind.cloud", visibility: "public" },
      { fieldType: "text", label: "Title", value: "VP Sales, EMEA", visibility: "public" },
      { fieldType: "phone", label: "Mobile", value: "+1 415 555 0177", visibility: "request_required" },
    ],
  },
  {
    key: "tomas",
    displayName: "Tomas Vega",
    headline: "Sales Development Rep, Northwind Cloud",
    editToken: "demo-tomas-token",
    fields: [
      { fieldType: "email", label: "Work email", value: "tomas.vega@northwind.cloud", visibility: "public" },
      { fieldType: "url", label: "Calendar", value: "https://cal.com/tomasvega", visibility: "link_only" },
    ],
  },
];

/** Mara's private view of who reports to whom at Northwind, as owner -> subject pairs. */
const REPORTING_LINES: Array<{ ownerKey: string; subjectKey: string; managerKey: string }> = [
  { ownerKey: "mara", subjectKey: "devon", managerKey: "noor" },
  { ownerKey: "mara", subjectKey: "tomas", managerKey: "devon" },
];

interface InsertedPerson {
  personId: string;
  cardId: string;
  fieldIds: Map<string, string>;
  fieldVisibility: Map<string, FieldVisibility>;
}

async function insertPerson(client: PoolClient, p: SeedPerson): Promise<InsertedPerson> {
  const personRes = await client.query<{ id: string }>(
    "INSERT INTO person (display_name, headline, edit_token) VALUES ($1, $2, $3) RETURNING id",
    [p.displayName, p.headline, p.editToken],
  );
  const personId = personRes.rows[0].id;

  const cardRes = await client.query<{ id: string }>(
    "INSERT INTO digital_card (person_id, label, is_default) VALUES ($1, 'Default', true) RETURNING id",
    [personId],
  );
  const cardId = cardRes.rows[0].id;

  await client.query("UPDATE person SET default_card_id = $1 WHERE id = $2", [cardId, personId]);

  const fieldIds = new Map<string, string>();
  const fieldVisibility = new Map<string, FieldVisibility>();
  for (const [i, f] of p.fields.entries()) {
    const res = await client.query<{ id: string }>(
      `INSERT INTO card_field (card_id, field_type, label, value, visibility, display_order)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
      [cardId, f.fieldType, f.label, f.value, f.visibility, i],
    );
    fieldIds.set(f.label, res.rows[0].id);
    fieldVisibility.set(f.label, f.visibility);
  }

  return { personId, cardId, fieldIds, fieldVisibility };
}

// Mirrors how shareSessions.ts scopes a session at creation time: public + link_only only.
function shareableFieldIds(p: InsertedPerson): string[] {
  return [...p.fieldIds.entries()]
    .filter(([label]) => {
      const v = p.fieldVisibility.get(label);
      return v === "public" || v === "link_only";
    })
    .map(([, id]) => id);
}

interface SeedInteraction {
  daysAgo: number;
  channel: InteractionChannel;
  summary: string;
  loggedByKey: string;
}

interface SeedRelationship {
  ownerKey: string;
  subjectKey: string;
  captureContext: string;
  /** Reverse contact so the subject also sees the owner in their list. */
  alsoReverse?: boolean;
  interactions: SeedInteraction[];
}

const RELATIONSHIPS: SeedRelationship[] = [
  {
    ownerKey: "mara",
    subjectKey: "devon",
    captureContext: "SaaStr Annual 2026 — hallway track",
    alsoReverse: true,
    // 6 interactions inside 90 days => strength caps at 1.0
    interactions: [
      { daysAgo: 88, channel: "note", summary: "Saved contact from shared card", loggedByKey: "mara" },
      { daysAgo: 66, channel: "meeting", summary: "Coffee at the conference, talked rebrand scope", loggedByKey: "mara" },
      { daysAgo: 45, channel: "email", summary: "Sent over the positioning one-pager", loggedByKey: "mara" },
      { daysAgo: 28, channel: "call", summary: "Walked through pricing tiers", loggedByKey: "devon" },
      { daysAgo: 17, channel: "message", summary: "Quick Slack thread about timelines", loggedByKey: "mara" },
      { daysAgo: 2, channel: "meeting", summary: "Kickoff scheduled for next month", loggedByKey: "mara" },
    ],
  },
  {
    ownerKey: "mara",
    subjectKey: "priya",
    captureContext: "Meridian Health security review, introduced by Devon",
    // 3 inside 90 days => 0.1 + 0.45 = 0.55
    interactions: [
      { daysAgo: 75, channel: "note", summary: "Saved contact from shared card", loggedByKey: "mara" },
      { daysAgo: 30, channel: "email", summary: "Sent the vendor security questionnaire back", loggedByKey: "mara" },
      { daysAgo: 5, channel: "call", summary: "Clarified data residency questions", loggedByKey: "priya" },
    ],
  },
  {
    ownerKey: "mara",
    subjectKey: "yusuf",
    captureContext: "Intro call about contract design roles",
    // 1 inside 90 days => 0.25
    interactions: [
      { daysAgo: 12, channel: "note", summary: "Saved contact from shared card", loggedByKey: "mara" },
    ],
  },
  {
    ownerKey: "mara",
    subjectKey: "noor",
    captureContext: "Introduced by Devon — Northwind budget holder",
    interactions: [
      { daysAgo: 40, channel: "note", summary: "Saved contact from shared card", loggedByKey: "mara" },
      { daysAgo: 21, channel: "meeting", summary: "Scoping call for the rebrand budget", loggedByKey: "mara" },
    ],
  },
  {
    ownerKey: "mara",
    subjectKey: "tomas",
    captureContext: "SaaStr Annual 2026 — Northwind booth",
    interactions: [
      { daysAgo: 85, channel: "note", summary: "Saved contact from shared card", loggedByKey: "mara" },
      { daysAgo: 34, channel: "message", summary: "Sent him the case study he asked for", loggedByKey: "mara" },
    ],
  },
  {
    ownerKey: "mara",
    subjectKey: "lena",
    captureContext: "Berlin design meetup, 2025",
    alsoReverse: true,
    // Nothing inside 90 days => strength floor 0.1, and last interaction ~210 days ago,
    // which is what makes this the reconnection suggestion.
    interactions: [
      { daysAgo: 300, channel: "note", summary: "Saved contact from shared card", loggedByKey: "mara" },
      { daysAgo: 240, channel: "meeting", summary: "Drinks after the meetup talk", loggedByKey: "mara" },
      { daysAgo: 210, channel: "email", summary: "Swapped portfolio links, said we'd collaborate", loggedByKey: "mara" },
    ],
  },
];

async function seed(client: PoolClient): Promise<void> {
  const inserted = new Map<string, InsertedPerson>();
  for (const p of PEOPLE) {
    inserted.set(p.key, await insertPerson(client, p));
  }

  const mara = inserted.get("mara")!;

  // Share sessions on Mara's card: one live (link), one live (qr) carrying an approved
  // request, and one already expired so the 410 path is reachable.
  const liveScoped = shareableFieldIds(mara);
  const personalEmailId = mara.fieldIds.get("Personal email")!;

  const liveSession = await client.query<{ id: string }>(
    `INSERT INTO share_session (card_id, channel, scoped_field_ids, expires_at)
     VALUES ($1, 'link', $2, $3) RETURNING id`,
    [mara.cardId, liveScoped, daysFromNow(7)],
  );

  // The approved request's field is appended to the session's scope, matching what the
  // real POST /api/field-requests/:id/respond route does on approval.
  const approvedSession = await client.query<{ id: string }>(
    `INSERT INTO share_session (card_id, channel, scoped_field_ids, expires_at)
     VALUES ($1, 'qr', $2, $3) RETURNING id`,
    [mara.cardId, [...liveScoped, personalEmailId], daysFromNow(7)],
  );

  await client.query(
    `INSERT INTO share_session (card_id, channel, scoped_field_ids, expires_at)
     VALUES ($1, 'link', $2, $3)`,
    [mara.cardId, liveScoped, daysAgo(2)],
  );

  // One pending request (so the Requests screen has something to approve) and one already
  // approved. Both target a request_required field, which the real route enforces.
  await client.query(
    `INSERT INTO field_request (share_session_id, field_id, status, created_at)
     VALUES ($1, $2, 'pending', $3)`,
    [liveSession.rows[0].id, personalEmailId, daysAgo(1)],
  );
  await client.query(
    `INSERT INTO field_request (share_session_id, field_id, status, created_at, resolved_at)
     VALUES ($1, $2, 'approved', $3, $4)`,
    [approvedSession.rows[0].id, personalEmailId, daysAgo(20), daysAgo(19)],
  );

  // Keyed "owner->subject" so reporting lines can be attached once every contact exists.
  const contactIds = new Map<string, string>();

  for (const rel of RELATIONSHIPS) {
    const owner = inserted.get(rel.ownerKey)!;
    const subject = inserted.get(rel.subjectKey)!;

    // Same derivation the API performs on a real capture, so seeded and live data agree.
    const subjectCompanyId = await deriveCompanyForPerson(client, subject.personId);
    const ownerCompanyId = await deriveCompanyForPerson(client, owner.personId);

    const contactRes = await client.query<{ id: string }>(
      `INSERT INTO contact (owner_person_id, subject_person_id, capture_source, capture_context, company_profile_id, created_at)
       VALUES ($1, $2, 'card_share', $3, $4, $5)
       RETURNING id`,
      [
        owner.personId,
        subject.personId,
        rel.captureContext,
        subjectCompanyId,
        daysAgo(rel.interactions[0].daysAgo),
      ],
    );
    contactIds.set(`${rel.ownerKey}->${rel.subjectKey}`, contactRes.rows[0].id);

    if (rel.alsoReverse) {
      const reverseRes = await client.query<{ id: string }>(
        `INSERT INTO contact (owner_person_id, subject_person_id, capture_source, capture_context, company_profile_id, created_at)
         VALUES ($1, $2, 'card_share', $3, $4, $5)
         RETURNING id`,
        [
          subject.personId,
          owner.personId,
          rel.captureContext,
          ownerCompanyId,
          daysAgo(rel.interactions[0].daysAgo),
        ],
      );
      contactIds.set(`${rel.subjectKey}->${rel.ownerKey}`, reverseRes.rows[0].id);
    }

    // Same ordering rule the contacts route enforces, so the unique pair constraint holds.
    const [personAId, personBId] =
      owner.personId < subject.personId
        ? [owner.personId, subject.personId]
        : [subject.personId, owner.personId];

    const connRes = await client.query<{ id: string }>(
      `INSERT INTO connection (person_a_id, person_b_id, context, created_at)
       VALUES ($1, $2, $3, $4) RETURNING id`,
      [personAId, personBId, rel.captureContext, daysAgo(rel.interactions[0].daysAgo)],
    );
    const connectionId = connRes.rows[0].id;

    for (const i of rel.interactions) {
      await client.query(
        `INSERT INTO interaction (connection_id, logged_by_person_id, channel, summary, occurred_at, created_at)
         VALUES ($1, $2, $3, $4, $5, $5)`,
        [connectionId, inserted.get(i.loggedByKey)!.personId, i.channel, i.summary, daysAgo(i.daysAgo)],
      );
    }

    await recomputeConnectionStrength(client, connectionId);
  }

  // recomputeConnectionStrength stamps last_interaction_at = now() unconditionally, which
  // would erase the backdating above and leave reconnection suggestions empty. Restore the
  // real values from the interaction history.
  await client.query(
    `UPDATE connection c
        SET last_interaction_at = (SELECT max(occurred_at) FROM interaction WHERE connection_id = c.id)`,
  );

  // Two companies get corrected by "a human", the rest stay as the crude domain-derived
  // guess — so the demo shows both states and the inferred badge has something to mark.
  const CORRECTED = [
    { domain: "northwind.cloud", name: "Northwind Cloud", industry: "Cloud infrastructure", sizeBand: "201-1000" },
    { domain: "meridianhealth.org", name: "Meridian Health", industry: "Healthcare", sizeBand: "1000+" },
  ];
  for (const c of CORRECTED) {
    await client.query(
      `UPDATE company_profile
          SET name = $2, industry = $3, size_band = $4, enrichment_source = 'manual', updated_at = now()
        WHERE domain = $1`,
      [c.domain, c.name, c.industry, c.sizeBand],
    );
  }

  for (const line of REPORTING_LINES) {
    const contactId = contactIds.get(`${line.ownerKey}->${line.subjectKey}`);
    const managerId = contactIds.get(`${line.ownerKey}->${line.managerKey}`);
    if (!contactId || !managerId) continue;
    await client.query("UPDATE contact SET reports_to_contact_id = $2 WHERE id = $1", [
      contactId,
      managerId,
    ]);
  }
}

async function main(): Promise<void> {
  const schemaCheck = await pool.query<{ ok: boolean }>(
    "SELECT to_regclass('public.person') IS NOT NULL AS ok",
  );
  if (!schemaCheck.rows[0].ok) {
    console.error(
      [
        "Schema is missing — the database has no tables, so there is nothing to seed.",
        "",
        "Two things cause this:",
        "",
        "1. You started the stack with only docker-compose.yml, not the whole project folder.",
        "   Compose bind-mounts ./apps/api/src/schema.sql into Postgres to create the tables.",
        "   If that file isn't there, Docker silently creates an empty DIRECTORY in its place",
        "   and Postgres starts up with nothing in it. Copy the entire project folder to the",
        "   host and point your compose project at that folder, then: docker compose down -v",
        "",
        "2. The Postgres volume already existed from an earlier run. The schema is only applied",
        "   the first time the volume is created, so a later schema change does nothing.",
        "   Reset it with: docker compose down -v && docker compose up --build",
        "",
        "Both fixes delete the database volume. That is safe here — this stack holds only demo data.",
      ].join("\n"),
    );
    process.exitCode = 1;
    return;
  }

  const existing = await pool.query("SELECT 1 FROM person LIMIT 1");
  if (existing.rowCount && existing.rowCount > 0) {
    console.log("Database already has people in it — skipping seed.");
    return;
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await seed(client);
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }

  console.log("Seeded demo data. Sign in as any of these at /demo:");
  for (const p of PEOPLE) {
    console.log(`  ${p.displayName.padEnd(16)} ${p.editToken}`);
  }
}

try {
  await main();
} catch (err) {
  console.error("Seed failed:", err);
  process.exitCode = 1;
} finally {
  // The pool is created at module import; without this the process never exits, which
  // deadlocks the compose `service_completed_successfully` dependency.
  await pool.end();
}
