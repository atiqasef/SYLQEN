import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { MongoMemoryServer } from "mongodb-memory-server";
import { MongoClient } from "mongodb";

import { AppError } from "@/lib/errors/app-error";
import { effectivePermissions } from "@/server/auth/permissions";
import type { SessionContext } from "@/server/auth/types";
import { getAnalyticsSnapshotForSession } from "@/server/analytics/service";
import { mergeFinancialTrendPoints } from "@/server/analytics/queries";
import { createCustomerForSession } from "@/server/customers/service";
import { resetCustomerIndexesForTests } from "@/server/customers/repository";
import { setMongoClientForTests } from "@/server/db/mongodb";
import { resetInvoiceIndexesForTests } from "@/server/invoices/repository";
import { createInvoiceForSession } from "@/server/invoices/service";
import { resetPaymentIndexesForTests } from "@/server/payments/repository";
import { createPaymentForSession } from "@/server/payments/service";
import { resetProductIndexesForTests } from "@/server/products/repository";
import { createProductForSession } from "@/server/products/service";
import { resetProjectIndexesForTests } from "@/server/projects/repository";
import { createProjectForSession } from "@/server/projects/service";
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

describe("analytics service", () => {
  let memory: MongoMemoryServer;
  let client: MongoClient;
  let workspaceA: string;
  let workspaceB: string;

  beforeAll(async () => {
    process.env.MONGODB_USE_TRANSACTIONS = "false";
    process.env.MONGODB_URI = "mongodb://127.0.0.1:27017/sylqen-analytics-test";
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
    resetCustomerIndexesForTests();
    resetProductIndexesForTests();
    resetProjectIndexesForTests();
    delete process.env.MONGODB_URI;
    delete process.env.MONGODB_USE_TRANSACTIONS;
  });

  beforeEach(async () => {
    resetPaymentIndexesForTests();
    resetInvoiceIndexesForTests();
    resetCustomerIndexesForTests();
    resetProductIndexesForTests();
    resetProjectIndexesForTests();
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

  it("merges financial trend buckets without mixing currencies", () => {
    const points = mergeFinancialTrendPoints({
      startDateOnly: "2026-03-10",
      endDateOnly: "2026-03-12",
      bucket: "day",
      invoiced: [
        { bucket: "2026-03-10", totalCents: 10000 },
        { bucket: "2026-03-12", totalCents: 5000 },
      ],
      paid: [{ bucket: "2026-03-11", totalCents: 2500 }],
    });
    expect(points).toEqual([
      { bucket: "2026-03-10", invoiced: 100, paid: 0 },
      { bucket: "2026-03-11", invoiced: 0, paid: 25 },
      { bucket: "2026-03-12", invoiced: 50, paid: 0 },
    ]);
  });

  it("builds rankings, trends, project status, and signals for the period", async () => {
    const session = sessionFor({
      userId: "user_a",
      workspaceId: workspaceA,
      role: "owner",
    });

    // Align period `now` with entity createdAt (real clock) for new-* counts.
    const now = new Date();
    const dateOnly = (offsetDays: number) => {
      const date = new Date(
        Date.UTC(
          now.getUTCFullYear(),
          now.getUTCMonth(),
          now.getUTCDate() + offsetDays,
        ),
      );
      return date.toISOString().slice(0, 10);
    };

    const customerA = await createCustomerForSession(session, {
      name: "Alpha Co",
      email: "alpha@example.test",
    });
    const customerB = await createCustomerForSession(session, {
      name: "Beta Co",
      email: "beta@example.test",
    });
    const productA = await createProductForSession(session, {
      name: "Alpha Product",
      sku: "SKU-A",
      price: 100,
      currency: "USD",
    });
    const productB = await createProductForSession(session, {
      name: "Beta Product",
      sku: "SKU-B",
      price: 40,
      currency: "USD",
    });

    const invoiceA = await createInvoiceForSession(session, {
      customerId: customerA.id,
      status: "sent",
      issueDate: dateOnly(-6),
      dueDate: dateOnly(-2),
      currency: "USD",
      lineItems: [{ productId: productA.id, quantity: 2 }],
    });
    await createInvoiceForSession(session, {
      customerId: customerB.id,
      status: "sent",
      issueDate: dateOnly(-5),
      dueDate: dateOnly(14),
      currency: "USD",
      lineItems: [{ productId: productB.id, quantity: 1 }],
    });
    await createPaymentForSession(session, {
      invoiceId: invoiceA.id,
      amount: 50,
      paymentDate: dateOnly(-3),
      method: "cash",
    });

    await createProjectForSession(session, {
      name: "Active Project",
      status: "active",
      dueDate: dateOnly(5),
    });
    await createProjectForSession(session, {
      name: "Planning Project",
      status: "planning",
    });
    await createProjectForSession(session, {
      name: "Done Project",
      status: "completed",
    });

    const snapshot = await getAnalyticsSnapshotForSession(
      session,
      { range: 30 },
      now,
    );

    expect(snapshot.period.rangeDays).toBe(30);
    expect(snapshot.primaryCurrency).toBe("USD");
    expect(snapshot.counts.invoiceCountInPeriod).toBe(2);
    expect(snapshot.counts.paymentCountInPeriod).toBe(1);
    expect(snapshot.counts.newCustomers).toBe(2);
    expect(snapshot.counts.newProducts).toBe(2);
    expect(snapshot.counts.newProjects).toBe(3);
    expect(snapshot.counts.overdueCount).toBeGreaterThanOrEqual(1);

    expect(snapshot.financialTrend.bucket).toBe("day");
    expect(
      snapshot.financialTrend.points.some((p) => p.invoiced === 200),
    ).toBe(true);
    expect(snapshot.financialTrend.points.some((p) => p.paid === 50)).toBe(
      true,
    );

    expect(snapshot.topCustomersByInvoiced[0]?.customerName).toBe("Alpha Co");
    expect(snapshot.topCustomersByInvoiced[0]?.invoiced).toBe(200);
    expect(snapshot.topProductsByInvoiced[0]?.productName).toBe(
      "Alpha Product",
    );
    expect(snapshot.topProductsByInvoiced[0]?.quantity).toBe(2);

    const active = snapshot.projectStatusCounts.find(
      (row) => row.status === "active",
    );
    expect(active?.count).toBe(1);
    expect(snapshot.signals.some((s) => s.id === "overdue-invoices")).toBe(
      true,
    );
  });

  it("keeps currency metrics and rankings separate", async () => {
    const session = sessionFor({
      userId: "user_a",
      workspaceId: workspaceA,
      role: "owner",
    });
    const customer = await createCustomerForSession(session, {
      name: "Multi Currency",
      email: "multi@example.test",
    });
    const usdProduct = await createProductForSession(session, {
      name: "USD Item",
      sku: "USD-1",
      price: 100,
      currency: "USD",
    });
    const eurProduct = await createProductForSession(session, {
      name: "EUR Item",
      sku: "EUR-1",
      price: 40,
      currency: "EUR",
    });
    await createInvoiceForSession(session, {
      customerId: customer.id,
      status: "sent",
      issueDate: "2026-03-10",
      dueDate: "2026-03-20",
      currency: "USD",
      lineItems: [{ productId: usdProduct.id, quantity: 1 }],
    });
    await createInvoiceForSession(session, {
      customerId: customer.id,
      status: "sent",
      issueDate: "2026-03-11",
      dueDate: "2026-03-20",
      currency: "EUR",
      lineItems: [{ productId: eurProduct.id, quantity: 1 }],
    });

    const snapshot = await getAnalyticsSnapshotForSession(
      session,
      { range: 30 },
      new Date(Date.UTC(2026, 2, 16)),
    );

    expect(snapshot.metricsByCurrency).toHaveLength(2);
    expect(snapshot.primaryCurrency).toBe("USD");
    expect(
      snapshot.topProductsByInvoiced.every((row) => row.currency === "USD"),
    ).toBe(true);
    expect(
      snapshot.metricsByCurrency.find((row) => row.currency === "EUR")
        ?.totalInvoiced,
    ).toBe(40);
  });

  it("isolates analytics by workspace", async () => {
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

    const customerA = await createCustomerForSession(sessionA, {
      name: "Only A",
      email: "only-a@example.test",
    });
    const productA = await createProductForSession(sessionA, {
      name: "Only A Product",
      sku: "ONLY-A",
      price: 75,
      currency: "USD",
    });
    await createInvoiceForSession(sessionA, {
      customerId: customerA.id,
      status: "sent",
      issueDate: "2026-03-10",
      dueDate: "2026-03-20",
      currency: "USD",
      lineItems: [{ productId: productA.id, quantity: 1 }],
    });

    const now = new Date(Date.UTC(2026, 2, 16));
    const snapA = await getAnalyticsSnapshotForSession(
      sessionA,
      { range: 30 },
      now,
    );
    const snapB = await getAnalyticsSnapshotForSession(
      sessionB,
      { range: 30 },
      now,
    );

    expect(snapA.counts.invoiceCountInPeriod).toBe(1);
    expect(snapB.counts.invoiceCountInPeriod).toBe(0);
    expect(snapB.topCustomersByInvoiced).toHaveLength(0);
  });

  it("allows demo viewers to read analytics", async () => {
    const session = sessionFor({
      userId: "user_a",
      workspaceId: workspaceA,
      role: "owner",
      isDemo: true,
    });
    const snapshot = await getAnalyticsSnapshotForSession(session, {
      range: 7,
    });
    expect(snapshot.period.rangeDays).toBe(7);
    expect(snapshot.counts.invoiceCountInPeriod).toBe(0);
  });

  it("rejects sessions missing analytics read permissions", async () => {
    const session = sessionFor({
      userId: "user_a",
      workspaceId: workspaceA,
      role: "owner",
    });
    session.membership.permissions = [];

    await expect(
      getAnalyticsSnapshotForSession(session, { range: 30 }),
    ).rejects.toMatchObject({
      code: "FORBIDDEN",
    } satisfies Partial<AppError>);
  });

  it("defaults invalid range to 30 days", async () => {
    const session = sessionFor({
      userId: "user_a",
      workspaceId: workspaceA,
      role: "owner",
    });
    const snapshot = await getAnalyticsSnapshotForSession(session, {
      range: 14,
    });
    expect(snapshot.period.rangeDays).toBe(30);
  });

  it("uses weekly buckets for 90-day range", async () => {
    const session = sessionFor({
      userId: "user_a",
      workspaceId: workspaceA,
      role: "owner",
    });
    const customer = await createCustomerForSession(session, {
      name: "Week Customer",
      email: "week@example.test",
    });
    const product = await createProductForSession(session, {
      name: "Week Product",
      sku: "WEEK-1",
      price: 20,
      currency: "USD",
    });
    await createInvoiceForSession(session, {
      customerId: customer.id,
      status: "sent",
      issueDate: "2026-01-05",
      dueDate: "2026-01-20",
      currency: "USD",
      lineItems: [{ productId: product.id, quantity: 1 }],
    });

    const snapshot = await getAnalyticsSnapshotForSession(
      session,
      { range: 90 },
      new Date(Date.UTC(2026, 2, 16)),
    );
    expect(snapshot.financialTrend.bucket).toBe("week");
    expect(
      snapshot.financialTrend.points.some((p) => p.invoiced === 20),
    ).toBe(true);
  });
});
