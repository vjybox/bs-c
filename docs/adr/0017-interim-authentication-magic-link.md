# ADR-0017: Interim Authentication — Magic Link and Session Cookie

**Status**: Accepted (implementation pending, Phase 1 Slice 2) · **Date**: 2026-09-29 · **Amends**: [ADR-0008](0008-identity-and-auth-strategy.md) · **Depends on**: [ADR-0018](0018-wedge-first-sequencing.md)

## Context

[ADR-0008](0008-identity-and-auth-strategy.md) decided to buy a CIAM platform behind an internal `AuthProvider` abstraction. The code has never had real authentication: a per-person `edit_token` in `localStorage`, sent as `x-edit-token`, stands in for it. That is acceptable for a demo and unacceptable for the first real users ([ADR-0018](0018-wedge-first-sequencing.md): about fifteen people at one event).

One platform fact decides the shape. **iOS Safari deletes script-written storage — `localStorage` and IndexedDB — after seven days without a visit**, unless the web app is installed to the home screen. The first test measures whether people come back within fourteen days; any credential held in script storage logs most iPhone users out exactly then.

## Decision

Passwordless **magic-link email** sign-in, issuing an **HttpOnly, Secure, SameSite=Lax session cookie** scoped to `/api`. It is built behind the `AuthProvider` interface ADR-0008 already requires, so swapping to a bought CIAM later replaces one implementation, not the application.

- `POST /api/v1/auth/login-link` always answers `202` (no account enumeration) and is rate-limited.
- The link's token is single-use, short-lived, and stored hashed.
- `POST /api/v1/cards` works immediately on a provisional session; email is needed only to sign in on a new device. The two-minute card ([rulebook](../01-architecture/09-experience-and-interaction-rulebook.md) §3) is not lengthened.
- Non-GET requests require an `x-request-id` header, as a CSRF defence alongside SameSite.
- New tables `account` and `auth_session` are needed with a bought CIAM too; they are not throwaway work.

## Alternatives Considered

| Option | Advantages | Disadvantages |
|---|---|---|
| **Buy CIAM now** (Auth0, Clerk, WorkOS — ADR-0008 as written) | Mature; MFA and SSO ready; no security code of our own | Vendor setup, pricing and SDK before a single user; enterprise features the wedge does not need |
| **Harden `edit_token`** (expiry, rotation) | Smallest change | Still script storage: fails the iOS seven-day rule |
| **Passkeys only** | Phishing-resistant; no email dependency | No email-free recovery; slows first-card creation; uneven support on older Android |
| **Magic link + cookie** (chosen) | Survives the iOS rule; no password to leak; small | Depends on email delivery; the link can be forwarded; we own the session code |

## Consequences

- Positive: the credential leaves script storage, which also removes the offline queue's stored-token risk (tech-debt TD-03, TD-05). Sign-out can reliably clear caches because the server knows the session.
- Negative: we own security-sensitive code (token hashing, session revocation, rate limiting) until the swap. Email deliverability — SPF/DKIM on a real domain — becomes a launch dependency.
- **Security:** tokens hashed at rest; single use; sessions revocable server-side; cookie never readable by script.
- **Privacy:** email is collected only for sign-in, not for marketing. The login endpoint never reveals whether an address has an account.
- **Compliance:** email is personal data under GDPR; deleting an account deletes it (Phase 1 Slice 3 operator script).
- **Complexity:** medium — roughly four routes, two tables, one provider interface, and a log-only email sender for tests.

## Extension points

`AuthProvider` (identify, issue session, revoke) is the seam. Passkeys, OAuth social sign-in and enterprise SSO become additional providers. A bought CIAM replaces the whole implementation.

## Revisit when

At 1,000 accounts, the first enterprise request for SSO/SCIM, or the first security review that finds our session code insufficient — whichever comes first. At that point ADR-0008 applies as written.
