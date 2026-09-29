// Stand-in for api.ts used ONLY by the static demo build (`vite build --mode demo`).
// Vite swaps this module in via the plugin in vite.config.ts; nothing imports it directly.
//
// Reads replay responses captured verbatim from the real API running against a seeded
// database (see demo-fixtures.json), so the data shown is genuine backend output rather
// than a re-derivation of it. Writes are simulated in memory and vanish on reload.
import fixturesJson from "./demo-fixtures.json";
import { newId } from "./ids";
import type {
  Company,
  Contact,
  ContactDetail,
  FieldRequest,
  MyCompany,
  OrgTree,
  OrgTreeNode,
  FieldType,
  FieldVisibility,
  Interaction,
  InteractionChannel,
  OwnerCard,
  OwnerField,
  OwnerPerson,
  RecipientCardView,
  ReconnectionSuggestion,
} from "./types";

const STORAGE_CARD_ID = "digitalIdentity.cardId";
const STORAGE_EDIT_TOKEN = "digitalIdentity.editToken";

export function getStoredAuth(): { cardId: string; editToken: string } | null {
  const cardId = localStorage.getItem(STORAGE_CARD_ID);
  const editToken = localStorage.getItem(STORAGE_EDIT_TOKEN);
  if (!cardId || !editToken) return null;
  return { cardId, editToken };
}

export function setStoredAuth(cardId: string, editToken: string) {
  localStorage.setItem(STORAGE_CARD_ID, cardId);
  localStorage.setItem(STORAGE_EDIT_TOKEN, editToken);
}

export function clearStoredAuth() {
  localStorage.removeItem(STORAGE_CARD_ID);
  localStorage.removeItem(STORAGE_EDIT_TOKEN);
}

export interface NewFieldInput {
  fieldType: FieldType;
  label: string;
  value: string;
  visibility: FieldVisibility;
}

export interface DemoPersona {
  displayName: string;
  headline: string | null;
  cardId: string;
  editToken: string;
}

interface PersonaState {
  ownerCard: { person: OwnerPerson; card: OwnerCard };
  contacts: Contact[];
  contactDetails: Record<string, ContactDetail>;
  fieldRequests: FieldRequest[];
  reconnectionSuggestions: ReconnectionSuggestion[];
  companies?: MyCompany[];
  trees?: Record<string, OrgTree>;
  shareSessionId: string;
  shareExpiresAt: string;
}

interface Fixtures {
  capturedAt: string;
  personas: DemoPersona[];
  byToken: Record<string, PersonaState>;
  shareSessions: Record<string, RecipientCardView>;
}

// Mutable working copy — the demo is a sandbox, and reloading resets it.
const state: Fixtures = structuredClone(fixturesJson) as unknown as Fixtures;

function uid(): string {
  return newId();
}

/**
 * Every read returns a detached copy, because a real HTTP boundary always does — the caller
 * gets parsed JSON, never a live handle on server state. Skipping this leaks the internal
 * store into component state, so a mutation here and the caller's own optimistic update both
 * land on the same array and the change appears twice.
 */
function detach<T>(value: T): T {
  return structuredClone(value);
}

function persona(editToken: string): PersonaState {
  const p = state.byToken[editToken];
  if (!p) throw new Error("Unknown edit token — pick a persona on the demo sign-in screen.");
  return p;
}

export async function getDemoPersonas(): Promise<DemoPersona[] | null> {
  return detach(state.personas);
}

export async function createCard(
  displayName: string,
  headline: string,
  fields: NewFieldInput[],
): Promise<{ person: OwnerPerson; card: OwnerCard; editToken: string }> {
  const editToken = `demo-local-${uid()}`;
  const person: OwnerPerson = { id: uid(), displayName, headline: headline || null };
  const card: OwnerCard = {
    id: uid(),
    label: "Default",
    isDefault: true,
    status: "active",
    fields: fields.map((f, i) => ({ id: uid(), ...f, displayOrder: i })),
  };
  state.byToken[editToken] = {
    ownerCard: { person, card },
    contacts: [],
    contactDetails: {},
    fieldRequests: [],
    reconnectionSuggestions: [],
    shareSessionId: uid(),
    shareExpiresAt: new Date(Date.now() + 7 * 86_400_000).toISOString(),
  };
  state.personas = [...state.personas, { displayName, headline: headline || null, cardId: card.id, editToken }];
  return detach({ person, card, editToken });
}

export async function getOwnerCard(
  _cardId: string,
  editToken: string,
): Promise<{ person: OwnerPerson; card: OwnerCard }> {
  return detach(persona(editToken).ownerCard);
}

