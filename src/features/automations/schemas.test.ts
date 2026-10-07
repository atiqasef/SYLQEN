import { describe, expect, it } from "vitest";

import {
  automationInputSchema,
  summarizeAutomation,
} from "@/features/automations/schemas";

describe("automation schemas", () => {
  it("accepts a valid customer.created automation", () => {
    const parsed = automationInputSchema.safeParse({
      name: "Welcome notify",
      enabled: true,
      trigger: { type: "customer.created" },
      conditions: [{ field: "customer.company", operator: "exists", value: true }],
      actions: [
        {
          type: "notification.create",
          title: "New customer",
          message: "A customer was created.",
        },
      ],
    });
    expect(parsed.success).toBe(true);
  });

  it("rejects unknown triggers", () => {
    const parsed = automationInputSchema.safeParse({
      name: "Bad",
      trigger: { type: "invoice.paid" },
      actions: [
        {
          type: "notification.create",
          title: "x",
          message: "y",
        },
      ],
    });
    expect(parsed.success).toBe(false);
  });

  it("rejects conditions that do not match the trigger", () => {
    const parsed = automationInputSchema.safeParse({
      name: "Bad condition",
      trigger: { type: "customer.created" },
      conditions: [
        { field: "invoice.total", operator: "greater_than", value: 10 },
      ],
      actions: [
        {
          type: "notification.create",
          title: "x",
          message: "y",
        },
      ],
    });
    expect(parsed.success).toBe(false);
  });

  it("rejects more than five conditions", () => {
    const parsed = automationInputSchema.safeParse({
      name: "Too many",
      trigger: { type: "invoice.overdue" },
      conditions: Array.from({ length: 6 }, () => ({
        field: "invoice.currency",
        operator: "equals",
        value: "USD",
      })),
      actions: [
        {
          type: "notification.create",
          title: "x",
          message: "y",
        },
      ],
    });
    expect(parsed.success).toBe(false);
  });

  it("builds a readable summary", () => {
    const summary = summarizeAutomation({
      trigger: { type: "payment.received" },
      conditions: [
        { field: "payment.amount", operator: "greater_than", value: 50 },
      ],
      actions: [
        {
          type: "notification.create",
          title: "Large payment",
          message: "Follow up",
        },
      ],
    });
    expect(summary.toLowerCase()).toContain("payment received");
    expect(summary.toLowerCase()).toContain("greater than 50");
    expect(summary.toLowerCase()).toContain("large payment");
  });
});
