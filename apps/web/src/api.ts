import type {
  Company,
  Contact,
  ContactDetail,
  FieldRequest,
  MyCompany,
  OrgTree,
  FieldType,
  FieldVisibility,
  InteractionChannel,
  OwnerCard,
  OwnerField,
  OwnerPerson,
  RecipientCardView,
  ReconnectionSuggestion,
} from "./types";

import { enqueue } from "./offline-queue";

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

/**
 * Posts, or queues the write if there is no network and replays it later.
 *
 * Rulebook §4.3: a journey must queue the user's intent rather than refuse the action.
 * The request id doubles as the new row's id: the server inserts it idempotently, so a
 * replay after a lost response creates nothing twice, and the optimistic result already
 * carries the real id — a note can be queued against a contact that has not synced yet,
 * because the queue replays oldest first. Only used for the writes §5.6 names as
 * offline-required — everything else still fails loudly.
 */
async function postOrQueue<T>(
  url: string,
  editToken: string,
  body: (requestId: string) => unknown,
  optimistic: (requestId: string) => T,
  label: string,
): Promise<T> {
  const requestId = crypto.randomUUID();
  const payload = JSON.stringify(body(requestId));

  const queueIt = async () => {
    await enqueue({ url, method: "POST", body: payload, editToken, requestId, label });
    return optimistic(requestId);
  };

  if (!navigator.onLine) return queueIt();

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-edit-token": editToken,
        "x-request-id": requestId,
      },
      body: payload,
    });
    // A 5xx is the server being unwell, not the request being wrong — worth retrying.
    if (res.status >= 500) return queueIt();
    return handle<T>(res);
  } catch {
    // Fetch throws on a dropped connection even when the browser still thinks it is online.
    return queueIt();
  }
}

async function handle<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(body.error ?? `Request failed with ${res.status}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export interface NewFieldInput {
  fieldType: FieldType;
  label: string;
  value: string;
  visibility: FieldVisibility;
}

export async function createCard(
  displayName: string,
  headline: string,
  fields: NewFieldInput[],
): Promise<{ person: OwnerPerson; card: OwnerCard; editToken: string }> {
  const res = await fetch("/api/v1/cards", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ displayName, headline, fields }),
  });
  return handle(res);
}

export async function getOwnerCard(
  cardId: string,
  editToken: string,
): Promise<{ person: OwnerPerson; card: OwnerCard }> {
  const res = await fetch(`/api/v1/cards/${cardId}`, {
    headers: { "x-edit-token": editToken },
  });
  return handle(res);
}

export async function addField(
  cardId: string,
  editToken: string,
  field: NewFieldInput,
): Promise<OwnerField> {
  const res = await fetch(`/api/v1/cards/${cardId}/fields`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-edit-token": editToken },
    body: JSON.stringify(field),
  });
  return handle(res);
}

export async function updateField(
  cardId: string,
  fieldId: string,
  editToken: string,
  patch: Partial<NewFieldInput & { displayOrder: number }>,
): Promise<OwnerField> {
  const res = await fetch(`/api/v1/cards/${cardId}/fields/${fieldId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", "x-edit-token": editToken },
    body: JSON.stringify(patch),
  });
  return handle(res);
}

export async function deleteField(cardId: string, fieldId: string, editToken: string): Promise<void> {
  const res = await fetch(`/api/v1/cards/${cardId}/fields/${fieldId}`, {
    method: "DELETE",
    headers: { "x-edit-token": editToken },
  });
  return handle(res);
}

export async function createShareSession(
  cardId: string,
  editToken: string,
  channel: "link" | "qr",
): Promise<{ sessionId: string; url: string; expiresAt: string }> {
  const res = await fetch(`/api/v1/cards/${cardId}/share-sessions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-edit-token": editToken },
    body: JSON.stringify({ channel }),
  });
  return handle(res);
}

export async function getShareSession(sessionId: string): Promise<RecipientCardView> {
  const res = await fetch(`/api/v1/share-sessions/${sessionId}`);
  return handle(res);
}

export async function requestField(sessionId: string, fieldId: string): Promise<FieldRequest> {
  const res = await fetch(`/api/v1/share-sessions/${sessionId}/field-requests`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fieldId }),
  });
  return handle(res);
}

export async function listFieldRequests(cardId: string, editToken: string): Promise<FieldRequest[]> {
  const res = await fetch(`/api/v1/cards/${cardId}/field-requests`, {
    headers: { "x-edit-token": editToken },
  });
  return handle(res);
}

export async function respondFieldRequest(
  requestId: string,
  editToken: string,
  approve: boolean,
): Promise<FieldRequest> {
  const res = await fetch(`/api/v1/field-requests/${requestId}/respond`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-edit-token": editToken },
    body: JSON.stringify({ approve }),
  });
  return handle(res);
}

export async function saveContact(
  shareSessionId: string,
  editToken: string,
  captureContext?: string,
): Promise<{ id: string }> {
  return postOrQueue(
    "/api/v1/contacts",
    editToken,
    (id) => ({ id, shareSessionId, captureSource: "card_share", captureContext }),
    (id) => ({ id }),
    "Save contact",
  );
}

export async function listContacts(editToken: string): Promise<Contact[]> {
  const res = await fetch("/api/v1/contacts", { headers: { "x-edit-token": editToken } });
  return handle(res);
}

export async function getContact(contactId: string, editToken: string): Promise<ContactDetail> {
  const res = await fetch(`/api/v1/contacts/${contactId}`, {
    headers: { "x-edit-token": editToken },
  });
  return handle(res);
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
  const when = occurredAt ?? new Date().toISOString();
  return postOrQueue(
    `/api/v1/contacts/${contactId}/interactions`,
    editToken,
    (id) => ({ id, channel, summary, occurredAt: when }),
    (id) => ({
      id,
      channel,
      summary: summary ?? null,
      occurredAt: when,
      loggedByPersonId: "",
    }),
    "Log interaction",
  );
}

export async function listMyCompanies(editToken: string): Promise<MyCompany[]> {
  const res = await fetch("/api/v1/companies/mine", { headers: { "x-edit-token": editToken } });
  return handle(res);
}

export async function searchCompanies(editToken: string, q: string): Promise<Company[]> {
  const res = await fetch(`/api/v1/companies?q=${encodeURIComponent(q)}`, {
    headers: { "x-edit-token": editToken },
  });
  return handle(res);
}

export async function getOrgTree(companyId: string, editToken: string): Promise<OrgTree> {
  const res = await fetch(`/api/v1/companies/${companyId}/tree`, {
    headers: { "x-edit-token": editToken },
  });
  return handle(res);
}

export async function updateContact(
  contactId: string,
  editToken: string,
  patch: { companyProfileId?: string | null; reportsToContactId?: string | null },
): Promise<{ id: string; companyProfileId: string | null; reportsToContactId: string | null }> {
  const res = await fetch(`/api/v1/contacts/${contactId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", "x-edit-token": editToken },
    body: JSON.stringify(patch),
  });
  return handle(res);
}

export interface DemoPersona {
  displayName: string;
  headline: string | null;
  cardId: string;
  editToken: string;
}

/** Returns null when demo mode is off — the route is not registered, so it 404s. */
export async function getDemoPersonas(): Promise<DemoPersona[] | null> {
  const res = await fetch("/api/v1/demo/personas");
  if (res.status === 404) return null;
  return handle(res);
}

export async function getReconnectionSuggestions(
  editToken: string,
): Promise<ReconnectionSuggestion[]> {
  const res = await fetch("/api/v1/contacts/reconnection-suggestions", {
    headers: { "x-edit-token": editToken },
  });
  return handle(res);
}
