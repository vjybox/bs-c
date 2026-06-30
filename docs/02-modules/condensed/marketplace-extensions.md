# Marketplace & Extensions (Condensed Brief)

> Depth tier: condensed (v0.2 candidate for full 18-section treatment) · Status: v0.1 · Last updated: 2026-06-30
> Note: not one of the brief's original twelve pillars, but required by the brief's explicit instruction that every component support "plugins, extensions, future AI agents, automation, workflow engines, marketplace modules, custom integrations, third-party APIs" — this module is where that requirement becomes concrete rather than a slogan repeated in every other doc.

## Business Goal

Let third parties (and the platform team itself) ship new modules, automation action types, AI agent personas, and integrations without those additions requiring core platform changes — proving out the "new pillar modules register the same way the original twelve do" claim made in [`00-system-architecture.md`](../../01-architecture/00-system-architecture.md) §4.

## Key Functional Requirements

- `ExtensionListing` — a registered third-party (or first-party) extension declaring its required permissions, the entity types/action types/AI capabilities it contributes, and its own service-layer endpoint(s).
- `ExtensionInstallation` per tenant, with `ExtensionPermissionGrant`s scoped no more broadly than the installing user's own permissions (an extension can never exceed the access of the person who installed it — stated as a hard rule in [`05-security-privacy-compliance.md`](../../01-architecture/05-security-privacy-compliance.md) §8).
- Extension sandboxing: an extension's automation action types and AI agent contributions run through the same `EntityRef`/`ModelRouter`/permission-check code paths as native modules — no privileged shortcut.

## Data Sketch

`ExtensionListing {developer, name, requiredPermissions, contributedActionTypes, contributedEntityTypes}`, `ExtensionInstallation {tenantId, listingId, installedBy: PersonRef, status}`, `ExtensionPermissionGrant {installationId, permission, scope: EntityRef}`.

## API Surface Summary

`GET /marketplace/listings`, `POST /tenants/{id}/extensions/install`, `DELETE /tenants/{id}/extensions/{installationId}` (uninstall, triggers permission-grant revocation fan-out via the event bus).

## AI Opportunities

AI-assisted extension recommendation based on a tenant's usage patterns (e.g. heavy Meetings + low Documents usage suggests a contract-generation extension); AI agent personas themselves can be marketplace-distributed (a third party publishes a specialized `AIAgent` configuration, not just integration code).

## Recommended Future Enhancements

- Revenue-sharing model for paid third-party extensions — high business value (ecosystem flywheel), requires billing infrastructure not otherwise scoped in this v0.1 corpus, flagged explicitly as a dependency gap to resource separately.
- Extension capability versioning/compatibility checks (an extension declares which platform API version it targets, with automated compatibility testing on platform API changes) — directly extends the versioning policy in [`04-integration-api-gateway.md`](../../01-architecture/04-integration-api-gateway.md) §5 to third-party-developed code, not just first-party clients.
