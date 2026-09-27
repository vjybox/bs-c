# ADR-0014: Desktop Strategy — Responsive Web, No Native Shell

**Status**: Accepted · **Date**: 2026-09-27 · **Full reasoning**: [`01-architecture/09-experience-and-interaction-rulebook.md`](../01-architecture/09-experience-and-interaction-rulebook.md) §5 · **Extends**: [ADR-0009](0009-mobile-client-architecture.md)

## Context

[ADR-0009](0009-mobile-client-architecture.md) settles mobile (React Native) and rejects PWA-first, but leaves desktop entirely undefined. Meanwhile the corpus already names desktop-shaped workflows: [`automation-workflow-engine.md`](../02-modules/automation-workflow-engine/automation-workflow-engine.md) §11 calls the DAG builder "inherently desktop/tablet-oriented," and [`security-compliance-center.md`](../02-modules/security-compliance-center/security-compliance-center.md) §11 calls Priya's admin tasks "desktop-oriented." The browser surface has no documented posture at all.

## Decision

Desktop is the **responsive web client at large-screen breakpoints**. No Electron or Tauri shell, no React Native for Desktop, no separate desktop build.

## Alternatives Considered

- **Electron/Tauri shell**: gains OS integration (global hotkey capture, menu bar, native notifications), but adds a third build target and update channel for workflows that are inherently at-desk and browser-adjacent.
- **React Native for Desktop**: maximizes reuse with mobile, but a touch-optimized component layer fights every desktop-shaped workflow — dense tables, multi-pane layouts, keyboard navigation.
- **Mobile-only, no desktop surface**: consistent with mobile-first, but strands Priya's admin console and Devon's pipeline in a touch UI the corpus already says are desktop-oriented.

## Consequences

- Positive: one web codebase serves both browser and desktop; no third platform to staff; desktop-shaped workflows get dense layouts without compromising the phone.
- Negative: no OS-level capture affordance — a real loss for at-desk capture, to be revisited if usage shows desk capture is common. Offline support is weaker in the browser than in the React Native client; rulebook §5 accepts this by declaring desktop-shaped journeys need not be offline-complete.
