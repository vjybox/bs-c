# Experience & Interaction Rulebook

> Status: v0.2 · Owner: Product/Architecture · Last updated: 2026-09-27 · Formalized in [ADR-0013](../adr/0013-event-as-first-class-primitive.md), [ADR-0014](../adr/0014-desktop-strategy-responsive-web.md), [ADR-0015](../adr/0015-web-client-architecture.md), [ADR-0016](../adr/0016-public-company-directory-closed-people-graph.md)
> Scope: the cross-cutting product rules every module applies — who we build for, how much friction a flow may cost, which surface a workflow belongs on, how sharing and discovery behave, and where the line between public and private data falls. Mechanism lives in [`05-security-privacy-compliance.md`](05-security-privacy-compliance.md) and [`01-data-architecture.md`](01-data-architecture.md); this document states the rules those mechanisms must deliver.

## 1. Scope, Authority, and How to Use This Rulebook

This corpus was strong on what each module does internally and nearly silent on the rules cutting across all of them. Interaction cost, surface placement, and the public/private line were asserted in passing inside individual module docs — a latency figure here, a "low friction" aside there — and so could not be checked, cited, or disagreed with. This document collects them, numbers them, and gives a reviewer something a design can actually fail.

**Rule words.** **MUST** and **MUST NOT** are binding: a design violating one does not ship without an ADR that changes the rule for every module at once. **SHOULD** is a strong default — departing from it requires a stated reason recorded in the module doc, not permission.

**Precedence**, in order:

1. This document **outranks module docs** on interaction, surface, and visibility rules. A module doc applies these rules; it does not redefine them — extending the convention in [`README.md`](../README.md) §Conventions that an architecture doc wins over a module doc.
2. On a conflict of technical fact with another `01-architecture/` document, **that document wins**. [`05-security-privacy-compliance.md`](05-security-privacy-compliance.md) remains the source of truth for data classification, authorization, and consent; this rulebook states the user-visible rules its mechanisms must deliver, never the mechanisms themselves.
3. Where a rule restates a decision, **the ADR is the durable record** and the rule is its operational form.

**These rules are forward-looking.** They apply to new work and to any section of an existing document being revised. v0.1 content predating them is not retroactively non-compliant and no module is blocked pending an audit; that audit is tracked in [`TODO.md`](../TODO.md). Two gaps are known and accepted rather than hidden: every module doc's §11 is still titled "Mobile Considerations" (§5.7), and no documented flow has been measured against §3's budgets.

**Using it in review.** §11 maps each class of rule to the artifact where compliance is visible. A design review citing no rule number from this document has not used it.

## 2. Who We Build For: The Time-Scarce Professional

**Tenet: every persona is interrupt-driven; attention, not money, is the scarce resource.**

The five personas in [`00-vision/01-personas-and-jtbd.md`](../00-vision/01-personas-and-jtbd.md) describe *who* — they do not describe the condition all five share. Mara is between client calls, Devon is on a conference floor with a badge scanner in one hand, Priya is mid-rollout, Yusuf is between interviews, Lena is covering for someone who left. This chapter adds that missing dimension; it does not add a persona.

- **2.1** Every module doc MUST name at least one of the five personas as the primary user of its main flow and MUST state that persona's **time budget** for the module's primary action, as a number of seconds or taps — not an adjective. "All professionals" is not a persona and fails this rule, as does a budget of "fast."
- **2.2** A feature proposal MUST state what it removes, defers, or collapses — not only what it adds. A proposal whose "removes" line is empty is incomplete and MUST be returned to its author before review, because the aggregate cost of a corpus of purely additive proposals is a product no persona has time to use.
- **2.3** A flow's first-run cost MUST NOT exceed the value it returns inside the same session. Any flow requiring more than 120 seconds of setup before producing its first usable output MUST be skippable, resumable across sessions, or deferred behind a later prompt.
- **2.4** Setup tolerance is persona-scaled and a design MUST declare which scale it assumes: Priya's and Devon's workflows are org-paid and tolerate multi-step configuration (SSO/SCIM provisioning, pipeline definition); Mara and Yusuf pay in their own time and abandon instead of finishing. A flow on Mara's path MUST NOT inherit a Priya-tier setup sequence for consistency's sake — this is the sharpest live tension in the rulebook, and the individual-first side wins it by default (see [`00-vision/00-product-philosophy.md`](../00-vision/00-product-philosophy.md) §4, "Individual-first, enterprise-ready").
- **2.5** No core flow may assume desk conditions — two free hands, a physical keyboard, or an uninterrupted stretch longer than 30 seconds — unless the design names the persona and the context in which those conditions actually hold.
- **2.6** A design MUST NOT justify an added step by appealing to onboarding copy, a tooltip, a coach mark, or user education. If a step needs explaining in the flow itself, the step is the defect, not the explanation.

