import "server-only";

import {
  getServerEnv,
  isEmailDeliveryConfigured,
} from "@/config/env";
import type { IntegrationDefinition } from "@/server/integrations/types";
import type {
  IntegrationAvailability,
  IntegrationCatalogItem,
  IntegrationConfigurationSource,
} from "@/server/integrations/types";

type RuntimeFlags = {
  stripeSecretPresent: boolean;
  stripeWebhookSecretPresent: boolean;
  emailDeliveryConfigured: boolean;
  emailProvider: "dev" | "resend";
  aiEnabled: boolean;
  aiProvider: "mock" | "anthropic" | "openai";
};

/** Derive presence flags only — never return secret values. */
export function readIntegrationRuntimeFlags(): RuntimeFlags {
  const env = getServerEnv();
  return {
    stripeSecretPresent: Boolean(env.STRIPE_SECRET_KEY),
    stripeWebhookSecretPresent: Boolean(env.STRIPE_WEBHOOK_SECRET),
    emailDeliveryConfigured: isEmailDeliveryConfigured(),
    emailProvider: isEmailDeliveryConfigured() ? "resend" : env.EMAIL_PROVIDER,
    aiEnabled: env.AI_ENABLED,
    aiProvider: env.AI_PROVIDER,
  };
}

function resolveStripe(
  def: IntegrationDefinition,
  flags: RuntimeFlags,
): IntegrationCatalogItem {
  const statusLabel = flags.stripeSecretPresent
    ? "Reserved · credentials present"
    : "Reserved · credentials not set";

  const configurationSummary = flags.stripeSecretPresent
    ? flags.stripeWebhookSecretPresent
      ? "Platform environment includes Stripe secret and webhook secret slots (values never shown)."
      : "Platform environment includes a Stripe secret slot; webhook secret is not set (values never shown)."
    : "Stripe environment slots are available but not set for this deployment.";

  return {
    ...def,
    availability: "reserved" satisfies IntegrationAvailability,
    statusLabel,
    configurationSource: "environment" satisfies IntegrationConfigurationSource,
    configurationSummary,
    securityNote:
      "Stripe secrets stay on the server. SYLQEN does not expose API keys or webhook secrets to the browser, and does not store per-workspace Stripe connections in this phase.",
  };
}

function resolveResend(def: IntegrationDefinition, flags: RuntimeFlags) {
  if (flags.emailDeliveryConfigured) {
    return {
      ...def,
      availability: "active" as const,
      statusLabel: "Active · system-configured",
      configurationSource: "environment" as const,
      configurationSummary:
        "Outbound email uses the Resend provider configured for this deployment (platform-level, not per workspace).",
      securityNote:
        "Resend API keys remain server-only. Workspaces cannot view or edit email credentials from the Integrations UI.",
    };
  }

  return {
    ...def,
    availability: "not_configured" as const,
    statusLabel:
      flags.emailProvider === "dev"
        ? "Dev capture · Resend not configured"
        : "Not configured",
    configurationSource: "environment" as const,
    configurationSummary:
      "Transactional email falls back to the local/dev capture provider until Resend is configured for the deployment.",
    securityNote:
      "Email credentials are never sent to the browser. Configuration is deployment-scoped via server environment variables.",
  };
}

function resolveAi(def: IntegrationDefinition, flags: RuntimeFlags) {
  const providerLabel =
    flags.aiProvider === "mock"
      ? "mock"
      : `${flags.aiProvider} (falls back to mock)`;

  return {
    ...def,
    availability: "active" as const,
    statusLabel: flags.aiEnabled
      ? `Abstraction ready · ${providerLabel}`
      : "Abstraction ready · AI disabled",
    configurationSource: "provider_abstraction" as const,
    configurationSummary: flags.aiEnabled
      ? `AI_ENABLED is on. Active runtime provider resolves to mock until a real ${flags.aiProvider === "mock" ? "model" : flags.aiProvider} adapter is implemented.`
      : "AI_ENABLED is off. The mock provider remains available for architecture and tests; completeAI rejects when disabled.",
    securityNote:
      "No AI API keys are exposed to the client. Workspace users cannot connect personal AI accounts from this page.",
  };
}

function resolvePlanned(def: IntegrationDefinition) {
  return {
    ...def,
    availability: "planned" as const,
    statusLabel: "Planned",
    configurationSource: "none" as const,
    configurationSummary:
      "Not available yet. No connect flow, OAuth install, or credential storage exists for this integration.",
    securityNote:
      "Unavailable integrations cannot be connected. SYLQEN does not accept browser-supplied workspace or credential data for planned providers.",
  };
}

export function resolveIntegrationCatalogItem(
  definition: IntegrationDefinition,
  flags: RuntimeFlags = readIntegrationRuntimeFlags(),
): IntegrationCatalogItem {
  if (definition.planned) {
    return resolvePlanned(definition);
  }

  switch (definition.key) {
    case "stripe":
      return resolveStripe(definition, flags);
    case "resend":
      return resolveResend(definition, flags);
    case "ai":
      return resolveAi(definition, flags);
    default:
      return resolvePlanned(definition);
  }
}

/** Ensure serialized DTOs never include credential material. */
export function assertSafeIntegrationDto(item: IntegrationCatalogItem): void {
  const json = JSON.stringify(item);
  const forbiddenPatterns = [/sk_live_/, /sk_test_/, /whsec_/, /Bearer\s+\S+/i];
  for (const pattern of forbiddenPatterns) {
    if (pattern.test(json)) {
      throw new Error(
        `Unsafe integration DTO serialization detected (${pattern.source})`,
      );
    }
  }
}
