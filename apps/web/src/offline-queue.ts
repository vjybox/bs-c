/**
 * Durable queue for the writes rulebook §5.6 requires to survive no connectivity:
 * capturing a contact and logging an interaction. Card editing is at-desk work and is
 * deliberately not queued — it fails loudly instead.
 *
 * Stored in IndexedDB rather than memory so a queued capture survives the app being
 * closed on a conference floor, which is exactly when this matters.
 */

const DB_NAME = "digitalIdentity.offline";
const STORE = "pending";
const DB_VERSION = 1;

export interface PendingWrite {
  id?: number;
  url: string;
  method: string;
  body: string;
  editToken: string;
  /** Stable per attempt, so a replay the server already applied can be recognised. */
  requestId: string;
  queuedAt: string;
  label: string;
}

type Listener = (count: number) => void;
const listeners = new Set<Listener>();

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "id", autoIncrement: true });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function tx<T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const t = db.transaction(STORE, mode);
        const req = run(t.objectStore(STORE));
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
        t.oncomplete = () => db.close();
      }),
  );
}

export async function pendingCount(): Promise<number> {
  try {
    return await tx("readonly", (s) => s.count());
  } catch {
    // Private windows and blocked storage both land here; no queue is not a crash.
    return 0;
  }
}

export function onPendingChange(fn: Listener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

async function notify(): Promise<void> {
  const count = await pendingCount();
  for (const fn of listeners) fn(count);
}

export async function enqueue(write: Omit<PendingWrite, "id" | "queuedAt">): Promise<void> {
  await tx("readwrite", (s) => s.add({ ...write, queuedAt: new Date().toISOString() }));
  await notify();
}

export async function listPending(): Promise<PendingWrite[]> {
  try {
    return await tx<PendingWrite[]>("readonly", (s) => s.getAll() as IDBRequest<PendingWrite[]>);
  } catch {
    return [];
  }
}

let flushing = false;

/**
 * Replays queued writes oldest-first. Stops at the first network failure so ordering is
 * preserved — a later capture must not land before an earlier one.
 *
 * A 4xx means the server rejected the request on its merits; replaying it forever would
 * wedge the queue, so it is dropped. Only network errors and 5xx are worth retrying.
 */
export async function flushQueue(): Promise<{ sent: number; dropped: number }> {
  if (flushing || !navigator.onLine) return { sent: 0, dropped: 0 };
  flushing = true;
  let sent = 0;
  let dropped = 0;

  try {
    for (const item of await listPending()) {
      let response: Response;
      try {
        response = await fetch(item.url, {
          method: item.method,
          headers: {
            "Content-Type": "application/json",
            "x-edit-token": item.editToken,
            "x-request-id": item.requestId,
          },
          body: item.body,
        });
      } catch {
        break; // Still offline. Leave this and everything after it queued.
      }

      if (response.status >= 500) break;
      if (!response.ok) dropped += 1;
      else sent += 1;

      if (item.id !== undefined) {
        await tx("readwrite", (s) => s.delete(item.id!));
      }
    }
  } finally {
    flushing = false;
    await notify();
  }

  return { sent, dropped };
}

/** Flush whenever the browser says we are back, and once at startup for a queue left over. */
export function startQueueSync(): void {
  window.addEventListener("online", () => {
    void flushQueue();
  });
  if (navigator.onLine) void flushQueue();
}
