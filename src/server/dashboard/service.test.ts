import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { MongoMemoryServer } from "mongodb-memory-server";
import { MongoClient } from "mongodb";

import { AppError } from "@/lib/errors/app-error";
import { effectivePermissions } from "@/server/auth/permissions";
import type { SessionContext } from "@/server/auth/types";
import { createCustomerForSession } from "@/server/customers/service";
import { getDashboardFinancialSnapshotForSession } from "@/server/dashboard/service";
import { setMongoClientForTests } from "@/server/db/mongodb";
import { resetInvoiceIndexesForTests } from "@/server/invoices/repository";
import { createInvoiceForSession } from "@/server/invoices/service";
import { resetPaymentIndexesForTests } from "@/server/payments/repository";
import { createPaymentForSession } from "@/server/payments/service";
import { createProductForSession } from "@/server/products/service";
import { createWorkspaceWithOwner } from "@/server/workspaces/repository";

function sessionFor(options: {
  userId: string;
  workspaceId: string;
  role: SessionContext["membership"]["role"];
  isDemo?: boolean;
}): SessionContext {
  const isDemo = options.isDemo ?? false;
  const role = isDemo ? "viewer" : options.role;

  return {
    user: {
      id: options.userId,
      email: `${options.userId}@example.test`,
      name: options.userId,
      emailVerified: true,
      isDemo,
    },
    workspace: {
      id: options.workspaceId,
      name: "Test Workspace",
      slug: "test-workspace",
    },
    membership: {
      id: `mem_${options.userId}`,
      workspaceId: options.workspaceId,
      userId: options.userId,
      role,
      permissions: effectivePermissions({
        role: options.role,
        isDemo,
      }),
    },
  };
}