## 3. The Friction Budget

**Tenet: every core action has a published tap-and-second budget, and exceeding it is a design defect, not a polish item.**

**The figures in this chapter are design targets, not measurements.** No flow in this platform has been instrumented against real users; these are chosen commitments that give a reviewer something to fail a design against, and they carry the same "illustrative until measured" status as the tier targets in [`06-scalability-strategy.md`](06-scalability-strategy.md) §5. They are to be replaced by observed data — not quietly relaxed when a design misses them.

| Action | Budget | Measured from |
|---|---|---|
| Share a `DigitalCard` in person (NFC/QR) | ≤ 2 taps | cold app open |
| Render a card in a recipient's hands | p99 < 200 ms | request received |
| Create a first usable `DigitalCard` | ≤ 120 s | account creation |
| Save a `Contact` from a received card | 1 tap, plus ≤ 1 optional context screen | recipient view |
| Log an `Interaction` on a known `Contact` | ≤ 3 taps | app root surface |

- **3.1** Card render is the platform's only budget with another human watching, and it is therefore non-negotiable: any design adding a blocking network round-trip, a font load, or an image fetch to the recipient-view critical path MUST be rejected. [`identity-card-core.md`](../02-modules/identity-card-core/identity-card-core.md) §4 is the origin of the p99 figure in the table above.
- **3.2** Every screen in a capture or share path MUST be dismissible in one action without discarding the record already created. A screen that blocks saving until a field is filled is a defect; the only admissible exception is a field without which the record cannot exist at all, and the design MUST name that field explicitly.
- **3.3** A flow MUST NOT ask a user for data the platform can infer from signal it already holds (account name and email, organization from a verified `Membership`, meeting context from a calendar or event). Infer it, show it as low-confidence and correctable, and let the user fix it later — asking is only permitted where being wrong is unrecoverable.
- **3.4** Every surface MUST meet **WCAG 2.2 Level AA**. Concretely and checkably: minimum 4.5:1 text contrast and 3:1 for interactive boundaries and meaningful graphics; interactive targets at least 44×44 CSS px with 8 px spacing; no state or status conveyed by color alone (the relationship-strength meter and the verification badge both need a text or shape equivalent); every core journey completable with a screen reader and with keyboard-only or switch input; all motion — including the NFC broadcast animation — suppressed under a reduced-motion preference.
- **3.5** The tap budgets in this chapter MUST NOT be met by shrinking tap targets, removing labels, collapsing a confirmation the user needs, or stacking actions behind a gesture with no visible affordance. Where a budget and rule 3.4 conflict, 3.4 wins and the budget is renegotiated in this document.
- **3.6** A design exceeding a published budget MUST either be redesigned or record a dated, named exception in its module doc's Risks section stating the overrun and the condition that retires it. "We will optimize it later" is not an exception, and a budget with no owner is not a budget.

## 4. Core Journeys and Their Shapes

**Tenet: four journeys carry the product — capture, share, recall, follow up — and everything else is subordinate to them.**

- **Capture** — a person the user just met becomes a `Contact` in the graph, with enough context attached to be worth something months later.
- **Share** — an owner presents a `DigitalCard` to a human who is present, in real time.
- **Recall** — a user finds someone they already know, plus the history of how they know them.
- **Follow up** — a user acts on a relationship: a message, a logged `Interaction`, a pipeline or stage move.