export async function addField(
  _cardId: string,
  editToken: string,
  field: NewFieldInput,
): Promise<OwnerField> {
  const { card } = persona(editToken).ownerCard;
  const created: OwnerField = { id: uid(), ...field, displayOrder: card.fields.length };
  card.fields.push(created);
  return detach(created);
}

export async function updateField(
  _cardId: string,
  fieldId: string,
  editToken: string,
  patch: Partial<NewFieldInput & { displayOrder: number }>,
): Promise<OwnerField> {
  const { card } = persona(editToken).ownerCard;
  const field = card.fields.find((f) => f.id === fieldId);
  if (!field) throw new Error("Field not found");
  Object.assign(field, patch);
  return detach(field);
}

export async function deleteField(
  _cardId: string,
  fieldId: string,
  editToken: string,
): Promise<void> {
  const { card } = persona(editToken).ownerCard;
  card.fields = card.fields.filter((f) => f.id !== fieldId);
}

export async function createShareSession(
  _cardId: string,
  editToken: string,
  _channel: "link" | "qr",
): Promise<{ sessionId: string; url: string; expiresAt: string }> {
  const p = persona(editToken);
  // The demo build uses HashRouter, so the shareable link has to carry the hash form.
  const url = `${window.location.origin}${window.location.pathname}#/c/${p.shareSessionId}`;
  return { sessionId: p.shareSessionId, url, expiresAt: p.shareExpiresAt };
}

export async function getShareSession(sessionId: string): Promise<RecipientCardView> {
  const view = state.shareSessions[sessionId];
  if (!view) throw new Error("Share session not found");
  return detach(view);
}

export async function requestField(sessionId: string, fieldId: string): Promise<FieldRequest> {
  const view = state.shareSessions[sessionId];
  const label = view?.requestableFields.find((f) => f.id === fieldId)?.label ?? "Field";
  const request: FieldRequest = {
    id: uid(),
    fieldId,
    status: "pending",
    createdAt: new Date().toISOString(),
    resolvedAt: null,
    fieldLabel: label,
    shareSessionId: sessionId,
  };
  // Surface it on whichever persona owns this session, so it shows up under Field requests.
  for (const p of Object.values(state.byToken)) {
    if (p.shareSessionId === sessionId) {
      p.fieldRequests = [request, ...p.fieldRequests];
      break;
    }
  }
  return detach(request);
}

export async function listFieldRequests(
  _cardId: string,
  editToken: string,
): Promise<FieldRequest[]> {
  return detach(persona(editToken).fieldRequests);
}

export async function respondFieldRequest(
  requestId: string,
  editToken: string,
  approve: boolean,
): Promise<FieldRequest> {
  const p = persona(editToken);
  const request = p.fieldRequests.find((r) => r.id === requestId);
  if (!request) throw new Error("Request not found");
  request.status = approve ? "approved" : "denied";
  request.resolvedAt = new Date().toISOString();

  // Approving widens that session's visible field set, matching the real respond route.
  if (approve) {
    const view = state.shareSessions[request.shareSessionId];
    const field = p.ownerCard.card.fields.find((f) => f.id === request.fieldId);
    if (view && field && !view.fields.some((f) => f.id === field.id)) {
      view.fields = [
        ...view.fields,
        {
          id: field.id,
          fieldType: field.fieldType,
          label: field.label,
          value: field.value,
          displayOrder: field.displayOrder,
        },
      ];
      view.requestableFields = view.requestableFields.filter((f) => f.id !== field.id);
    }
  }
  return detach(request);
}

export async function saveContact(
  shareSessionId: string,
  editToken: string,
  captureContext?: string,
): Promise<{ id: string }> {
  const p = persona(editToken);
  const view = state.shareSessions[shareSessionId];
  const id = uid();
  const connectionId = uid();
  const now = new Date().toISOString();
  const contact: Contact = {
    id,
    subject: view ? { displayName: view.person.displayName, headline: view.person.headline } : null,
    captureSource: "card_share",
    captureContext: captureContext ?? null,
    company: null,
    reportsToContactId: null,
    connectionId,
    connectionStrength: 0.25,
    lastInteractionAt: now,
    createdAt: now,
  };
  p.contacts = [contact, ...p.contacts];
  p.contactDetails[id] = {
    ...contact,
    interactions: [
      {
        id: uid(),
        channel: "note",
        summary: "Contact saved via card share",
        occurredAt: now,
        loggedByPersonId: p.ownerCard.person.id,
      },
    ],
  };
  return { id };
}

export async function listContacts(editToken: string): Promise<Contact[]> {
  return detach(persona(editToken).contacts);
}

export async function getContact(contactId: string, editToken: string): Promise<ContactDetail> {
  const detail = persona(editToken).contactDetails[contactId];
  if (!detail) throw new Error("Contact not found");
  return detach(detail);
}

