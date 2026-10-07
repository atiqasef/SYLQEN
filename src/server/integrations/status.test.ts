import { afterEach, describe, expect, it } from "vitest";

import { resetServerEnvCache } from "@/config/env";
import { getIntegrationDefinitionByKey } from "@/server/integrations/catalog";
import {
  assertSafeIntegrationDto,
  resolveIntegrationCatalogItem,
} from "@/server/integrations/status";

describe("integration status derivation", () => {
  afterEach(() => {
    delete process.env.STRIPE_SECRET_KEY;
    delete process.env.STRIPE_WEBHOOK_SECRET;
    delete process.env.EMAIL_PROVIDER;
    delete process.env.RESEND_API_KEY;
    delete process.env.AI_ENABLED;
    delete process.env.AI_PROVIDER;
    resetServerEnvCache();
  });

  it("marks Stripe as reserved without exposing credentials", () => {
    process.env.STRIPE_SECRET_KEY = "sk_test_should_never_leak";
    resetServerEnvCache();
    const item = resolveIntegrationCatalogItem(
      getIntegrationDefinitionByKey("stripe")!,
    );
    expect(item.availability).toBe("reserved");
    expect(item.statusLabel).toMatch(/credentials present/i);
    expect(JSON.stringify(item)).not.toContain("sk_test_should_never_leak");
    assertSafeIntegrationDto(item);
  });

  it("marks Resend active when delivery is configured", () => {
    process.env.EMAIL_PROVIDER = "resend";
    process.env.RESEND_API_KEY = "re_test_should_never_leak";
    resetServerEnvCache();
    const item = resolveIntegrationCatalogItem(
      getIntegrationDefinitionByKey("resend")!,
    );
    expect(item.availability).toBe("active");
    expect(item.statusLabel).toMatch(/system-configured/i);
    expect(JSON.stringify(item)).not.toContain("re_test_should_never_leak");
  });

  it("marks Resend not configured when using dev provider", () => {
    process.env.EMAIL_PROVIDER = "dev";
    delete process.env.RESEND_API_KEY;
    resetServerEnvCache();
    const item = resolveIntegrationCatalogItem(
      getIntegrationDefinitionByKey("resend")!,
    );
    expect(item.availability).toBe("not_configured");
  });

  it("exposes AI abstraction without claiming live model accounts", () => {
    process.env.AI_ENABLED = "true";
    process.env.AI_PROVIDER = "mock";
    resetServerEnvCache();
    const item = resolveIntegrationCatalogItem(
      getIntegrationDefinitionByKey("ai")!,
    );
    expect(item.availability).toBe("active");
    expect(item.configurationSource).toBe("provider_abstraction");
    expect(item.supportsWorkspaceConnection).toBe(false);
  });

  it("keeps planned integrations unavailable", () => {
    const item = resolveIntegrationCatalogItem(
      getIntegrationDefinitionByKey("slack")!,
    );
    expect(item.availability).toBe("planned");
    expect(item.statusLabel).toBe("Planned");
  });
});