describe("dashboard financial service", () => {
  let memory: MongoMemoryServer;
  let client: MongoClient;
  let workspaceA: string;
  let workspaceB: string;

  beforeAll(async () => {
    process.env.MONGODB_USE_TRANSACTIONS = "false";
    process.env.MONGODB_URI = "mongodb://127.0.0.1:27017/sylqen-dashboard-test";
    memory = await MongoMemoryServer.create();
    client = new MongoClient(memory.getUri());
    await client.connect();
    setMongoClientForTests(client);
  }, 60_000);

  afterAll(async () => {
    await client.close();
    await memory.stop();
    setMongoClientForTests(undefined);
    resetPaymentIndexesForTests();
    resetInvoiceIndexesForTests();
    delete process.env.MONGODB_URI;
    delete process.env.MONGODB_USE_TRANSACTIONS;
  });

  beforeEach(async () => {
    resetPaymentIndexesForTests();
    resetInvoiceIndexesForTests();
    await client.db().dropDatabase();
    const a = await createWorkspaceWithOwner({
      name: "Workspace A",
      ownerId: "user_a",
    });
    const b = await createWorkspaceWithOwner({
      name: "Workspace B",
      ownerId: "user_b",
    });
    workspaceA = a.workspace._id.toHexString();
    workspaceB = b.workspace._id.toHexString();
  });

  async function seedInvoice(
    session: SessionContext,
    options: {
      total: number;
      status?: "draft" | "sent" | "paid" | "overdue";
      issueDate?: string;
      dueDate?: string;
      currency?: string;
    },
  ) {
    const stamp = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const customer = await createCustomerForSession(session, {
      name: `Client ${stamp}`,
      email: `client-${stamp}@example.test`,
    });
    const product = await createProductForSession(session, {
      name: `Item ${stamp}`,
      sku: `SKU-${stamp}`,
      price: options.total,
      currency: options.currency ?? "USD",
    });
    const invoice = await createInvoiceForSession(session, {
      customerId: customer.id,
      status: options.status ?? "sent",
      issueDate: options.issueDate ?? "2026-03-10",
      dueDate: options.dueDate ?? "2026-03-20",
      currency: options.currency ?? "USD",
      lineItems: [{ productId: product.id, quantity: 1 }],
    });
    return invoice;
  }

  it("aggregates invoiced, paid, outstanding, and overdue correctly", async () => {
    const session = sessionFor({
      userId: "user_a",
      workspaceId: workspaceA,
      role: "owner",
    });

    const openInvoice = await seedInvoice(session, {
      total: 100,
      issueDate: "2026-03-10",
      dueDate: "2026-03-12",
      status: "sent",
    });
    const partialInvoice = await seedInvoice(session, {
      total: 80,
      issueDate: "2026-03-11",
      dueDate: "2026-04-01",
      status: "sent",
    });
    await seedInvoice(session, {
      total: 50,
      issueDate: "2026-03-12",
      dueDate: "2026-04-01",
      status: "draft",
    });

    await createPaymentForSession(session, {
      invoiceId: partialInvoice.id,
      amount: 30,
      paymentDate: "2026-03-14",
      method: "cash",
    });
    await createPaymentForSession(session, {
      invoiceId: openInvoice.id,
      amount: 25,
      paymentDate: "2026-03-15",
      method: "bank_transfer",
    });

    const now = new Date(Date.UTC(2026, 2, 16, 12, 0, 0));
    const snapshot = await getDashboardFinancialSnapshotForSession(
      session,
      { range: 30 },
      now,
    );

    const usd = snapshot.metricsByCurrency.find((row) => row.currency === "USD");
    expect(usd?.totalInvoiced).toBe(180);
    expect(usd?.totalPaid).toBe(55);
    expect(usd?.outstanding).toBe(125);
    expect(usd?.overdue).toBe(75);
    expect(snapshot.counts.overdueCount).toBe(1);
    expect(snapshot.outstandingInvoices[0]?.invoiceNumber).toBe(
      openInvoice.invoiceNumber,
    );
    expect(snapshot.paymentTrend.some((point) => point.amount === 25)).toBe(
      true,
    );
  });

  it("handles fully paid invoices and multiple payments", async () => {
    const session = sessionFor({
      userId: "user_a",
      workspaceId: workspaceA,
      role: "owner",
    });
    const invoice = await seedInvoice(session, {
      total: 60,
      issueDate: "2026-03-10",
      dueDate: "2026-03-30",
    });
    await createPaymentForSession(session, {
      invoiceId: invoice.id,
      amount: 20,
      paymentDate: "2026-03-11",
      method: "cash",
    });
    await createPaymentForSession(session, {
      invoiceId: invoice.id,
      amount: 40,
      paymentDate: "2026-03-12",
      method: "card",
    });

    const snapshot = await getDashboardFinancialSnapshotForSession(
      session,
      { range: 30 },
      new Date(Date.UTC(2026, 2, 16)),
    );
    const usd = snapshot.metricsByCurrency.find((row) => row.currency === "USD");
    expect(usd?.totalPaid).toBe(60);
    expect(usd?.outstanding).toBe(0);
    expect(snapshot.counts.outstandingCount).toBe(0);
  });

  it("keeps currency metrics separate", async () => {
    const session = sessionFor({
      userId: "user_a",
      workspaceId: workspaceA,
      role: "owner",
    });
    await seedInvoice(session, {
      total: 100,
      currency: "USD",
      issueDate: "2026-03-10",
    });
    await seedInvoice(session, {
      total: 40,
      currency: "EUR",
      issueDate: "2026-03-11",
    });

    const snapshot = await getDashboardFinancialSnapshotForSession(
      session,
      { range: 30 },
      new Date(Date.UTC(2026, 2, 16)),
    );
    expect(snapshot.metricsByCurrency).toHaveLength(2);
    expect(snapshot.primaryCurrency).toBe("USD");
    expect(
      snapshot.metricsByCurrency.find((row) => row.currency === "EUR")
        ?.totalInvoiced,
    ).toBe(40);
  });

  it("isolates workspace data and enforces read permissions", async () => {
    const sessionA = sessionFor({
      userId: "user_a",
      workspaceId: workspaceA,
      role: "owner",
    });
    const sessionB = sessionFor({
      userId: "user_b",
      workspaceId: workspaceB,
      role: "owner",
    });
    await seedInvoice(sessionA, { total: 100, issueDate: "2026-03-10" });

    const snapshotB = await getDashboardFinancialSnapshotForSession(
      sessionB,
      { range: 30 },
      new Date(Date.UTC(2026, 2, 16)),
    );
    expect(snapshotB.counts.invoiceCountInPeriod).toBe(0);

    const noPerms: SessionContext = {
      ...sessionA,
      membership: {
        ...sessionA.membership,
        permissions: ["workspace.read"],
      },
    };
    await expect(
      getDashboardFinancialSnapshotForSession(noPerms, { range: 30 }),
    ).rejects.toBeInstanceOf(AppError);
  });

  it("returns empty snapshot safely", async () => {
    const session = sessionFor({
      userId: "user_a",
      workspaceId: workspaceA,
      role: "viewer",
    });
    const snapshot = await getDashboardFinancialSnapshotForSession(session, {
      range: 7,
    });
    expect(snapshot.metricsByCurrency).toEqual([]);
    expect(snapshot.recentPayments).toEqual([]);
    expect(snapshot.recentInvoices).toEqual([]);
    expect(snapshot.period.rangeDays).toBe(7);
  });

  it("filters metrics by selected date range", async () => {
    const session = sessionFor({
      userId: "user_a",
      workspaceId: workspaceA,
      role: "owner",
    });
    await seedInvoice(session, {
      total: 100,
      issueDate: "2026-03-14",
      dueDate: "2026-03-28",
    });
    await seedInvoice(session, {
      total: 200,
      issueDate: "2026-02-01",
      dueDate: "2026-02-28",
    });

    const now = new Date(Date.UTC(2026, 2, 16, 12, 0, 0));
    const last7 = await getDashboardFinancialSnapshotForSession(
      session,
      { range: 7 },
      now,
    );
    const usd = last7.metricsByCurrency.find((row) => row.currency === "USD");
    expect(usd?.totalInvoiced).toBe(100);
    expect(last7.counts.invoiceCountInPeriod).toBe(1);
  });
});
