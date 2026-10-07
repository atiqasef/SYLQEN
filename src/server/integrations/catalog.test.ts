import { describe, expect, it } from "vitest";

import {
  getIntegrationDefinitionBySlug,
  INTEGRATION_DEFINITIONS,
  listIntegrationDefinitions,
} from "@/server/integrations/catalog";
import { INTEGRATION_KEYS } from "@/server/integrations/types";

describe("integration catalog", () => {
  it("includes required current and planned integrations", () => {
    const keys = listIntegrationDefinitions().map((item) => item.key);
    expect(keys).toEqual([...INTEGRATION_KEYS]);
    expect(keys).toContain("stripe");
    expect(keys).toContain("resend");
    expect(keys).toContain("ai");
    expect(keys).toContain("slack");
    expect(keys).toContain("google-calendar");
    expect(keys).toContain("quickbooks");
  });

  it("marks planned integrations without workspace connect", () => {
    const planned = INTEGRATION_DEFINITIONS.filter((item) => item.planned);
    expect(planned.length).toBeGreaterThan(0);
    for (const item of planned) {
      expect(item.supportsWorkspaceConnection).toBe(false);
    }
  });

  it("resolves definitions by slug", () => {
    expect(getIntegrationDefinitionBySlug("resend")?.name).toBe("Resend");
    expect(getIntegrationDefinitionBySlug("missing")).toBeUndefined();
  });

  it("keeps Stripe accurate as reserved infrastructure metadata", () => {
    const stripe = getIntegrationDefinitionBySlug("stripe");
    expect(stripe?.planned).toBe(false);
    expect(stripe?.category).toBe("Payments");
    expect(stripe?.capabilities.some((c) => /manual payment/i.test(c))).toBe(
      true,
    );
  });
});
