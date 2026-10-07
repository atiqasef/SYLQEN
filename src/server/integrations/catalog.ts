import type { IntegrationDefinition, IntegrationKey } from "@/server/integrations/types";

/**
 * Single source of truth for integration metadata.
 * UI must consume resolved catalog items from the service — do not duplicate copy in components.
 */
export const INTEGRATION_DEFINITIONS: readonly IntegrationDefinition[] = [
  {
    key: "stripe",
    slug: "stripe",
    name: "Stripe",
    category: "Payments",
    shortDescription:
      "Reserved payment infrastructure for future invoice checkout and subscription billing.",
    description:
      "SYLQEN reserves Stripe environment configuration and keeps the payments domain provider-agnostic so checkout and subscription billing can be added without replacing manual payment records. Live Stripe Checkout, Customer Portal, and webhooks are not shipped in the product yet.",
    capabilities: [
      "Environment slots for Stripe secret and webhook configuration",
      "Payments domain designed for future provider-backed settlement",
      "Manual payment recording remains the live path today",
    ],
    requiresConfiguration: true,
    supportsWorkspaceConnection: false,
    planned: false,
  },
  {
    key: "resend",
    slug: "resend",
    name: "Resend",
    category: "Email",
    shortDescription:
      "Transactional email delivery for verification and password reset messages.",
    description:
      "Outbound email is configured at the platform level (not per workspace). When Resend credentials are present, SYLQEN sends transactional mail through Resend; otherwise a local/dev capture provider is used.",
    capabilities: [
      "Transactional email (verification, password reset)",
      "Provider abstraction (dev capture or Resend)",
      "System-configured delivery — not a per-workspace OAuth connection",
    ],
    requiresConfiguration: true,
    supportsWorkspaceConnection: false,
    planned: false,
  },
  {
    key: "ai",
    slug: "ai",
    name: "AI Assistant",
    category: "AI",
    shortDescription:
      "Provider-neutral AI completion abstraction with a mock implementation.",
    description:
      "SYLQEN includes an AI provider interface so future assistants can plug in without rewriting business modules. The active implementation is the mock provider; real OpenAI/Anthropic adapters are not wired. No workspace API keys are stored or exposed.",
    capabilities: [
      "AIProvider abstraction (complete interface)",
      "Mock provider for safe local/test behavior",
      "Feature flag via AI_ENABLED (no secrets in the browser)",
    ],
    requiresConfiguration: false,
    supportsWorkspaceConnection: false,
    planned: false,
  },
  {
    key: "slack",
    slug: "slack",
    name: "Slack",
    category: "Communication",
    shortDescription: "Notify teams about invoices, payments, and workspace events.",
    description:
      "Slack notifications are planned for a future phase. No OAuth install, bot token storage, or message delivery exists yet.",
    capabilities: ["Workspace notifications (planned)", "Channel routing (planned)"],
    requiresConfiguration: true,
    supportsWorkspaceConnection: false,
    planned: true,
  },
  {
    key: "google-calendar",
    slug: "google-calendar",
    name: "Google Calendar",
    category: "Productivity",
    shortDescription: "Sync project dates and reminders with Google Calendar.",
    description:
      "Google Calendar sync is planned. No Calendar API client or workspace OAuth connection is implemented.",
    capabilities: ["Project due-date sync (planned)", "Reminders (planned)"],
    requiresConfiguration: true,
    supportsWorkspaceConnection: false,
    planned: true,
  },
  {
    key: "quickbooks",
    slug: "quickbooks",
    name: "QuickBooks",
    category: "Accounting",
    shortDescription: "Export invoicing activity to QuickBooks accounting.",
    description:
      "QuickBooks export is planned. SYLQEN does not implement accounting sync, ledgers, or QuickBooks OAuth in this phase.",
    capabilities: ["Invoice export (planned)", "Payment export (planned)"],
    requiresConfiguration: true,
    supportsWorkspaceConnection: false,
    planned: true,
  },
] as const;

const bySlug = new Map(
  INTEGRATION_DEFINITIONS.map((item) => [item.slug, item] as const),
);

const byKey = new Map(
  INTEGRATION_DEFINITIONS.map((item) => [item.key, item] as const),
);

export function getIntegrationDefinitionBySlug(
  slug: string,
): IntegrationDefinition | undefined {
  return bySlug.get(slug);
}

export function getIntegrationDefinitionByKey(
  key: IntegrationKey,
): IntegrationDefinition | undefined {
  return byKey.get(key);
}

export function listIntegrationDefinitions(): IntegrationDefinition[] {
  return [...INTEGRATION_DEFINITIONS];
}
