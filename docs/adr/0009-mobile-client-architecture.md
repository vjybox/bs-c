# ADR-0009: Mobile Client Architecture

**Status**: Accepted · **Date**: 2026-06-30 · **Related**: Product Philosophy's "mobile-first" tenet ([`00-vision/00-product-philosophy.md`](../00-vision/00-product-philosophy.md))

## Context

"Mobile-first" is a hard, explicit requirement. Card sharing (NFC/QR) and on-the-go contact capture are core flows, not secondary surfaces, so the mobile client architecture is a first-order decision.

## Decision

Build with **React Native** for iOS and Android from a shared codebase, with native modules for platform-specific capabilities (NFC, wallet integration, camera-based card scanning) where the cross-platform layer's abstractions fall short.

## Alternatives Considered

- **Fully native (Swift + Kotlin, two codebases)**: best possible platform integration and performance, but doubles mobile engineering cost and velocity at a stage where breadth of module coverage matters more than platform-specific polish.
- **Flutter**: strong cross-platform performance and tooling, but a smaller hiring pool and ecosystem overlap with the team's likely existing web (TypeScript) skill set compared to React Native.
- **PWA-first (no native shell)**: fastest to ship, fully shared code with web, but cannot deliver the NFC/native-wallet integration the core card-sharing flow depends on — disqualifying for this product's core use case, not just a trade-off.

## Consequences

- Positive: shared business logic with the web client where reasonable; faster cross-platform velocity than fully native; native modules cover the capability gaps that actually matter (NFC, wallet).
- Negative: native-module maintenance burden grows if platform-specific feature needs expand significantly — the documented trigger for revisiting is reaching a feature ceiling where native-module maintenance cost rivals a fully native rewrite for a specific surface (most likely the card-sharing/NFC flow first).
