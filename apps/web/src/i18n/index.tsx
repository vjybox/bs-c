import { Fragment, type ReactNode } from "react";
import { en } from "./en";

export type MessageKey = keyof typeof en;
type Plural = { one: string; other: string; zero?: string; two?: string; few?: string; many?: string };
type Message = string | Plural;
type Catalogue = Partial<Record<MessageKey, Message>>;
type Params = Record<string, string | number>;

/**
 * Catalogues by base language. A new language is a new file registered here; a missing key
 * falls back to English rather than rendering a key name.
 */
const CATALOGUES: Record<string, Catalogue> = { en };

function detectLocale(): string {
  const preferred = typeof navigator !== "undefined" ? navigator.languages ?? [navigator.language] : [];
  for (const tag of preferred) {
    if (tag && CATALOGUES[tag.split("-")[0]]) return tag;
  }
  return "en";
}

let locale = detectLocale();

export function getLocale(): string {
  return locale;
}

/** For tests and a future language picker. */
export function setLocale(tag: string): void {
  locale = CATALOGUES[tag.split("-")[0]] ? tag : "en";
  if (typeof document !== "undefined") document.documentElement.lang = locale;
}

function lookup(key: MessageKey): Message {
  return CATALOGUES[locale.split("-")[0]]?.[key] ?? en[key];
}

function resolve(key: MessageKey, params?: Params): string {
  let message = lookup(key);
  if (typeof message !== "string") {
    const count = Number(params?.count ?? 0);
    const category = new Intl.PluralRules(locale).select(count) as keyof Plural;
    message = message[category] ?? message.other;
  }
  return message.replace(/\{(\w+)\}/g, (whole, name: string) =>
    params && name in params ? String(params[name]) : whole,
  );
}

/** Plain-text message. */
export function t(key: MessageKey, params?: Params): string {
  return resolve(key, params);
}

/**
 * Message with inline elements: `<link>text</link>` renders through `tags.link(text)`.
 * Tags are flat (no nesting) — enough for every message today, and the same markup ICU
 * uses, so a later move to a full library keeps the catalogue as is.
 */
export function tRich(
  key: MessageKey,
  tags: Record<string, (chunk: string) => ReactNode>,
  params?: Params,
): ReactNode {
  const text = resolve(key, params);
  const parts: ReactNode[] = [];
  const pattern = /<(\w+)>(.*?)<\/\1>/g;
  let last = 0;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(text))) {
    if (match.index > last) parts.push(text.slice(last, match.index));
    const render = tags[match[1]];
    parts.push(<Fragment key={match.index}>{render ? render(match[2]) : match[2]}</Fragment>);
    last = pattern.lastIndex;
  }
  if (last < text.length) parts.push(text.slice(last));
  return <>{parts}</>;
}

/** Common tags, so pages do not each redefine bold and code. */
export const b = (chunk: string) => <strong>{chunk}</strong>;
export const code = (chunk: string) => <code>{chunk}</code>;
