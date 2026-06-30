# Modules Index

Every module in this platform is, architecturally, a first-class citizen registered the same way — see [`00-system-architecture.md`](../01-architecture/00-system-architecture.md) §4 for the registration mechanism that makes "new modules plug in the same way the original twelve do" literally true rather than aspirational. This index exists because doc depth varies (see Depth Tiers below); module *standing* in the architecture does not.

## Depth Tiers

| Tier | Meaning | Template |
|---|---|---|
| **Flagship (full)** | All 18 sections from the brief's template: Business Goal, User Story, Functional Requirements, Non-functional Requirements, UX Flow, Wireframe Description, Database Design, API Design, Backend Architecture, Frontend Architecture, Mobile Considerations, AI Opportunities, Security, Analytics, Testing Strategy, Future Enhancements, Risks, Open Questions. | One file per module, own directory. |
| **Condensed** | 6-section brief: Business Goal, Key Functional Requirements, Data Sketch, API Surface Summary, AI Opportunities, Recommended Future Enhancements. | `condensed/<module>.md`. |

Condensed modules are not lower-priority forever — they are v0.2 candidates for full-depth promotion. See [`../TODO.md`](../TODO.md) for the promotion backlog and rationale for why these six were chosen as the flagship set (highest architectural novelty + highest cross-module fan-in, per the design rationale in `docs/README.md`).

## Flagship Modules (full depth)

| Module | Doc | Summary |
|---|---|---|
| Identity & Card Core | [`identity-card-core/identity-card-core.md`](identity-card-core/identity-card-core.md) | Owns `Person`, `Account`, `Organization`, `Membership`, `DigitalCard` — the platform's source-of-truth identity graph every other module references via `EntityRef`. |
| Contacts & Networking Graph | [`contacts-networking-graph/contacts-networking-graph.md`](contacts-networking-graph/contacts-networking-graph.md) | Relationship capture, the network graph, and contact-exchange workflows built on top of Identity & Card Core. |
| AI Assistant Layer | [`ai-assistant-layer/ai-assistant-layer.md`](ai-assistant-layer/ai-assistant-layer.md) | The product-facing surface of the `ModelRouter`/`ModelProvider` abstraction defined in [`02-ai-abstraction-layer.md`](../01-architecture/02-ai-abstraction-layer.md): AI agent personas, task invocation, RAG context assembly. |
| CRM & Relationship Pipeline | [`crm-relationship-pipeline/crm-relationship-pipeline.md`](crm-relationship-pipeline/crm-relationship-pipeline.md) | Deal/pipeline management over the same relationship graph, rather than a siloed second contact database. |
| Automation & Workflow Engine | [`automation-workflow-engine/automation-workflow-engine.md`](automation-workflow-engine/automation-workflow-engine.md) | Product/UX surface for the Trigger→Condition→Action DAG engine defined in [`03-automation-workflow-engine.md`](../01-architecture/03-automation-workflow-engine.md). |
| Security & Compliance Center | [`security-compliance-center/security-compliance-center.md`](security-compliance-center/security-compliance-center.md) | Tenant-facing admin surface for the RBAC/audit/consent model defined in [`05-security-privacy-compliance.md`](../01-architecture/05-security-privacy-compliance.md). |

## Condensed Modules

| Module | Doc |
|---|---|
| Reputation | [`condensed/reputation.md`](condensed/reputation.md) |
| Portfolio | [`condensed/portfolio.md`](condensed/portfolio.md) |
| Certifications | [`condensed/certifications.md`](condensed/certifications.md) |
| Documents | [`condensed/documents.md`](condensed/documents.md) |
| Meetings | [`condensed/meetings.md`](condensed/meetings.md) |
| Knowledge | [`condensed/knowledge.md`](condensed/knowledge.md) |
| Collaboration | [`condensed/collaboration.md`](condensed/collaboration.md) |
| Communication | [`condensed/communication.md`](condensed/communication.md) |
| Analytics & Insights | [`condensed/analytics-insights.md`](condensed/analytics-insights.md) |
| Marketplace & Extensions | [`condensed/marketplace-extensions.md`](condensed/marketplace-extensions.md) |

## Cross-Cutting Pattern

Every module above — flagship or condensed — references other modules' data exclusively through the `EntityRef{module, entityType, entityId}` pattern defined once in [`01-data-architecture.md`](../01-architecture/01-data-architecture.md) §3, never by duplicating fields or foreign-keying across module schemas directly. See [`03-data-model/er-overview.md`](../03-data-model/er-overview.md) for the consolidated entity map.
