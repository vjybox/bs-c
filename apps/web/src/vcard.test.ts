import { describe, expect, it } from "vitest";
import { buildVCard, publicFieldsOf } from "./vcard";
import type { OwnerField } from "./types";

function field(partial: Partial<OwnerField>): OwnerField {
  return {
    id: crypto.randomUUID(),
    fieldType: "text",
    label: "Label",
    value: "value",
    visibility: "public",
    displayOrder: 0,
    ...partial,
  };
}

const person = { displayName: "Mara Oyelaran", headline: "Independent brand consultant" };

describe("publicFieldsOf", () => {
  it("keeps only public fields", () => {
    const fields = [
      field({ visibility: "public", label: "Work email" }),
      field({ visibility: "link_only", label: "Mobile" }),
      field({ visibility: "request_required", label: "Personal email" }),
      field({ visibility: "hidden", label: "Home address" }),
    ];
    expect(publicFieldsOf(fields).map((f) => f.label)).toEqual(["Work email"]);
  });
});

describe("buildVCard", () => {
  it("emits a parseable vCard with name and headline", () => {
    const vcard = buildVCard({ person, fields: [] });
    expect(vcard.startsWith("BEGIN:VCARD\r\nVERSION:3.0")).toBe(true);
    expect(vcard).toContain("FN:Mara Oyelaran");
    expect(vcard).toContain("N:Oyelaran;Mara;;;");
    expect(vcard).toContain("TITLE:Independent brand consultant");
    expect(vcard.endsWith("END:VCARD")).toBe(true);
  });

  it("maps field types to the right vCard properties", () => {
    const vcard = buildVCard({
      person,
      fields: [
        field({ fieldType: "email", value: "mara@oyelaran.studio" }),
        field({ fieldType: "phone", value: "+44 7700 900101" }),
        field({ fieldType: "url", value: "https://oyelaran.studio" }),
        field({ fieldType: "text", label: "Studio", value: "Bristol" }),
      ],
    });
    expect(vcard).toContain("EMAIL;TYPE=INTERNET:mara@oyelaran.studio");
    expect(vcard).toContain("TEL;TYPE=CELL:+44 7700 900101");
    expect(vcard).toContain("URL:https://oyelaran.studio");
    expect(vcard).toContain("NOTE:Studio\\: Bristol");
  });

  it("NEVER includes a non-public field, whatever is passed in", () => {
    // The guard that matters: rulebook §6.7 allows public fields offline and nothing else.
    // buildVCard filters internally so a caller that forgets publicFieldsOf still cannot leak.
    const vcard = buildVCard({
      person,
      fields: [
        field({ fieldType: "email", value: "public@example.com", visibility: "public" }),
        field({ fieldType: "phone", value: "SECRET-LINK-ONLY", visibility: "link_only" }),
        field({ fieldType: "email", value: "SECRET-ON-REQUEST", visibility: "request_required" }),
        field({ fieldType: "text", value: "SECRET-HIDDEN", visibility: "hidden" }),
      ],
    });
    expect(vcard).toContain("public@example.com");
    expect(vcard).not.toContain("SECRET-LINK-ONLY");
    expect(vcard).not.toContain("SECRET-ON-REQUEST");
    expect(vcard).not.toContain("SECRET-HIDDEN");
  });

  it("escapes characters that would otherwise break the format", () => {
    const vcard = buildVCard({
      person: { displayName: "Doe; John", headline: "A, B" },
      fields: [field({ fieldType: "text", label: "Note", value: "line1\nline2, and; more" })],
    });
    expect(vcard).toContain("FN:Doe\\; John");
    expect(vcard).toContain("TITLE:A\\, B");
    expect(vcard).toContain("line1\\nline2\\, and\\; more");
    // Escaped separators must not survive as raw structural characters in a value.
    const noteLine = vcard.split("\r\n").find((l) => l.startsWith("NOTE:"))!;
    expect(noteLine.includes("\n")).toBe(false);
  });

  it("skips empty values rather than emitting blank properties", () => {
    const vcard = buildVCard({
      person,
      fields: [field({ fieldType: "email", value: "   " }), field({ fieldType: "phone", value: "+1" })],
    });
    expect(vcard).not.toContain("EMAIL");
    expect(vcard).toContain("TEL;TYPE=CELL:+1");
  });

  it("handles a single-word name without producing a malformed N line", () => {
    const vcard = buildVCard({ person: { displayName: "Prince", headline: null }, fields: [] });
    expect(vcard).toContain("N:;Prince;;;");
    expect(vcard).toContain("FN:Prince");
    expect(vcard).not.toContain("TITLE:");
  });
});
