/**
 * English messages — the source catalogue. Every user-visible string in the web app lives
 * here (src/i18n/i18n.test.ts fails on literal text in JSX), so adding a language is adding
 * a file, not editing pages.
 *
 * Syntax is a deliberate subset of ICU MessageFormat, so the catalogue can move to FormatJS
 * or similar without rewriting it: `{name}` interpolates, `<tag>…</tag>` marks rich text a
 * page renders as an element, and a `{ one, other }` object pluralises on `count`.
 */
export const en = {
  "common.loading": "Loading…",
  "common.saving": "Saving…",
  "common.remove": "Remove",
  "common.close": "Close",
  "common.unknownPerson": "(unknown)",
  "common.inferred": "inferred",
  "common.inferredTitle": "Derived from an email domain",
  "common.backToEditor": "← Back to editor",
  "common.label": "Label",
  "common.value": "Value",

  "visibility.public": "Public",
  "visibility.link_only": "Link only",
  "visibility.request_required": "On request",
  "visibility.hidden": "Hidden",

  "fieldType.text": "Text",
  "fieldType.phone": "Phone",
  "fieldType.email": "Email",
  "fieldType.url": "URL",
  "fieldType.social": "Social",
  "fieldType.custom": "Custom",

  "channel.meeting": "Meeting",
  "channel.call": "Call",
  "channel.email": "Email",
  "channel.message": "Message",
  "channel.note": "Note",

  "requestStatus.pending": "pending",
  "requestStatus.approved": "approved",
  "requestStatus.denied": "denied",

  "connection.offline": "<b>Offline.</b> Captures and notes are saved on this device and sent when you reconnect.",
  "connection.pending": { one: "{count} waiting to sync", other: "{count} waiting to sync" },

  "card.yourName": "Your name",
  "card.requested": "Requested",
  "card.requestAccess": "Request access",
  "card.noFields": "No fields yet.",

  "share.title": "Share your card",
  "share.fullCard": "Full card. Expires automatically, and you can revoke it.",
  "share.copied": "Copied!",
  "share.copyLink": "Copy link",
  "share.generating": "Generating link…",
  "share.offlineLead": "<b>Offline — sharing public details only.</b>",
  "share.offlinePublic": {
    one: "This code carries your {count} public field directly, so it scans with no network on either phone.",
    other: "This code carries your {count} public fields directly, so it scans with no network on either phone.",
  },
  "share.offlineGated": {
    one: "Your {count} other field is not included — those need a link, which needs a connection.",
    other: "Your {count} other fields are not included — those need a link, which needs a connection.",
  },

  "createCard.title": "Create your digital card",
  "createCard.demoHint": "Just looking around? <link>Sign in as a demo persona</link> to explore with sample contacts and history.",
  "createCard.name": "Name",
  "createCard.headline": "Headline",
  "createCard.fields": "Fields",
  "createCard.addField": "+ Add field",
  "createCard.nameRequired": "Name is required",
  "createCard.failed": "Failed to create card",
  "createCard.creating": "Creating…",
  "createCard.submit": "Create card",
  "createCard.defaultEmailLabel": "Email",
  "createCard.defaultPhoneLabel": "Phone",

  "demo.back": "← Create your own card",
  "demo.title": "Demo sign-in",
  "demo.off": "Demo mode is off. Start the stack with <code>DEMO_MODE=true docker compose --profile demo up --build</code> to seed sample data and enable demo sign-in.",
  "demo.empty": "No seeded people yet — run <code>npm run seed --workspace=apps/api</code>.",
  "demo.intro": "Pick someone to sign in as. Mara has the most data — six contacts, a pending field request, and a relationship that has gone quiet.",
  "demo.signInAs": "Sign in as {name}",
  "demo.banner": "<b>Demo</b> — sample data running entirely in your browser. Changes are not saved and reset when you reload. This is not a live deployment.",

  "editor.title": "Edit your card",
  "editor.fieldRequests": "Field requests",
  "editor.contacts": "My Contacts",
  "editor.companies": "Companies",
  "editor.share": "Share",
  "editor.signOut": "Sign out",
  "editor.addField": "Add field",
  "editor.add": "Add",
  "editor.preview": "Live preview",
  "editor.loadFailed": "Failed to load card",
  "editor.updateFailed": "Failed to update field",
  "editor.deleteFailed": "Failed to delete field",
  "editor.addFailed": "Failed to add field",

  "requests.title": "Field requests",
  "requests.pending": "Pending",
  "requests.none": "No pending requests.",
  "requests.approve": "Approve",
  "requests.deny": "Deny",
  "requests.resolved": "Resolved",
  "requests.loadFailed": "Failed to load requests",
  "requests.respondFailed": "Failed to respond",

  "recipient.loadFailed": "Failed to load card",
  "recipient.requestFailed": "Failed to request field",
  "recipient.saveFailed": "Failed to save contact",
  "recipient.saved": "Contact saved ✓",
  "recipient.save": "Save Contact",

  "contacts.title": "My Contacts",
  "contacts.empty": "No contacts yet — save a contact from a shared card.",
  "contacts.noInteractions": "No interactions yet",
  "contacts.lastToday": "Last interaction today",
  "contacts.lastYesterday": "Last interaction yesterday",
  "contacts.lastDaysAgo": { one: "Last interaction {count} day ago", other: "Last interaction {count} days ago" },

  "contact.back": "← My Contacts",
  "contact.met": "Met: {context}",
  "contact.logTitle": "Log Interaction",
  "contact.channel": "Channel",
  "contact.notes": "Notes (optional)",
  "contact.logSubmit": "Log Interaction",
  "contact.logFailed": "Failed to log interaction",
  "contact.history": "Interaction History",
  "contact.noHistory": "No interactions logged yet.",

  "companies.title": "Companies",
  "companies.intro": "Companies you have captured contacts at. The company record itself is shared across everyone; the people you see under it are only ever your own contacts.",
  "companies.empty": "No companies yet. Save a contact whose card has a work email and their company appears here automatically.",
  "companies.contactCount": { one: "{count} contact", other: "{count} contacts" },

  "tree.back": "← Companies",
  "tree.reportsTo": "Reports to",
  "tree.change": "— change —",
  "tree.nobody": "Nobody (top level)",
  "tree.derived": "This company was derived from an email domain rather than entered by hand.",
  "tree.empty": "You have not captured anyone at {company}. That is the whole answer — this tree only ever shows your own contacts, so it stays empty rather than being filled in with other people's.",
  "tree.summary": {
    one: "{count} of your contacts. Reporting lines are private to you.",
    other: "{count} of your contacts. Reporting lines are private to you.",
  },
  "tree.updateFailed": "Could not update the reporting line",
} as const;
