# ADR-0015: Web Client Architecture

**Status**: Accepted · **Date**: 2026-09-27 · **Full reasoning**: [`01-architecture/09-experience-and-interaction-rulebook.md`](../01-architecture/09-experience-and-interaction-rulebook.md) §5 · **Depends on**: [ADR-0014](0014-desktop-strategy-responsive-web.md)

## Context

[ADR-0014](0014-desktop-strategy-responsive-web.md) makes the browser the desktop product, yet no web-client architecture is documented anywhere in this corpus — [`08-tech-stack-options-matrix.md`](../01-architecture/08-tech-stack-options-matrix.md) carries a "Mobile client" row and no web row. The web client is now load-bearing for every desktop-shaped workflow and entirely undefined.

## Decision

A separate **React + TypeScript** web application that shares the **business-logic and API layers** with the React Native codebase but **not** its component layer. Shared: API client, domain models, validation, query/state logic. Not shared: components, navigation, styling.

## Alternatives Considered

- **React Native for Web**: one component tree across all surfaces, but touch-first primitives produce poor dense-table and keyboard ergonomics for exactly the desktop-shaped workflows ADR-0014 assigns to the browser.
- **Fully independent web app with no sharing**: fastest per-platform velocity, but duplicates validation and API contracts across two codebases — precisely the drift the platform's "one graph, many surfaces" tenet exists to prevent.
- **No web client at all**: directly contradicts ADR-0014 and leaves admin and pipeline workflows unhoused.

## Consequences

- Positive: each surface gets platform-appropriate components; one source of truth for API contracts and validation; web ships independently of app-store review.
- Negative: two component libraries to maintain and design-review. The shared-logic package boundary must be enforced or it erodes back into duplication — extracting that package is real work not yet scoped anywhere in this corpus.