- **4.1** Each of the four journeys MUST have exactly one canonical entry point reachable in ≤ 1 tap from the application's root surface. A module MUST NOT introduce a second, parallel way to perform a journey's primary action without deprecating the first in the same change.
- **4.2** Every journey MUST degrade to a partial-but-saved state on interruption. User-entered data MUST NOT live only in volatile screen state: if someone walks away mid-capture, closes the app, or loses signal, the result is a resumable record with whatever was captured — never a discarded one, and never a modal asking whether to discard.
- **4.3** Every journey MUST declare its connectivity obligation and MUST queue the user's intent rather than refusing an action when connectivity is the only thing missing. §5.6 is the authoritative list of which journeys must function fully offline; a journey MUST NOT claim a weaker obligation than that list assigns it.
- **4.4** AI-generated output inside these four journeys MUST be rendered as editable content the user can change before it takes effect, and MUST NOT execute an outbound side effect without an explicit human approval action — consistent with "automate the busywork, not the relationship" ([`00-vision/00-product-philosophy.md`](../00-vision/00-product-philosophy.md) §4) and the draft-and-approve model in [`ai-assistant-layer.md`](../02-modules/ai-assistant-layer/ai-assistant-layer.md) §5.
- **4.5** A feature serving none of the four journeys MUST NOT add a tap, a screen, a required field, or a blocking prompt to any of them. It may sit alongside them; it may not tax them.
- **4.6** Every journey MUST be completable by a user who has configured nothing beyond an account — no organization, no template, no integration, no automation. Configuration may improve a journey's output; it MUST NOT be the precondition for reaching it.

## 5. Surface Doctrine: Phone, Browser, Desktop

**Tenet: phone is for the moment, desktop is for the aftermath; both are the same graph, neither is a cut-down copy.**

Every user-facing workflow carries a **surface class** — the declared label naming where that workflow is *complete*, not merely present: `phone-complete` (start to finish on a phone, one-handed, no companion surface), `desktop-shaped` (large-screen primary, with a defined reduced phone surface), or `enterprise-admin` (large-screen only, because the operator is an administrator at a desk). This chapter is where the philosophy's "mobile-first" and "offline-first where the moment demands it" tenets ([`00-vision/00-product-philosophy.md`](../00-vision/00-product-philosophy.md) §4) stop being slogans and become pass/fail.

- **5.1** Every workflow a module doc describes MUST declare exactly one surface class. A workflow described without a surface class fails review — "works on mobile too" is not a declaration.
- **5.2** Capture, share, check-in and nudge MUST be `phone-complete`. This is the operational definition of "mobile-first": these four are the moment, and a design requiring a browser to finish any of them fails, regardless of how good the phone view is.
- **5.3** Admin consoles, the pipeline board, bulk edit, import/export, analytics and the automation DAG builder SHOULD be `desktop-shaped` — and each MUST still name its reduced phone surface (read-only, notification-driven, or single-tap action), as [`automation-workflow-engine.md`](../02-modules/automation-workflow-engine/automation-workflow-engine.md) §11 and [`security-compliance-center.md`](../02-modules/security-compliance-center/security-compliance-center.md) §11 already do. "Desktop-shaped" is a density judgement, not permission to omit the phone.
- **5.4** A workflow MUST NOT be reachable only on desktop unless it is `enterprise-admin` class. Any other desktop-only workflow requires its own ADR naming why the phone surface is impossible rather than inconvenient.
- **5.5** Desktop is the responsive web client at large-screen breakpoints ([ADR-0014](../adr/0014-desktop-strategy-responsive-web.md)). A design MUST NOT propose a separate desktop build, and MUST NOT depend on a capability the browser cannot provide (packaged shell, filesystem access, tray, background daemon). Shared behavior across surfaces is specified at the business-logic and API layer, never as a shared component ([ADR-0015](../adr/0015-web-client-architecture.md)).
- **5.6** The journeys that MUST function with no connectivity are exactly: card share, contact capture, event check-in, activity/note logging, and reading already-synced contact and card records — queued and reconciled per [ADR-0010](../adr/0010-offline-first-sync-protocol.md). This closed list is what "offline-first where the moment demands it" means. Server-computed surfaces (search, graph suggestions, analytics, AI drafting) MUST degrade to last-known cached state with a visible staleness marker and MUST NOT block the UI — they are not required to function offline.
- **5.7** Until the 16 module docs are renamed, their §11 "Mobile Considerations" is to be read as *Surface Considerations* and MUST state, per workflow, the surface class (§5.1) and the offline behavior (§5.6). The rename is out of scope for this pass; the reading is not optional.

