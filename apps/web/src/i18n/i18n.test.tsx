import { afterEach, describe, expect, it } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { render } from "@testing-library/react";
import { setLocale, t, tRich } from ".";

afterEach(() => setLocale("en"));

describe("t()", () => {
  it("interpolates parameters", () => {
    expect(t("demo.signInAs", { name: "Mara" })).toBe("Sign in as Mara");
  });

  it("pluralises on count using the locale's plural rules", () => {
    expect(t("companies.contactCount", { count: 1 })).toBe("1 contact");
    expect(t("companies.contactCount", { count: 3 })).toBe("3 contacts");
  });

  it("falls back to English for an unknown locale rather than showing keys", () => {
    setLocale("xx-YY");
    expect(t("editor.title")).toBe("Edit your card");
  });

  it("renders rich-text tags through the supplied renderers", () => {
    const { container } = render(<p>{tRich("share.offlineLead", { b: (c) => <strong>{c}</strong> })}</p>);
    expect(container.querySelector("strong")?.textContent).toBe("Offline — sharing public details only.");
  });
});

/**
 * Fitness test for the charter's multi-language requirement: user-visible text must come
 * from the catalogue. Catches literal JSX text and literal text attributes in any page or
 * component. Punctuation-only text (arrows, separators) is allowed.
 */
describe("no hard-coded UI text", () => {
  const root = path.resolve(__dirname, "..");
  const files: string[] = [];
  const walk = (dir: string) => {
    for (const name of readdirSync(dir)) {
      const full = path.join(dir, name);
      if (statSync(full).isDirectory()) walk(full);
      else if (name.endsWith(".tsx") && !name.includes(".test.") && !full.includes(`${path.sep}i18n${path.sep}`)) {
        files.push(full);
      }
    }
  };
  walk(root);

  it("finds the pages and components it is meant to police", () => {
    expect(files.length).toBeGreaterThan(10);
  });

  it.each(files.map((f) => [path.relative(root, f), f]))("%s has no literal user-visible text", (_, file) => {
    const src = readFileSync(file, "utf8");
    const offenders: string[] = [];
    // Text between a closing '>' and the next '<' or '{' that contains a letter.
    for (const m of src.matchAll(/>([^<>{}]*[A-Za-z][^<>{}]*)</g)) {
      const text = m[1].trim();
      // Skip TypeScript generics and arrow-function bodies that happen to match.
      if (/^[\w.]+(\[\])?$/.test(text) && /[a-z][A-Z]|^[A-Z][a-z]+[A-Z]/.test(text)) continue;
      if (text.includes("=>") || text.includes("(") || text.includes(";")) continue;
      offenders.push(text);
    }
    for (const m of src.matchAll(/\b(placeholder|title|alt|aria-label)="([^"]*[A-Za-z][^"]*)"/g)) {
      offenders.push(`${m[1]}="${m[2]}"`);
    }
    expect(offenders).toEqual([]);
  });
});
