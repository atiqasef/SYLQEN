/**
 * Client-safe integration catalog types.
 * Never include secrets, tokens, connection strings, or env values.
 */

export const INTEGRATION_KEYS = [
  "stripe",
  "resend",
  "ai",
  "slack",
  "google-calendar",
  "quickbooks",
] as const;

export type IntegrationKey = (typeof INTEGRATION_KEYS)[number];

export type IntegrationCategory =
  | "Payments"
  | "Email"
  | "AI"
  | "Communication"
  | "Productivity"
  | "Accounting";

/**
 * Product-facing availability — derived from code + env presence flags only.
 * - active: live platform capability in this deployment
 * - not_configured: code path exists; delivery/provider env not ready
 * - reserved: schema/env reserved; live product flow not shipped
 * - planned: future integration, no backend
 */
export type IntegrationAvailability =
  | "active"
  | "not_configured"
  | "reserved"
  | "planned";

export type IntegrationConfigurationSource =
  | "environment"
  | "provider_abstraction"
  | "none";

/** Static catalog definition (no runtime status). */
export type IntegrationDefinition = {
  key: IntegrationKey;
  slug: string;
  name: string;
  category: IntegrationCategory;
  shortDescription: string;
  description: string;
  capabilities: string[];
  requiresConfiguration: boolean;
  /** Whether a workspace-level OAuth/API connection is supported (Phase 16: always false). */
  supportsWorkspaceConnection: boolean;
  planned: boolean;
};

/** Safe DTO for UI — no secrets. */
export type IntegrationCatalogItem = {
  key: IntegrationKey;
  slug: string;
  name: string;
  category: IntegrationCategory;
  shortDescription: string;
  description: string;
  capabilities: string[];
  availability: IntegrationAvailability;
  statusLabel: string;
  requiresConfiguration: boolean;
  supportsWorkspaceConnection: boolean;
  configurationSource: IntegrationConfigurationSource;
  configurationSummary: string;
  securityNote: string;
  planned: boolean;
};

export type IntegrationsSnapshot = {
  items: IntegrationCatalogItem[];
};
