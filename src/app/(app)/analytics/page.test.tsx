import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import AnalyticsPage from "@/app/(app)/analytics/page";
import { TooltipProvider } from "@/components/ui/tooltip";

vi.mock("@/server/auth/session", () => ({
  requireVerifiedPageSession: vi.fn(async () => ({
    user: {
      id: "user_1",
      email: "owner@example.com",
      name: "Owner Example",
      emailVerified: true,
      isDemo: false,
    },
    workspace: {
      id: "ws_1",
      name: "Example Workspace",
      slug: "example-workspace",
    },
    membership: {
      id: "mem_1",
      workspaceId: "ws_1",
      userId: "user_1",
      role: "owner",
      permissions: [
        "invoices.read",
        "payments.read",
        "customers.read",
        "products.read",
        "projects.read",
      ],
    },
  })),
}));

vi.mock("@/server/analytics/service", () => ({
  getAnalyticsSnapshotForSession: vi.fn(async () => ({
    period: {
      rangeDays: 30,
      startDateOnly: "2026-02-15",
      endDateOnly: "2026-03-16",
    },
    metricsByCurrency: [
      {
        currency: "USD",
        totalInvoiced: 1200,
        totalPaid: 450,
        outstanding: 750,
        overdue: 200,
      },
    ],
    primaryCurrency: "USD",
    counts: {
      invoiceCountInPeriod: 4,
      paymentCountInPeriod: 2,
      paidInvoiceCount: 2,
      outstandingCount: 1,
      overdueCount: 1,
      newCustomers: 3,
      newProducts: 2,
      newProjects: 1,
    },
    financialTrend: {
      currency: "USD",
      bucket: "day",
      rangeDays: 30,
      points: [
        { bucket: "2026-03-10", invoiced: 200, paid: 50 },
        { bucket: "2026-03-11", invoiced: 0, paid: 100 },
      ],
    },
    topCustomersByInvoiced: [
      {
        customerId: "cust_1",
        customerName: "Acme Client",
        currency: "USD",
        invoiced: 800,
        invoiceCount: 2,
      },
    ],
    customersWithOutstanding: [
      {
        customerId: "cust_1",
        customerName: "Acme Client",
        currency: "USD",
        outstanding: 200,
        overdue: 200,
        invoiceCount: 1,
      },
    ],
    topProductsByInvoiced: [
      {
        productId: "prod_1",
        productName: "Consulting",
        sku: "CONS-1",
        currency: "USD",
        invoiced: 600,
        quantity: 3,
      },
    ],
    projectStatusCounts: [
      { status: "planning", count: 0 },
      { status: "active", count: 1 },
      { status: "on_hold", count: 0 },
      { status: "completed", count: 0 },
    ],
    projectsDueAttention: [],
    signals: [
      {
        id: "overdue-invoices",
        severity: "attention",
        title: "1 overdue invoice needs attention",
        detail: "Review receivables in Finance.",
        href: "/finance",
      },
    ],
  })),
}));

describe("AnalyticsPage", () => {
  it("renders analytics sections", async () => {
    const ui = await AnalyticsPage({
      searchParams: Promise.resolve({}),
    });
    render(<TooltipProvider>{ui}</TooltipProvider>);

    expect(
      screen.getByRole("heading", { name: "Analytics" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /Executive overview/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /Invoiced vs paid/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /Business signals/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /Customer insights/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /Product insights/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /Project insights/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("navigation", { name: "Analytics date range" }),
    ).toBeInTheDocument();
    expect(screen.getAllByText(/Acme Client/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Consulting/i).length).toBeGreaterThan(0);
  });
});
