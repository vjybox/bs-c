import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { buildApp } from "../app.js";
import { pool } from "../db.js";
import { truncateAll } from "../test-helpers.js";
import type { FastifyInstance } from "fastify";

let app: FastifyInstance;

beforeEach(async () => {
  if (!app) app = await buildApp();
  await truncateAll();
});

afterAll(async () => {
  await pool.end();
});

async function createPerson(displayName: string, email?: string) {
  const fields = email
    ? [{ fieldType: "email", label: "Work email", value: email, visibility: "public" }]
    : [];
  const res = await app.inject({
    method: "POST",
    url: "/api/cards",
    payload: { displayName, headline: `${displayName} headline`, fields },
  });
  expect(res.statusCode).toBe(201);
  const body = res.json();
  return { personId: body.person.id, editToken: body.editToken, cardId: body.card.id };
}

/** Saves `subject` into `owner`'s contacts via a real share session, as the UI would. */
async function saveContact(
  owner: { editToken: string },
  subject: { cardId: string; editToken: string },
) {
  const session = await app.inject({
    method: "POST",
    url: `/api/cards/${subject.cardId}/share-sessions`,
    headers: { "x-edit-token": subject.editToken },
    payload: { channel: "link" },
  });
  const res = await app.inject({
    method: "POST",
    url: "/api/contacts",
    headers: { "x-edit-token": owner.editToken },
    payload: { shareSessionId: session.json().sessionId, captureSource: "card_share" },
  });
  expect(res.statusCode).toBe(201);
  return res.json() as { id: string; companyProfileId: string | null };
}

async function patchContact(
  token: string,
  contactId: string,
  body: { companyProfileId?: string | null; reportsToContactId?: string | null },
) {
  return app.inject({
    method: "PATCH",
    url: `/api/contacts/${contactId}`,
    headers: { "x-edit-token": token },
    payload: body,
  });
}

describe("company derivation from a public email domain", () => {
  it("creates a company from the subject's work email and links the contact", async () => {
    const owner = await createPerson("Owner");
    const subject = await createPerson("Devon Park", "devon@northwind.cloud");

    const contact = await saveContact(owner, subject);
    expect(contact.companyProfileId).toBeTruthy();

    const res = await app.inject({
      method: "GET",
      url: "/api/companies/mine",
      headers: { "x-edit-token": owner.editToken },
    });
    const companies = res.json();
    expect(companies).toHaveLength(1);
    expect(companies[0].domain).toBe("northwind.cloud");
    expect(companies[0].name).toBe("Northwind");
    // Derived, not AI — and labelled so the UI can say so.
    expect(companies[0].enrichmentSource).toBe("derived");
    expect(companies[0].contactCount).toBe(1);
  });

  it("does not invent a company from a consumer mailbox domain", async () => {
    const owner = await createPerson("Owner");
    const subject = await createPerson("Personal", "someone@gmail.com");

    const contact = await saveContact(owner, subject);
    expect(contact.companyProfileId).toBeNull();
  });

  it("reuses one global company row for two people at the same domain", async () => {
    const owner = await createPerson("Owner");
    const a = await createPerson("A", "a@acme.test");
    const b = await createPerson("B", "b@acme.test");

    const one = await saveContact(owner, a);
    const two = await saveContact(owner, b);
    expect(one.companyProfileId).toBe(two.companyProfileId);
  });
});

