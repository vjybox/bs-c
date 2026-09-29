# ADR-0023: UI Text Lives in a Message Catalogue

**Status**: Accepted · **Date**: 2026-09-29 · **Related**: product brief ("multi-language"), [rulebook](../01-architecture/09-experience-and-interaction-rulebook.md) §3.4 (accessibility)

## Context

The brief requires multi-language support. Every string in the web app was hard-coded English in JSX. Retrofitting translation later means touching every component at once, usually in a rush for a first non-English customer.

## Decision

All user-visible web text lives in `apps/web/src/i18n/en.ts`, a typed catalogue keyed by flat dotted names, and is rendered through `t()` or `tRich()`:

- The syntax is a **subset of ICU MessageFormat**: `{name}` interpolation, a `{ one, other, … }` object selecting on `count` through `Intl.PluralRules`, and flat `<tag>…</tag>` rich-text markup. The catalogue moves to FormatJS or similar unchanged.
- The locale comes from `navigator.languages`, with a per-key fallback to English. A missing translation shows English, never a key name. Dates use the active locale.
- A new language is a new catalogue file registered in `i18n/index.tsx`. Keys are type-checked: a missing key fails the build, and enum-derived keys (`visibility.${v}`) are checked exhaustively.
- A fitness test ([ADR-0022](0022-architecture-fitness-tests.md)) fails on literal text in JSX or in `placeholder`/`title`/`alt`/`aria-label` attributes.

## Alternatives Considered

| Option | Advantages | Disadvantages |
|---|---|---|
| **react-intl (FormatJS)** | Full ICU (select, nested plurals, number/date skeletons); extraction tooling | About 20 kB+ and a provider tree for one language today |
| **i18next + react-i18next** | Huge ecosystem; lazy-loaded namespaces | Its own interpolation syntax (not ICU); runtime-typed keys unless extra tooling is added |
| **Lingui** | Compile-time extraction; small runtime | A macro/Babel setup that fights the current Vite config |
| **Typed catalogue + tiny helper** (chosen) | Zero dependencies; compile-time key checking; ICU-compatible syntax keeps the exit open | Flat tags only (no nesting); no select/gender; we own about 80 lines |

## Consequences

- Positive: adding a language is a translation task, not an engineering one. Copy review happens in one file.
- Negative: server-generated text is still English. Two known cases: the automatic "Contact saved via card share" note, and API error messages (tech-debt TD-08, TD-09). Right-to-left layout is untested.

## Revisit when

Any of these, whichever is first:

- The second language ships.
- A message needs `select` or nested plurals.
- Translators need extraction tooling.

Move to FormatJS then. Keys and syntax carry over.
