// Hand-rolled service worker. Deliberately no build plugin: runtime caching needs no
// precache manifest, so it survives asset-hash changes without extra tooling.
//
// Registered only by the normal build — never by the static demo, which runs on a host
// that does not support service workers.

const SHELL_CACHE = "shell-v1";
const API_CACHE = "api-v1";

// The app shell. Hashed assets are added to the cache as they are requested.
const SHELL_URLS = ["/", "/index.html"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then((cache) => cache.addAll(SHELL_URLS)).then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((k) => k !== SHELL_CACHE && k !== API_CACHE).map((k) => caches.delete(k)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

/**
 * Network-first for API reads: fresh whenever possible, cached when not. A served-from-cache
 * response is tagged so the UI can show the staleness marker rulebook §5.6 requires.
 */
async function apiRead(request) {
  const cache = await caches.open(API_CACHE);
  try {
    const fresh = await fetch(request);
    if (fresh.ok) cache.put(request, fresh.clone());
    return fresh;
  } catch {
    const cached = await cache.match(request);
    if (!cached) throw new Error("offline and not cached");
    const body = await cached.blob();
    const headers = new Headers(cached.headers);
    headers.set("x-from-cache", "1");
    return new Response(body, { status: 200, headers });
  }
}

/** Cache-first for static assets; they are content-hashed, so a hit is always correct. */
async function asset(request) {
  const cache = await caches.open(SHELL_CACHE);
  const cached = await cache.match(request);
  if (cached) return cached;
  const fresh = await fetch(request);
  if (fresh.ok) cache.put(request, fresh.clone());
  return fresh;
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return; // Writes are the offline queue's job, not the cache's.

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (url.pathname.startsWith("/api/")) {
    event.respondWith(apiRead(request));
    return;
  }

  // A navigation with no network falls back to the cached shell so the SPA still boots.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(() => caches.match("/index.html").then((r) => r ?? Response.error())),
    );
    return;
  }

  event.respondWith(asset(request));
});
