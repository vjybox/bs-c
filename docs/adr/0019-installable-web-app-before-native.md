# ADR-0019: Installable Web App Before Native Apps

**Status**: Accepted · **Date**: 2026-09-29 · **Amends**: [ADR-0009](0009-mobile-client-architecture.md) (defers it) · **Affects**: [ADR-0015](0015-web-client-architecture.md)

## Context

[ADR-0009](0009-mobile-client-architecture.md) chose React Native for iOS and Android. [ADR-0015](0015-web-client-architecture.md) designed the web client to share its API client, domain models and state logic with that React Native codebase. No React Native code exists. What exists is a React + Vite web app that installs to the home screen and captures offline: a hand-written service worker, an IndexedDB write queue, and a public-fields-only vCard QR code that works with no signal.

The wedge ([ADR-0018](0018-wedge-first-sequencing.md)) needs three things:

- the app on attendees' phones within a minute;
- capture with no signal;
- share to someone who has no app.

App-store review, TestFlight and two builds are the slowest path to all three.

## Decision

**Ship the installable web app (PWA) as the only client until a trigger below fires.** Keep ADR-0015's layering inside the web app — API client, domain types and validation separated from components — so a React Native client can later reuse it as ADR-0015 intended. ADR-0009 remains the target for native; it is deferred, not rejected.

## Alternatives Considered

| Option | Advantages | Disadvantages |
|---|---|---|
| **React Native now** (ADR-0009) | NFC, Wallet passes, background sync, store presence | Store review and two builds before the first user; duplicates work the web app already does |
| **Capacitor/Tauri wrapper around the web app** | Store presence and native APIs with one codebase | Adds build tooling now for features the wedge does not use |
| **PWA only** (chosen) | Zero install friction via a link or QR; one codebase; offline already works | No NFC tap-to-share on iOS; no Wallet pass; iOS limits background sync and evicts storage after seven days unless installed (why [ADR-0017](0017-interim-authentication-magic-link.md) uses cookies) |

## Consequences

- Positive: the fastest route to real users; one deployable.
- Negative: NFC, Wallet passes and push notifications on older iOS are unavailable. Competitors that sell NFC hardware have a feature we lack.
- **Performance:** the bundle is about 70 kB gzipped. Assets are served cache-first, so a repeat load is instant offline.
- **Security:** the service worker caches API responses. Until [ADR-0017](0017-interim-authentication-magic-link.md) lands, that cache is keyed by URL and can cross users on a shared device (tech-debt TD-04).

## Revisit when

Any one of these fires:

1. Testers ask for NFC or Wallet by name, unprompted.
2. Push-notification reach on iOS measurably limits the reconnection nudge.
3. Enterprise buyers require a store listing or MDM distribution.

Start with a Capacitor wrapper if only native APIs are needed. Start React Native per ADR-0009 if native UX is.