## 6. Sharing Connections

**Tenet: a share is a scoped, expiring grant, never a copy of the profile.**

The visibility vocabulary itself is §10's; this chapter governs the mechanic that carries it.

- **6.1** Every share MUST produce a `ShareSession` snapshot — the exact field set the recipient's level permits, computed at share time — with a non-null `expiresAt`. A share mechanic with no expiry fails review, including link shares.
- **6.2** A share MUST NOT silently widen. Editing the underlying card, or raising a field's visibility level, MUST NOT add fields to an already-issued snapshot; only an approved field request adds a field, and only to the session it was raised against. Narrowing — revocation, or a field moved to `hidden` — MUST propagate to live sessions on next resolution.
- **6.3** The sender MUST be able to list every active share (channel, recipient where known, created-at, expiry) and revoke any one of them in a single action, from a `phone-complete` surface per §5.2. Revocation MUST be recorded in the audit log.
- **6.4** A recipient MUST NOT be required to create an account, install the app, or authenticate in order to view a shared card or save it to their device's native contact store. Sign-up MAY be offered only after the card has rendered.
- **6.5** Sharing MUST work when the network does not: the sending device MUST complete the gesture offline and queue the `ShareSession` write for reconciliation per [ADR-0010](../adr/0010-offline-first-sync-protocol.md). Where the recipient's resolution still needs connectivity, the design MUST say so explicitly rather than presenting it as a share failure — see [`identity-card-core.md`](../02-modules/identity-card-core/identity-card-core.md) §16 on offline-signed payloads.
- **6.6** A share MUST hand over a reference plus a point-in-time snapshot, never an editable duplicate of the owner's card ([`identity-card-core.md`](../02-modules/identity-card-core/identity-card-core.md) §5). A design in which the recipient holds a divergent copy the owner cannot correct fails review.

## 7. Sharing Events

**Tenet: an Event is a shared moment both parties can see — the one place where context is mutual rather than owner-private.**

An `Event` is a bounded, named occasion (conference, meetup, dinner) that contextualizes captures. It is new to the platform ([ADR-0013](../adr/0013-event-as-first-class-primitive.md)) and deliberately thin: capture context, not a social object.

- **7.1** An `Event` MUST be a first-class entity owned by the Contacts & Networking Graph module and referenced by id; captures MUST NOT carry the occasion as a free-text tag. `EventParticipation` MUST be the only record of a person's presence at an `Event`.
- **7.2** `EventParticipation` MUST NOT be readable by other participants. No attendee list, no co-attendee count, no "who else is here," no mutual-attendance signal in search, suggestions or the graph. A co-attendee's identity or contact data becomes visible to another participant only through an explicit share between those two people (§6); absent that exchange, a participation record is visible only to the participant it belongs to. This is the rule keeping an `Event` from becoming an attendee-list leak, and it has no convenience exception.
- **7.3** An `Event` reference MUST NOT by itself change any field's visibility. Event context labels a capture; it never grants access.
- **7.4** Any event-scoped grant a design does introduce MUST carry an explicit expiry stated at grant time, expiring no later than a named interval after the `Event`'s end date, and MUST NOT auto-renew. An open-ended event-scoped grant fails review.
- **7.5** Check-in MUST be `phone-complete` and MUST work offline (§5.2, §5.6): `EventParticipation` and any contacts captured during the `Event` queue locally and reconcile per [ADR-0010](../adr/0010-offline-first-sync-protocol.md), with the event reference attached on the device at capture time rather than inferred server-side afterwards.
- **7.6** An `Event` MUST NOT acquire its own feed, messaging, roster surface or relationship edges. If a proposed event feature is not explained by "this capture happened here," it does not belong in this primitive.

## 8. Discovery & Recall

**Tenet: company data is public reference; people data is earned.**

Two discovery surfaces, two different rules — and conflating them is how a relationship platform turns into the public people graph [`00-vision/00-product-philosophy.md`](../00-vision/00-product-philosophy.md) §2 rules out. Firmographic reference data is open to everyone; a `Person` is discoverable only to someone who already has a relationship with them.

