# Analytics & Insights (Condensed Brief)

> Depth tier: condensed (v0.2 candidate for full 18-section treatment) · Status: v0.1 · Last updated: 2026-06-30
> Note: not one of the brief's original twelve pillars, but added because every other module's "Analytics" section implies a consuming surface — this module is that surface, called out explicitly rather than left implicit.

## Business Goal

Turn the activity generated across every other module (cards shared, contacts captured, deals progressed, AI invocations, automation runs) into actionable insight for individuals and admins, without each module building its own bespoke reporting UI.

## Key Functional Requirements

- `MetricSnapshot`s aggregated from cross-module event-bus activity (reuses the same event backbone as Automation and Audit Logging — not a separate data pipeline).
- Configurable `Dashboard`s per persona (an individual's personal network-growth dashboard vs. an admin's org-wide compliance/usage dashboard).
- `InsightSuggestion` — AI-generated, proactive observations ("your response time to new contacts has slowed this month") rather than purely pull-based reporting.

## Data Sketch

`MetricSnapshot {metric, scope: EntityRef|tenant, value, period}`, `Dashboard {owner: PersonRef|OrganizationRef, widgets}`, `InsightSuggestion {scope, generatedBy: AITaskInvocationRef, content, dismissedAt}`.

## API Surface Summary

`GET /analytics/metrics?scope=...`, `POST /analytics/dashboards`, `GET /analytics/insights`.

## AI Opportunities

This module's entire `InsightSuggestion` entity IS an AI opportunity by design — proactive, AI-generated observations over the metric stream via the `ModelRouter`, not just passive charts.

## Recommended Future Enhancements

- Benchmarking against anonymized/aggregated cross-tenant norms ("your follow-up rate is in the top 20% of similar professionals") — high engagement value, requires careful privacy design (aggregate-only, no tenant-identifiable comparison data, reviewed against the Security & Compliance Center's data-classification policy before building).
- Predictive churn/disengagement scoring for relationships (extends `ReputationScore`-style computed-metric patterns from the Reputation module to relationship health specifically).
