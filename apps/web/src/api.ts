import type {
  FieldRequest,
  FieldType,
  FieldVisibility,
  OwnerCard,
  OwnerField,
  OwnerPerson,
  RecipientCardView,
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
  const res = await fetch("/api/cards", {
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
  const res = await fetch(`/api/cards/${cardId}`, {
    headers: { "x-edit-token": editToken },
  });
  return handle(res);
}

export async function addField(
  cardId: string,
  editToken: string,
  field: NewFieldInput,
): Promise<OwnerField> {
  const res = await fetch(`/api/cards/${cardId}/fields`, {
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
  const res = await fetch(`/api/cards/${cardId}/fields/${fieldId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", "x-edit-token": editToken },
    body: JSON.stringify(patch),
  });
  return handle(res);
}

export async function deleteField(cardId: string, fieldId: string, editToken: string): Promise<void> {
  const res = await fetch(`/api/cards/${cardId}/fields/${fieldId}`, {
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
  const res = await fetch(`/api/cards/${cardId}/share-sessions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-edit-token": editToken },
    body: JSON.stringify({ channel }),
  });
  return handle(res);
}

export async function getShareSession(sessionId: string): Promise<RecipientCardView> {
  const res = await fetch(`/api/share-sessions/${sessionId}`);
  return handle(res);
}

export async function requestField(sessionId: string, fieldId: string): Promise<FieldRequest> {
  const res = await fetch(`/api/share-sessions/${sessionId}/field-requests`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fieldId }),
  });
  return handle(res);
}

export async function listFieldRequests(cardId: string, editToken: string): Promise<FieldRequest[]> {
  const res = await fetch(`/api/cards/${cardId}/field-requests`, {
    headers: { "x-edit-token": editToken },
  });
  return handle(res);
}

export async function respondFieldRequest(
  requestId: string,
  editToken: string,
  approve: boolean,
): Promise<FieldRequest> {
  const res = await fetch(`/api/field-requests/${requestId}/respond`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-edit-token": editToken },
    body: JSON.stringify({ approve }),
  });
  return handle(res);
}