- **8.1** Firmographic discovery MUST be global: any authenticated user MUST be able to search and read `CompanyProfile` records regardless of tenant, per [ADR-0016](../adr/0016-public-company-directory-closed-people-graph.md). Company results MUST NOT include, count, or hint at any person.
- **8.2** People discovery MUST be bounded to the requester's own graph — `Contact` rows they own, `Person`s they hold a `Connection` with, and contacts explicitly shared into a `Workspace` they belong to. The platform MUST NOT ship a public people directory, a cross-tenant "people you may know," or any query returning a `Person` the requester has no existing relationship or share with.
- **8.3** Recall MUST treat "where and when did I meet them" as a first-class query, resolved against `Event`/`EventParticipation` ([ADR-0013](../adr/0013-event-as-first-class-primitive.md)) and `Contact.captureContext` as structured filters — not as a free-text search that happens to hit a notes field.
- **8.4** Ranking of people results SHOULD weight recency and frequency of `Interaction` above lexical match score: a contact spoken to last week outranks a closer string match untouched for three years. Company results rank the other way — exact `domain` match first, since the directory is a lookup, not a memory aid.
- **8.5** Mutual-connection results MUST exclude any `Connection` where either endpoint `Person` has restricted `Connection` visibility ([`contacts-networking-graph.md`](../02-modules/contacts-networking-graph/contacts-networking-graph.md) §13). The restriction is enforced at every hop, and an excluded edge MUST be omitted silently — never shown as a redacted or locked result, which leaks the same fact.
- **8.6** Proactive relationship suggestions MUST be volume-capped: at most 5 suggestions per digest, at most one digest per day per `Person` (weekly by default), and a dismissed suggestion MUST NOT resurface for 90 days. This is the concrete answer to the "noise the user learns to ignore" risk in [`contacts-networking-graph.md`](../02-modules/contacts-networking-graph/contacts-networking-graph.md) §17 — a cap the product must live within, not a tuning goal.
- **8.7** Every surfaced suggestion MUST carry a user-legible reason drawn from real data ("no interaction logged since March; met at SaaStr 2026"). A suggestion whose reason cannot be rendered MUST NOT be shown, however high its score.

## 9. The Company Directory and Org Trees

**Tenet: the directory is a shared skeleton; the people you see standing in it are only ever your own.**

The directory is deliberately two things at once: global, public firmographic data everyone shares, and a per-owner people layer nobody shares. The split is load-bearing — it is what lets us ship company discovery without building a public people graph.

- **9.1** A module MUST NOT conflate `CompanyProfile` with `Organization`. `Organization` is tenant-scoped and means *an employer that is a paying customer of this platform*; `CompanyProfile` is global, carries no `tenantId`, and means *a company that exists in the world*. An `Organization` MAY link to a `CompanyProfile` by `domain`, but the rows MUST stay distinct — Acme-as-tenant and Acme-in-the-directory are two records, and code accepting either where it means one is a defect.
- **9.2** `CompanyProfile` MUST carry no person-identifying data of any kind — no names, titles, headcounts of named individuals, no employee list, no field that becomes person-identifying at small `sizeBand`. This is precisely the exception [ADR-0016](../adr/0016-public-company-directory-closed-people-graph.md) carves out of [ADR-0001](../adr/0001-multi-tenant-data-isolation.md), and it is the only one: anything identifying a human stays on `Person`/`Contact` and stays tenant-scoped. Classified **Public** in [`05-security-privacy-compliance.md`](05-security-privacy-compliance.md) §2.
- **9.3** An org tree MUST be composed exclusively from the requesting owner's own `Contact` rows — `Contact.companyProfileId` for membership, the private `Contact.reportsToContactId` edge for hierarchy. "A viewer sees only their own contacts" MUST hold by construction (every node is a row the owner already owns), never by a filter applied after the fact: a tree MUST NOT be assembled by querying `Person`, `Membership`, or another owner's `Contact` rows, even where a permission check would permit it.
- **9.4** A `CompanyProfile` for which the viewer has captured no contacts MUST render an explicitly empty tree. Empty is the correct answer, not a gap to fill: the platform MUST NOT populate a tree from purchased, scraped, or cross-tenant employee data, and MUST NOT show another user's contacts as placeholders.
- **9.5** Automatic enrichment MAY fill `CompanyProfile` fields and MAY propose `reportsToContactId` edges — never people themselves. `enrichmentSource` records how a record came to be: `derived` for deterministic extraction (a company inferred from an email domain), `ai` for genuine model-backed enrichment, `claimed` for a company that has claimed its own profile, `manual` for anything a human entered or corrected. Every automatically-derived field and proposed edge MUST be labelled inferred at the point of display and MUST be correctable in a single action; once a user corrects one, `enrichmentSource` becomes `manual` and re-enrichment MUST NOT overwrite it. **As built, only `derived` is produced** — domain extraction from a subject's *public* email field, which is deterministic and not AI. No model-backed enrichment exists yet, and labelling one as `ai` before it does would be a lie the UI repeats to the user.
- **9.6** When a contact changes employer, the owner's tree MUST re-parent that `Contact` to the new `CompanyProfile` and MUST drop every `reportsToContactId` edge that would now cross two companies, rather than carrying a stale reporting line across. Prior employment belongs on the contact's own timeline, not in either tree.

