import { describe, expect, it } from "vitest";

import { evaluateConditions } from "@/server/automations/conditions";
import type { AutomationEventContext } from "@/server/automations/types";

const base: AutomationEventContext = {
  type: "invoice.overdue",
  workspaceId: "ws_1",
  eventKey: "k1",
  occurredAt: new Date(),
  invoice: {
    id: "inv_1",
    invoiceNumber: "INV-1",
    currency: "USD",
    total: 250,
    dueDate: "2026-01-01",
    status: "sent",
  },
};

describe("automation conditions", () => {
  it("passes when conditions are empty (AND of none)", () => {
    expect(evaluateConditions([], base)).toBe(true);
  });

  it("requires all conditions (AND)", () => {
    expect(
      evaluateConditions(
        [
          { field: "invoice.currency", operator: "equals", value: "USD" },
          { field: "invoice.total", operator: "greater_than", value: 100 },
        ],
        base,
      ),
    ).toBe(true);
    expect(
      evaluateConditions(
        [
          { field: "invoice.currency", operator: "equals", value: "USD" },
          { field: "invoice.total", operator: "greater_than", value: 300 },
        ],
        base,
      ),
    ).toBe(false);
  });

  it("evaluates customer exists conditions", () => {
    const context: AutomationEventContext = {
      type: "customer.created",
      workspaceId: "ws_1",
      eventKey: "k2",
      occurredAt: new Date(),
      customer: {
        id: "c1",
        name: "Acme",
        email: "a@example.test",
        company: "Acme Co",
      },
    };
    expect(
      evaluateConditions(
        [{ field: "customer.company", operator: "exists", value: true }],
        context,
      ),
    ).toBe(true);
    expect(
      evaluateConditions(
        [{ field: "customer.company", operator: "exists", value: true }],
        {
          ...context,
          customer: { ...context.customer!, company: undefined },
        },
      ),
    ).toBe(false);
  });

  it("evaluates project status change conditions", () => {
    const context: AutomationEventContext = {
      type: "project.status_changed",
      workspaceId: "ws_1",
      eventKey: "k3",
      occurredAt: new Date(),
      project: {
        id: "p1",
        name: "Build",
        status: "active",
        previousStatus: "planning",
      },
    };
    expect(
      evaluateConditions(
        [
          { field: "project.status", operator: "equals", value: "active" },
          {
            field: "project.previous_status",
            operator: "equals",
            value: "planning",
          },
        ],
        context,
      ),
    ).toBe(true);
  });
});
