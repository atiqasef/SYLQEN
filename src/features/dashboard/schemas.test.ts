import { describe, expect, it } from "vitest";

import {
  mergeCurrencyMetrics,
  pickPrimaryCurrency,
  remainingFromTotals,
} from "./money";
import {
  dashboardPeriodBounds,
  dashboardRangeQuerySchema,
} from "./schemas";

describe("dashboard money helpers", () => {
  it("computes remaining with cents-safe arithmetic", () => {
    expect(remainingFromTotals(100, 40.1)).toBeCloseTo(59.9, 10);
    expect(remainingFromTotals(50, 50)).toBe(0);
    expect(remainingFromTotals(10, 12)).toBe(0);
  });

  it("merges currency metrics without mixing currencies", () => {
    const merged = mergeCurrencyMetrics([
      { currency: "USD", totalInvoicedCents: 10000 },
      { currency: "USD", totalPaidCents: 4000 },
      { currency: "EUR", totalInvoicedCents: 5000 },
      { currency: "USD", outstandingCents: 6000 },
    ]);

    expect(merged).toHaveLength(2);
    const usd = merged.find((row) => row.currency === "USD");
    const eur = merged.find((row) => row.currency === "EUR");
    expect(usd?.totalInvoiced).toBe(100);
    expect(usd?.totalPaid).toBe(40);
    expect(usd?.outstanding).toBe(60);
    expect(eur?.totalInvoiced).toBe(50);
    expect(eur?.totalPaid).toBe(0);
  });

  it("picks primary currency by invoiced amount", () => {
    expect(
      pickPrimaryCurrency([
        {
          currency: "EUR",
          totalInvoiced: 20,
          totalPaid: 0,
          outstanding: 0,
          overdue: 0,
        },
        {
          currency: "USD",
          totalInvoiced: 100,
          totalPaid: 0,
          outstanding: 0,
          overdue: 0,
        },
      ]),
    ).toBe("USD");
  });
});

describe("dashboard range schema", () => {
  it("defaults invalid ranges to 30 days", () => {
    expect(dashboardRangeQuerySchema.parse({}).range).toBe(30);
    expect(dashboardRangeQuerySchema.parse({ range: "14" }).range).toBe(30);
    expect(dashboardRangeQuerySchema.parse({ range: "7" }).range).toBe(7);
  });

  it("builds UTC-inclusive period bounds", () => {
    const now = new Date(Date.UTC(2026, 2, 15, 18, 30, 0));
    const period = dashboardPeriodBounds(7, now);
    expect(period.startDateOnly).toBe("2026-03-09");
    expect(period.endDateOnly).toBe("2026-03-15");
    expect(period.start.toISOString()).toBe("2026-03-09T00:00:00.000Z");
    expect(period.endExclusive.toISOString()).toBe("2026-03-16T00:00:00.000Z");
  });
});