## 10. The Public/Private Boundary

**Tenet: the owner's view of a relationship is never the subject's view of themselves.**

This chapter states the user-visible rule only; the enforcement model — RLS, `PolicyBinding`, redaction-before-AI-call, audit — is owned by [`05-security-privacy-compliance.md`](05-security-privacy-compliance.md) §4/§6. Cross-tenant leakage is that document's §1 worst-case failure mode; the rules below are stricter still, because most of them must also hold *within* a single tenant.

- **10.1** `public`, `link_only`, `request_required`, `hidden` are the platform's complete visibility vocabulary. No module may define a fifth level, alias an existing one under a new name, or add a per-feature override; a new requirement is met by assigning an existing level, or by an ADR changing the model for every module at once.
- **10.2** A `Contact` record MUST NOT be readable by its subject `Person` — not via a profile view, notification, "who saved me" surface, export, mutual-connection panel, or AI answer. This holds within a tenant, including when owner and subject are members of the same `Organization` ([`contacts-networking-graph.md`](../02-modules/contacts-networking-graph/contacts-networking-graph.md) §13). Correspondingly a `Contact` MUST NOT copy the subject's card fields; it live-resolves them at read time, so a downgrade by the subject takes effect on the owner's very next read.
- **10.3** AI features MUST NOT surface a field the requester could not see unaided. Any generated summary, enrichment, ranking signal, or answer MUST be grounded in exactly the scoped projection the requester's own read would return; where grounding would require a `hidden` or unapproved `request_required` field, the assistant MUST omit it and say the field is unavailable — never paraphrase it, aggregate around it, or infer it back. An AI summary that launders a gated field is the likeliest way this boundary breaks, and it counts as a privacy incident, not a quality bug.
- **10.4** Request-and-approve is the only path across a gate. A `request_required` field becomes visible solely through an explicit field request the owner approves, scoped to that requester and bounded by the share snapshot's expiry ([`identity-card-core.md`](../02-modules/identity-card-core/identity-card-core.md) §7). There is no bulk approval, no tenant-admin override, no marketplace-extension bypass, and no "the requester obtained it elsewhere" shortcut.
- **10.5** **Shared `Workspace` contacts are shared in two layers, and only one of them travels.** Sharing a `Contact` into a `Workspace` shares the *engagement layer* — subject reference, `companyProfileId`, org-scoped `Tag`s, and `Interaction` records logged in the org context. The *private layer* — `captureContext`, personal notes, personal `Tag`s, `NetworkSegment` membership, and `reportsToContactId` edges — MUST remain private to the owning `Person` and becomes visible only by that owner's explicit, per-field share action. Sharing MUST NOT be retroactive: content written before the share stays private until deliberately shared. This settles the "shared team asset vs. individual's private working notes" tension recorded in [`TODO.md`](../TODO.md) — the default is private, and the team asset is the engagement record, not the notes. Where an `Organization` retains relationship data formed on company time ([`contacts-networking-graph.md`](../02-modules/contacts-networking-graph/contacts-networking-graph.md) §13), that retention covers the engagement layer; sweeping in the private layer would require a retention policy disclosed to the employee at capture time, which this rulebook does not define and no module may assume.
- **10.6** Visibility is subject-controlled and revocable going forward only. A subject sets levels on their own `CardField`s and on `Connection` discoverability; revoking or downgrading MUST apply to every subsequent read and MUST invalidate outstanding share snapshots. The platform MUST NOT claim to retract what a recipient already received, and no surface may word revocation as if it could.
- **10.7** Where a rule in this chapter cannot yet be enforced by the mechanisms in [`05-security-privacy-compliance.md`](05-security-privacy-compliance.md) §4, the feature MUST ship disabled rather than best-effort. A boundary enforced by convention is not enforced.

