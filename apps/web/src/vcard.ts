import type { OwnerField, OwnerPerson } from "./types";

/**
 * Builds a vCard 3.0 payload for the offline share QR.
 *
 * Rulebook §6.7: this carries `public` fields and nothing else. A public field is one the
 * owner has already declared unrestricted, so copying it bypasses no gate and forfeits no
 * revocation. Fields at link_only, request_required or hidden MUST NOT appear here — they
 * require the online scoped session, which needs a server to resolve.
 *
 * vCard 3.0 rather than 4.0 because iOS and Android both import it reliably.
 */

/** RFC 6350 escaping: backslash, comma, semicolon and newline are structural. */
function escapeValue(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

function lineFor(field: OwnerField): string | null {
  const value = escapeValue(field.value.trim());
  if (!value) return null;
  const label = escapeValue(field.label.trim()) || "Other";

  switch (field.fieldType) {
    case "email":
      return `EMAIL;TYPE=INTERNET:${value}`;
    case "phone":
      return `TEL;TYPE=CELL:${value}`;
    case "url":
    case "social":
      return `URL:${value}`;
    default:
      // No standard field fits, so keep it as a labelled note rather than dropping it.
      return `NOTE:${label}\\: ${value}`;
  }
}

export interface VCardInput {
  person: Pick<OwnerPerson, "displayName" | "headline">;
  fields: OwnerField[];
}

export function publicFieldsOf(fields: OwnerField[]): OwnerField[] {
  return fields.filter((f) => f.visibility === "public");
}

export function buildVCard({ person, fields }: VCardInput): string {
  const name = escapeValue(person.displayName.trim()) || "Unknown";
  // vCard splits the name into five components; we only reliably know the whole string.
  const parts = person.displayName.trim().split(/\s+/);
  const last = parts.length > 1 ? escapeValue(parts[parts.length - 1]) : "";
  const first = parts.length > 1 ? escapeValue(parts.slice(0, -1).join(" ")) : name;

  const lines = [
    "BEGIN:VCARD",
    "VERSION:3.0",
    `N:${last};${first};;;`,
    `FN:${name}`,
  ];

  if (person.headline?.trim()) lines.push(`TITLE:${escapeValue(person.headline.trim())}`);

  for (const field of publicFieldsOf(fields)) {
    const line = lineFor(field);
    if (line) lines.push(line);
  }

  lines.push("END:VCARD");
  return lines.join("\r\n");
}
