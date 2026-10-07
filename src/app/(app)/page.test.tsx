import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import OverviewPage from "@/app/(app)/page";
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
        "workspace.read",
        "workspace.update",
        "invoices.read",
        "payments.read",
      ],
    },
  })),
}));

vi.mock("@/server/dashboard/service", () => ({
  getDashboardFinancialSnapshotForSession: vi.fn(async () => ({
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
    paymentTrend: [
      { date: "2026-03-01", amount: 200 },
      { date: "2026-03-10", amount: 250 },
    ],
    outstandingInvoices: [
      {
        id: "inv_outstanding",
        invoiceNumber: "INV-000010",
        customerNameSnapshot: "Acme Client",
        dueDate: "2026-03-01",
        currency: "USD",
        total: 300,
        amountPaid: 100,
        remaining: 200,
        status: "overdue",
        isOverdue: true,
      },
    ],
    recentPayments: [
      {
        id: "pay_1",
        amount: 250,
        currency: "USD",
        invoiceId: "inv_1",
        invoiceNumberSnapshot: "INV-000009",
        customerNameSnapshot: "Acme Client",
        method: "bank_transfer",
        paymentDate: "2026-03-10",
      },
    ],
    recentInvoices: [
      {
        id: "inv_1",
        invoiceNumber: "INV-000009",
        customerNameSnapshot: "Acme Client",
        status: "sent",
        total: 250,
        currency: "USD",
        issueDate: "2026-03-05",
        dueDate: "2026-03-20",
      },
    ],
    counts: {
      invoiceCountInPeriod: 4,
      paymentCountInPeriod: 2,
      outstandingCount: 1,
      overdueCount: 1,
    },
  })),
}));

describe("OverviewPage", () => {
  it("renders financial intelligence overview", async () => {
    const ui = await OverviewPage({
      searchParams: Promise.resolve({}),
    });
    render(<TooltipProvider>{ui}</TooltipProvider>);

    expect(
      screen.getByRole("heading", { name: /Welcome, Owner Example/i }),
    ).toBeInTheDocument();
    expect(screen.getAllByText(/Example Workspace/i).length).toBeGreaterThan(0);
    expect(
      screen.getByRole("heading", { name: /Financial overview/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByLabelText(/Total invoiced:/i),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/Total paid:/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Outstanding:/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Overdue:/i)).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /Payment revenue/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /Outstanding invoices/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /Recent payments/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /Recent invoices/i }),
    ).toBeInTheDocument();
    expect(
      screen.getAllByRole("link", { name: /INV-000010/i })[0],
    ).toHaveAttribute("href", "/invoices/inv_outstanding");
    expect(
      screen.getByRole("link", {
        name: /View payment .* for INV-000009/i,
      }),
    ).toHaveAttribute("href", "/payments/pay_1");
    expect(screen.getAllByText("Standard").length).toBeGreaterThan(0);
  });
});