## 11. Checking a Design Against This Rulebook

Most of these rules are checkable from a module doc alone, before anything is built — that is deliberate. A rule verifiable only by using the finished product is a rule discovered late.

| Rule class | Rules | Verified in | Checkable pre-build? |
|---|---|---|---|
| Persona and time budget | §2.1, §2.3–§2.6 | Module doc §1 Business Goal, §2 User Stories | Yes |
| Additive-proposal discipline | §2.2, §4.5 | The proposal itself | Yes |
| Friction budgets | §3 table, §3.1–§3.3, §3.6 | Module doc §4 (NFRs), §5 (UX Flow); overruns in §17 Risks | Partly — the table needs instrumentation |
| Accessibility | §3.4–§3.5 | Module doc §6 Wireframe Description; component review | Partly |
| Journey shape and degradation | §4.1–§4.4, §4.6 | Module doc §5 UX Flow | Yes |
| Surface class and offline | §5.1–§5.7 | Module doc §11 (read as Surface Considerations) | Yes |
| Share mechanics | §6.1–§6.6 | Module doc §7 Data Model, §8 API Design | Yes |
| Event boundaries | §7.1–§7.6 | [ADR-0013](../adr/0013-event-as-first-class-primitive.md); module doc §7 | Yes |
| Discovery scope and suggestion volume | §8.1–§8.7 | Module doc §8 API Design; [ADR-0016](../adr/0016-public-company-directory-closed-people-graph.md) | Yes |
| Directory and org-tree construction | §9.1–§9.6 | Module doc §7; [`03-data-model/er-overview.md`](../03-data-model/er-overview.md) | Yes |
| Visibility and the private boundary | §10.1–§10.7 | Module doc §13; enforcement in [`05-security-privacy-compliance.md`](05-security-privacy-compliance.md) §4 | Yes — and requires test coverage |

Two rules carry a release gate rather than a review gate: **§10.2** (a `Contact` is unreadable by its subject) and **§9.3** (trees composed only of the owner's own rows) are isolation invariants in the sense of [`05-security-privacy-compliance.md`](05-security-privacy-compliance.md) §9 — they need isolation-specific test coverage, not a reviewer's agreement.

## 12. Open Questions

- **Event deduplication across attendees.** Two users independently creating "KubeCon 2026" produce two `Event` rows and two disjoint recall scopes. Domain/date matching is the obvious first answer; whether dedup is automatic, suggested, or manual is unresolved ([ADR-0013](../adr/0013-event-as-first-class-primitive.md)).
- **No organizer role.** §7.2 forbids any attendee list, which also forbids the legitimate case of an event host who has a roster. An organizer carve-out means adding a role and a consent model; this document takes the strict reading and defers the exception rather than inventing one.
- **Global write abuse on `CompanyProfile`.** A tenant-less, user-writable record needs moderation, conflict resolution between two tenants editing the same row, and an abuse story. [ADR-0016](../adr/0016-public-company-directory-closed-people-graph.md) names this as undesigned.
- **Tablet.** §5's three surface classes have no tablet answer. [`automation-workflow-engine.md`](../02-modules/automation-workflow-engine/automation-workflow-engine.md) §11 says "desktop/tablet-oriented," which this document neither confirms nor contradicts.
- **The friction budgets are unmeasured.** §3's figures are chosen, not observed. The first instrumentation pass should be treated as evidence to revise them, not as a score against them.
- **Connection visibility symmetry.** §10.6 makes visibility subject-controlled per endpoint, which closes by implication the symmetric-vs-asymmetric question left open in [`contacts-networking-graph.md`](../02-modules/contacts-networking-graph/contacts-networking-graph.md) §18. If asymmetry is later wanted deliberately, it needs an ADR rather than a module-local exception.