describe("GET /api/companies/:companyId/tree — rulebook 9.3 and 9.4", () => {
  it("shows each owner only their own contacts at a shared company", async () => {
    // The load-bearing test: the company row is global, the people under it are not.
    const alice = await createPerson("Alice");
    const bob = await createPerson("Bob");
    const carol = await createPerson("Carol", "carol@acme.test");
    const dan = await createPerson("Dan", "dan@acme.test");

    const aliceContact = await saveContact(alice, carol);
    const bobContact = await saveContact(bob, dan);
    const companyId = aliceContact.companyProfileId!;
    expect(bobContact.companyProfileId).toBe(companyId);

    const aliceTree = await app.inject({
      method: "GET",
      url: `/api/companies/${companyId}/tree`,
      headers: { "x-edit-token": alice.editToken },
    });
    const bobTree = await app.inject({
      method: "GET",
      url: `/api/companies/${companyId}/tree`,
      headers: { "x-edit-token": bob.editToken },
    });

    expect(aliceTree.json().roots.map((n: { subject: { displayName: string } }) => n.subject.displayName)).toEqual(["Carol"]);
    expect(bobTree.json().roots.map((n: { subject: { displayName: string } }) => n.subject.displayName)).toEqual(["Dan"]);
  });

  it("returns an empty tree for a company where the viewer has captured nobody", async () => {
    const alice = await createPerson("Alice");
    const bob = await createPerson("Bob");
    const carol = await createPerson("Carol", "carol@acme.test");

    const bobContact = await saveContact(bob, carol);

    const res = await app.inject({
      method: "GET",
      url: `/api/companies/${bobContact.companyProfileId}/tree`,
      headers: { "x-edit-token": alice.editToken },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().roots).toEqual([]);
  });

  it("nests reports under their manager", async () => {
    const owner = await createPerson("Owner");
    const boss = await createPerson("Boss", "boss@acme.test");
    const report = await createPerson("Report", "report@acme.test");

    const bossContact = await saveContact(owner, boss);
    const reportContact = await saveContact(owner, report);

    const patched = await patchContact(owner.editToken, reportContact.id, {
      reportsToContactId: bossContact.id,
    });
    expect(patched.statusCode).toBe(200);

    const tree = await app.inject({
      method: "GET",
      url: `/api/companies/${bossContact.companyProfileId}/tree`,
      headers: { "x-edit-token": owner.editToken },
    });
    const roots = tree.json().roots;
    expect(roots).toHaveLength(1);
    expect(roots[0].subject.displayName).toBe("Boss");
    expect(roots[0].reports).toHaveLength(1);
    expect(roots[0].reports[0].subject.displayName).toBe("Report");
  });
});

describe("PATCH /api/contacts/:contactId — reporting-line guards", () => {
  it("rejects a contact reporting to itself", async () => {
    const owner = await createPerson("Owner");
    const subject = await createPerson("Subject", "s@acme.test");
    const contact = await saveContact(owner, subject);

    const res = await patchContact(owner.editToken, contact.id, {
      reportsToContactId: contact.id,
    });
    expect(res.statusCode).toBe(400);
  });

  it("rejects a reporting line that would create a cycle", async () => {
    const owner = await createPerson("Owner");
    const a = await createPerson("A", "a@acme.test");
    const b = await createPerson("B", "b@acme.test");
    const contactA = await saveContact(owner, a);
    const contactB = await saveContact(owner, b);

    expect(
      (await patchContact(owner.editToken, contactB.id, { reportsToContactId: contactA.id }))
        .statusCode,
    ).toBe(200);

    // A reporting to B would close the loop A -> B -> A.
    const res = await patchContact(owner.editToken, contactA.id, {
      reportsToContactId: contactB.id,
    });
    expect(res.statusCode).toBe(400);
    expect(res.json().error).toMatch(/cycle/i);
  });

  it("rejects a manager belonging to a different owner", async () => {
    const alice = await createPerson("Alice");
    const bob = await createPerson("Bob");
    const carol = await createPerson("Carol", "carol@acme.test");
    const dan = await createPerson("Dan", "dan@acme.test");

    const aliceContact = await saveContact(alice, carol);
    const bobContact = await saveContact(bob, dan);

    const res = await patchContact(alice.editToken, aliceContact.id, {
      reportsToContactId: bobContact.id,
    });
    expect(res.statusCode).toBe(400);
  });

  it("rejects a manager at a different company", async () => {
    const owner = await createPerson("Owner");
    const a = await createPerson("A", "a@acme.test");
    const b = await createPerson("B", "b@other.test");
    const contactA = await saveContact(owner, a);
    const contactB = await saveContact(owner, b);

    const res = await patchContact(owner.editToken, contactA.id, {
      reportsToContactId: contactB.id,
    });
    expect(res.statusCode).toBe(400);
  });

  it("returns 403 when the caller does not own the contact", async () => {
    const alice = await createPerson("Alice");
    const bob = await createPerson("Bob");
    const carol = await createPerson("Carol", "carol@acme.test");
    const bobContact = await saveContact(bob, carol);

    const res = await patchContact(alice.editToken, bobContact.id, { companyProfileId: null });
    expect(res.statusCode).toBe(403);
  });
});

describe("rulebook 9.6 — an employer change drops cross-company reporting lines", () => {
  it("clears edges in both directions when a contact moves company", async () => {
    const owner = await createPerson("Owner");
    const boss = await createPerson("Boss", "boss@acme.test");
    const mid = await createPerson("Mid", "mid@acme.test");
    const report = await createPerson("Report", "report@acme.test");

    const bossContact = await saveContact(owner, boss);
    const midContact = await saveContact(owner, mid);
    const reportContact = await saveContact(owner, report);

    await patchContact(owner.editToken, midContact.id, { reportsToContactId: bossContact.id });
    await patchContact(owner.editToken, reportContact.id, { reportsToContactId: midContact.id });

    // Mid leaves for another company.
    const other = await app.inject({
      method: "POST",
      url: "/api/companies",
      headers: { "x-edit-token": owner.editToken },
      payload: { name: "Other Co", domain: "other.test" },
    });
    const otherId = other.json().id;

    const moved = await patchContact(owner.editToken, midContact.id, {
      companyProfileId: otherId,
    });
    expect(moved.statusCode).toBe(200);
    // Mid's own line up to Boss is gone...
    expect(moved.json().reportsToContactId).toBeNull();

    // ...and so is Report's line up to Mid, which would now span two companies.
    const detail = await app.inject({
      method: "GET",
      url: `/api/contacts/${reportContact.id}`,
      headers: { "x-edit-token": owner.editToken },
    });
    expect(detail.json().reportsToContactId).toBeNull();
  });
});

describe("GET /api/companies — global firmographic search", () => {
  it("finds a company created by a different owner, and exposes no person data", async () => {
    const alice = await createPerson("Alice");
    const bob = await createPerson("Bob");
    const carol = await createPerson("Carol", "carol@northwind.cloud");
    await saveContact(bob, carol);

    const res = await app.inject({
      method: "GET",
      url: "/api/companies?q=northwind",
      headers: { "x-edit-token": alice.editToken },
    });
    expect(res.statusCode).toBe(200);
    const found = res.json();
    expect(found).toHaveLength(1);
    expect(found[0].domain).toBe("northwind.cloud");
    // Rulebook 9.2: the directory is firmographic only.
    expect(JSON.stringify(found)).not.toContain("Carol");
  });

  it("requires a token", async () => {
    const res = await app.inject({ method: "GET", url: "/api/companies" });
    expect(res.statusCode).toBe(401);
  });
});