/** Same shape as the server's: LEAST(1.0, 0.1 + interactions in the last 90 days * 0.15). */
function strengthFrom(interactions: Interaction[]): number {
  const cutoff = Date.now() - 90 * 86_400_000;
  const recent = interactions.filter((i) => new Date(i.occurredAt).getTime() > cutoff).length;
  return Math.min(1, 0.1 + recent * 0.15);
}

export async function logInteraction(
  contactId: string,
  editToken: string,
  channel: InteractionChannel,
  summary?: string,
  occurredAt?: string,
): Promise<{
  id: string;
  channel: string;
  summary: string | null;
  occurredAt: string;
  loggedByPersonId: string;
}> {
  const p = persona(editToken);
  const detail = p.contactDetails[contactId];
  if (!detail) throw new Error("Contact not found");

  const interaction: Interaction = {
    id: uid(),
    channel,
    summary: summary ?? null,
    occurredAt: occurredAt ?? new Date().toISOString(),
    loggedByPersonId: p.ownerCard.person.id,
  };
  detail.interactions = [interaction, ...detail.interactions];
  detail.lastInteractionAt = interaction.occurredAt;
  detail.connectionStrength = strengthFrom(detail.interactions);

  const listed = p.contacts.find((c) => c.id === detail.id);
  if (listed) {
    listed.lastInteractionAt = detail.lastInteractionAt;
    listed.connectionStrength = detail.connectionStrength;
  }
  // A logged interaction is exactly what stops a relationship being "gone quiet".
  p.reconnectionSuggestions = p.reconnectionSuggestions.filter((s) => s.contactId !== detail.id);

  return { ...interaction, channel: interaction.channel as string };
}

export async function getReconnectionSuggestions(
  editToken: string,
): Promise<ReconnectionSuggestion[]> {
  return detach(persona(editToken).reconnectionSuggestions);
}

export async function listMyCompanies(editToken: string): Promise<MyCompany[]> {
  return detach(persona(editToken).companies ?? []);
}

export async function searchCompanies(_editToken: string, q: string): Promise<Company[]> {
  // The directory is global, so search spans every persona's companies, not just yours.
  const all = new Map<string, Company>();
  for (const p of Object.values(state.byToken)) {
    for (const c of p.companies ?? []) all.set(c.id, c);
  }
  const needle = q.trim().toLowerCase();
  const matches = [...all.values()].filter(
    (c) => !needle || c.name.toLowerCase().includes(needle) || (c.domain ?? "").includes(needle),
  );
  return detach(matches.slice(0, 20));
}

export async function getOrgTree(companyId: string, editToken: string): Promise<OrgTree> {
  const tree = persona(editToken).trees?.[companyId];
  if (tree) return detach(tree);

  // No captured contacts at this company is a valid answer, not an error (rulebook 9.4).
  const company = (persona(editToken).companies ?? []).find((c) => c.id === companyId);
  if (!company) throw new Error("Company not found");
  return detach({ company, roots: [] });
}

export async function updateContact(
  contactId: string,
  editToken: string,
  patch: { companyProfileId?: string | null; reportsToContactId?: string | null },
): Promise<{ id: string; companyProfileId: string | null; reportsToContactId: string | null }> {
  const p = persona(editToken);
  const detail = p.contactDetails[contactId];
  if (!detail) throw new Error("Contact not found");

  if (patch.reportsToContactId !== undefined) {
    if (patch.reportsToContactId === contactId) {
      throw new Error("A contact cannot report to itself");
    }
    detail.reportsToContactId = patch.reportsToContactId;
    const listed = p.contacts.find((c) => c.id === contactId);
    if (listed) listed.reportsToContactId = patch.reportsToContactId;
    rebuildTrees(p);
  }

  return {
    id: contactId,
    companyProfileId: detail.company?.id ?? null,
    reportsToContactId: detail.reportsToContactId,
  };
}

/** Recomputes every tree from the persona's own contacts after a reporting line changes. */
function rebuildTrees(p: PersonaState): void {
  if (!p.trees) return;
  for (const [companyId, tree] of Object.entries(p.trees)) {
    const members = p.contacts.filter((c) => c.company?.id === companyId);
    const nodes = new Map<string, OrgTreeNode>(
      members.map((c) => [
        c.id,
        {
          contactId: c.id,
          subject: c.subject,
          captureContext: c.captureContext,
          reports: [] as OrgTreeNode[],
        },
      ]),
    );
    const roots: OrgTreeNode[] = [];
    for (const c of members) {
      const node = nodes.get(c.id)!;
      const parent = c.reportsToContactId ? nodes.get(c.reportsToContactId) : undefined;
      if (parent) parent.reports.push(node);
      else roots.push(node);
    }
    tree.roots = roots;
  }
}
