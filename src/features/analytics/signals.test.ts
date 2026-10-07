import { describe, expect, it } from "vitest";

import { buildAnalyticsSignals } from "@/features/analytics/signals";
import type { AnalyticsProjectStatusCount } from "@/server/analytics/types";

const emptyProjects: AnalyticsProjectStatusCount[] = [
  { status: "planning", count: 0 },
  { status: "active", count: 0 },
  { status: "on_hold", count: 0 },
  { status: "completed", count: 0 },
];

describe("buildAnalyticsSignals", () => {
  it("returns empty when there is nothing to signal", () => {
    expect(
      buildAnalyticsSignals({
        overdueCount: 0,
        outstandingCount: 0,
        invoiceCountInPeriod: 0,
        paymentCountInPeriod: 0,
        projectStatusCounts: emptyProjects,
      }),
    ).toEqual([]);
  });

  it("flags overdue invoices", () => {
    const signals = buildAnalyticsSignals({
      overdueCount: 2,
      outstandingCount: 2,
      invoiceCountInPeriod: 2,
      paymentCountInPeriod: 1,
      projectStatusCounts: emptyProjects,
    });
    expect(signals.some((s) => s.id === "overdue-invoices")).toBe(true);
  });

  it("flags payments trailing invoicing when paid < half invoiced", () => {
    const signals = buildAnalyticsSignals({
      primary: {
        currency: "USD",
        totalInvoiced: 100,
        totalPaid: 40,
        outstanding: 60,
        overdue: 0,
      },
      overdueCount: 0,
      outstandingCount: 1,
      invoiceCountInPeriod: 1,
      paymentCountInPeriod: 1,
      projectStatusCounts: emptyProjects,
    });
    expect(signals.some((s) => s.id === "payments-trailing")).toBe(true);
  });

  it("does not flag payments trailing when paid is at least half", () => {
    const signals = buildAnalyticsSignals({
      primary: {
        currency: "USD",
        totalInvoiced: 100,
        totalPaid: 50,
        outstanding: 50,
        overdue: 0,
      },
      overdueCount: 0,
      outstandingCount: 1,
      invoiceCountInPeriod: 1,
      paymentCountInPeriod: 1,
      projectStatusCounts: emptyProjects,
    });
    expect(signals.some((s) => s.id === "payments-trailing")).toBe(false);
  });

  it("flags invoices without payments in period", () => {
    const signals = buildAnalyticsSignals({
      overdueCount: 0,
      outstandingCount: 1,
      invoiceCountInPeriod: 3,
      paymentCountInPeriod: 0,
      projectStatusCounts: emptyProjects,
    });
    expect(signals.some((s) => s.id === "no-payments-in-period")).toBe(true);
  });

  it("flags active project concentration at ≥70% with ≥3 projects", () => {
    const signals = buildAnalyticsSignals({
      overdueCount: 0,
      outstandingCount: 0,
      invoiceCountInPeriod: 0,
      paymentCountInPeriod: 0,
      projectStatusCounts: [
        { status: "planning", count: 0 },
        { status: "active", count: 7 },
        { status: "on_hold", count: 1 },
        { status: "completed", count: 2 },
      ],
    });
    expect(signals.some((s) => s.id === "active-project-concentration")).toBe(
      true,
    );
  });

  it("caps signals at four", () => {
    const signals = buildAnalyticsSignals({
      primary: {
        currency: "EUR",
        totalInvoiced: 200,
        totalPaid: 10,
        outstanding: 190,
        overdue: 50,
      },
      overdueCount: 3,
      outstandingCount: 5,
      invoiceCountInPeriod: 5,
      paymentCountInPeriod: 0,
      projectStatusCounts: [
        { status: "planning", count: 0 },
        { status: "active", count: 8 },
        { status: "on_hold", count: 0 },
        { status: "completed", count: 0 },
      ],
    });
    expect(signals.length).toBeLessThanOrEqual(4);
  });
});
