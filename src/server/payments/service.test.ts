import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { MongoMemoryServer } from "mongodb-memory-server";
import { MongoClient } from "mongodb";

import { AppError } from "@/lib/errors/app-error";
import { effectivePermissions } from "@/server/auth/permissions";
import type { SessionContext } from "@/server/auth/types";
import { createCustomerForSession } from "@/server/customers/service";
import { setMongoClientForTests } from "@/server/db/mongodb";
import { createInvoiceForSession } from "@/server/invoices/service";
import { resetInvoiceIndexesForTests } from "@/server/invoices/repository";
import { createProductForSession } from "@/server/products/service";
import { resetPaymentIndexesForTests } from "@/server/payments/repository";
import {
  createPaymentForSession,
  getInvoicePaymentSummaryForSession,
  getPaymentForSession,
  listPaymentsForSession,
} from "@/server/payments/service";
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

describe("payments service", () => {
  let memory: MongoMemoryServer;
  let client: MongoClient;
  let workspaceA: string;
  let workspaceB: string;

  beforeAll(async () => {
    process.env.MONGODB_USE_TRANSACTIONS = "false";
    process.env.MONGODB_URI = "mongodb://127.0.0.1:27017/sylqen-payments-test";
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

  async function seedInvoice(session: SessionContext, total = 100) {
    const customer = await createCustomerForSession(session, {
      name: "Pay Client",
      email: `pay-${Date.now()}@example.test`,
    });
    const product = await createProductForSession(session, {
      name: "Billable item",
      sku: `PAY-${Date.now()}`,
      price: total,
      currency: "USD",
    });
    const invoice = await createInvoiceForSession(session, {
      customerId: customer.id,
      status: "sent",
      issueDate: "2026-01-01",
      dueDate: "2026-01-31",
      currency: "USD",
      lineItems: [{ productId: product.id, quantity: 1 }],
    });
    return { customer, product, invoice };
  }

  it("creates payments with invoice/customer snapshots and authoritative currency", async () => {
    const session = sessionFor({
      userId: "user_a",
      workspaceId: workspaceA,
      role: "owner",
    });
    const { invoice } = await seedInvoice(session, 100);

    const payment = await createPaymentForSession(session, {
      invoiceId: invoice.id,
      amount: 40,
      paymentDate: "2026-02-01",
      method: "bank_transfer",
      reference: "REF-40",
    });

    expect(payment.amount).toBe(40);
    expect(payment.currency).toBe("USD");
    expect(payment.invoiceNumberSnapshot).toBe(invoice.invoiceNumber);
    expect(payment.customerNameSnapshot).toBe("Pay Client");
    expect(payment.method).toBe("bank_transfer");

    const summary = await getInvoicePaymentSummaryForSession(session, invoice.id);
    expect(summary.amountPaid).toBe(40);
    expect(summary.remaining).toBe(60);
    expect(summary.paymentCount).toBe(1);
  });

  it("rejects overpayment and fully-paid follow-ups", async () => {
    const session = sessionFor({
      userId: "user_a",
      workspaceId: workspaceA,
      role: "member",
    });
    const { invoice } = await seedInvoice(session, 50);

    await createPaymentForSession(session, {
      invoiceId: invoice.id,
      amount: 30,
      paymentDate: "2026-02-01",
      method: "cash",
    });

    await expect(
      createPaymentForSession(session, {
        invoiceId: invoice.id,
        amount: 25,
        paymentDate: "2026-02-02",
        method: "cash",
      }),
    ).rejects.toMatchObject({
      code: "VALIDATION_ERROR",
    });

    await createPaymentForSession(session, {
      invoiceId: invoice.id,
      amount: 20,
      paymentDate: "2026-02-03",
      method: "card",
    });

    await expect(
      createPaymentForSession(session, {
        invoiceId: invoice.id,
        amount: 1,
        paymentDate: "2026-02-04",
        method: "other",
      }),
    ).rejects.toMatchObject({
      code: "VALIDATION_ERROR",
    });

    const summary = await getInvoicePaymentSummaryForSession(session, invoice.id);
    expect(summary.amountPaid).toBe(50);
    expect(summary.remaining).toBe(0);
  });

  it("marks invoice paid when remaining balance reaches zero", async () => {
    const session = sessionFor({
      userId: "user_a",
      workspaceId: workspaceA,
      role: "owner",
    });
    const { invoice } = await seedInvoice(session, 25);

    await createPaymentForSession(session, {
      invoiceId: invoice.id,
      amount: 25,
      paymentDate: "2026-02-01",
      method: "cash",
    });

    const { getInvoiceForSession } = await import("@/server/invoices/service");
    const updated = await getInvoiceForSession(session, invoice.id);
    expect(updated.status).toBe("paid");
  });

  it("isolates payments across workspaces", async () => {
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
    const { invoice } = await seedInvoice(sessionA, 80);
    const payment = await createPaymentForSession(sessionA, {
      invoiceId: invoice.id,
      amount: 10,
      paymentDate: "2026-02-01",
      method: "cash",
    });

    await expect(getPaymentForSession(sessionB, payment.id)).rejects.toBeInstanceOf(
      AppError,
    );
    await expect(
      createPaymentForSession(sessionB, {
        invoiceId: invoice.id,
        amount: 10,
        paymentDate: "2026-02-01",
        method: "cash",
      }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("enforces payment permissions and demo read-only", async () => {
    const owner = sessionFor({
      userId: "user_a",
      workspaceId: workspaceA,
      role: "owner",
    });
    const demo = sessionFor({
      userId: "user_a",
      workspaceId: workspaceA,
      role: "owner",
      isDemo: true,
    });
    const { invoice } = await seedInvoice(owner, 40);
    const payment = await createPaymentForSession(owner, {
      invoiceId: invoice.id,
      amount: 10,
      paymentDate: "2026-02-01",
      method: "cash",
      reference: "demo-search",
    });

    const listed = await listPaymentsForSession(demo, { q: "demo-search" });
    expect(listed.total).toBe(1);
    expect(listed.items[0]?.id).toBe(payment.id);

    await expect(
      createPaymentForSession(demo, {
        invoiceId: invoice.id,
        amount: 5,
        paymentDate: "2026-02-02",
        method: "cash",
      }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("supports list pagination and search", async () => {
    const session = sessionFor({
      userId: "user_a",
      workspaceId: workspaceA,
      role: "owner",
    });
    const { invoice } = await seedInvoice(session, 100);

    for (let i = 0; i < 3; i += 1) {
      await createPaymentForSession(session, {
        invoiceId: invoice.id,
        amount: 10,
        paymentDate: "2026-02-01",
        method: "cash",
        reference: i === 1 ? "SEARCH-ME" : `other-${i}`,
      });
    }

    const page = await listPaymentsForSession(session, {
      page: 1,
      pageSize: 2,
    });
    expect(page.items).toHaveLength(2);
    expect(page.total).toBe(3);
    expect(page.pageCount).toBe(2);

    const searched = await listPaymentsForSession(session, { q: "SEARCH-ME" });
    expect(searched.total).toBe(1);
    expect(searched.items[0]?.reference).toBe("SEARCH-ME");
  });
});
