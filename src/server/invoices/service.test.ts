import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { MongoMemoryServer } from "mongodb-memory-server";
import { MongoClient } from "mongodb";

import { AppError } from "@/lib/errors/app-error";
import { effectivePermissions } from "@/server/auth/permissions";
import type { SessionContext } from "@/server/auth/types";
import { createCustomerForSession } from "@/server/customers/service";
import { setMongoClientForTests } from "@/server/db/mongodb";
import { resetInvoiceIndexesForTests } from "@/server/invoices/repository";
import {
  createInvoiceForSession,
  getInvoiceForSession,
  listInvoicesForSession,
  updateInvoiceForSession,
} from "@/server/invoices/service";
import {
  createProductForSession,
  updateProductForSession,
} from "@/server/products/service";
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

describe("invoices service", () => {
  let memory: MongoMemoryServer;
  let client: MongoClient;
  let workspaceA: string;
  let workspaceB: string;

  beforeAll(async () => {
    process.env.MONGODB_USE_TRANSACTIONS = "false";
    process.env.MONGODB_URI = "mongodb://127.0.0.1:27017/sylqen-invoices-test";
    memory = await MongoMemoryServer.create();
    client = new MongoClient(memory.getUri());
    await client.connect();
    setMongoClientForTests(client);
  }, 60_000);

  afterAll(async () => {
    await client.close();
    await memory.stop();
    setMongoClientForTests(undefined);
    resetInvoiceIndexesForTests();
    delete process.env.MONGODB_URI;
    delete process.env.MONGODB_USE_TRANSACTIONS;
  });

  beforeEach(async () => {
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

  async function seedCustomerAndProduct(session: SessionContext) {
    const customer = await createCustomerForSession(session, {
      name: "Acme Client",
      email: `acme-${Date.now()}@example.test`,
    });
    const product = await createProductForSession(session, {
      name: "Consulting hour",
      sku: `SKU-${Date.now()}`,
      price: 100,
      currency: "USD",
    });
    return { customer, product };
  }

  it("creates invoices with snapshots, calculated totals, and unique numbers", async () => {
    const session = sessionFor({
      userId: "user_a",
      workspaceId: workspaceA,
      role: "owner",
    });
    const { customer, product } = await seedCustomerAndProduct(session);

    const created = await createInvoiceForSession(session, {
      customerId: customer.id,
      status: "draft",
      issueDate: "2026-01-01",
      dueDate: "2026-01-31",
      currency: "USD",
      notes: "Kickoff invoice",
      lineItems: [{ productId: product.id, quantity: 2.5 }],
    });

    expect(created.invoiceNumber).toBe("INV-000001");
    expect(created.customerNameSnapshot).toBe("Acme Client");
    expect(created.lineItems[0]?.productNameSnapshot).toBe("Consulting hour");
    expect(created.lineItems[0]?.skuSnapshot).toBe(product.sku);
    expect(created.lineItems[0]?.unitPrice).toBe(100);
    expect(created.lineItems[0]?.lineTotal).toBe(250);
    expect(created.subtotal).toBe(250);
    expect(created.total).toBe(250);

    const second = await createInvoiceForSession(session, {
      customerId: customer.id,
      status: "sent",
      issueDate: "2026-02-01",
      dueDate: "2026-02-28",
      currency: "USD",
      lineItems: [{ productId: product.id, quantity: 1 }],
    });
    expect(second.invoiceNumber).toBe("INV-000002");
  });

  it("preserves product snapshots after product updates", async () => {
    const session = sessionFor({
      userId: "user_a",
      workspaceId: workspaceA,
      role: "owner",
    });
    const { customer, product } = await seedCustomerAndProduct(session);

    const invoice = await createInvoiceForSession(session, {
      customerId: customer.id,
      status: "draft",
      issueDate: "2026-01-01",
      dueDate: "2026-01-15",
      currency: "USD",
      lineItems: [{ productId: product.id, quantity: 1 }],
    });

    await updateProductForSession(session, product.id, {
      name: "Changed name",
      sku: product.sku,
      price: 999,
      currency: "USD",
    });

    const fetched = await getInvoiceForSession(session, invoice.id);
    expect(fetched.lineItems[0]?.productNameSnapshot).toBe("Consulting hour");
    expect(fetched.lineItems[0]?.unitPrice).toBe(100);
    expect(fetched.total).toBe(100);
  });

  it("ignores browser-submitted totals by recalculating server-side", async () => {
    const session = sessionFor({
      userId: "user_a",
      workspaceId: workspaceA,
      role: "owner",
    });
    const { customer, product } = await seedCustomerAndProduct(session);

    const created = await createInvoiceForSession(session, {
      customerId: customer.id,
      status: "draft",
      issueDate: "2026-01-01",
      dueDate: "2026-01-15",
      currency: "USD",
      lineItems: [{ productId: product.id, quantity: 3 }],
      // Hostile extras must not affect totals.
      subtotal: 1,
      total: 1,
      lineTotal: 1,
      unitPrice: 1,
    } as unknown);

    expect(created.total).toBe(300);
    expect(created.subtotal).toBe(300);
    expect(created.lineItems[0]?.lineTotal).toBe(300);
  });

  it("allocates unique invoice numbers under concurrent creates", async () => {
    const session = sessionFor({
      userId: "user_a",
      workspaceId: workspaceA,
      role: "owner",
    });
    const { customer, product } = await seedCustomerAndProduct(session);

    const results = await Promise.all(
      Array.from({ length: 8 }, () =>
        createInvoiceForSession(session, {
          customerId: customer.id,
          status: "draft",
          issueDate: "2026-01-01",
          dueDate: "2026-01-15",
          currency: "USD",
          lineItems: [{ productId: product.id, quantity: 1 }],
        }),
      ),
    );

    const numbers = results.map((invoice) => invoice.invoiceNumber);
    expect(new Set(numbers).size).toBe(8);
  });

  it("searches and paginates invoices", async () => {
    const session = sessionFor({
      userId: "user_a",
      workspaceId: workspaceA,
      role: "owner",
    });
    const { customer, product } = await seedCustomerAndProduct(session);

    for (let i = 0; i < 3; i += 1) {
      await createInvoiceForSession(session, {
        customerId: customer.id,
        status: "draft",
        issueDate: "2026-01-01",
        dueDate: "2026-01-15",
        currency: "USD",
        lineItems: [{ productId: product.id, quantity: 1 }],
      });
    }

    const page1 = await listInvoicesForSession(session, {
      page: 1,
      pageSize: 2,
    });
    expect(page1.total).toBe(3);
    expect(page1.items).toHaveLength(2);

    const searched = await listInvoicesForSession(session, {
      q: "Acme",
      page: 1,
      pageSize: 10,
    });
    expect(searched.total).toBe(3);

    const byNumber = await listInvoicesForSession(session, {
      q: "INV-000002",
      page: 1,
      pageSize: 10,
    });
    expect(byNumber.total).toBe(1);
  });

  it("rejects cross-workspace customer and product references", async () => {
    const ownerA = sessionFor({
      userId: "user_a",
      workspaceId: workspaceA,
      role: "owner",
    });
    const ownerB = sessionFor({
      userId: "user_b",
      workspaceId: workspaceB,
      role: "owner",
    });

    const seededA = await seedCustomerAndProduct(ownerA);
    const seededB = await seedCustomerAndProduct(ownerB);

    await expect(
      createInvoiceForSession(ownerA, {
        customerId: seededB.customer.id,
        status: "draft",
        issueDate: "2026-01-01",
        dueDate: "2026-01-15",
        currency: "USD",
        lineItems: [{ productId: seededA.product.id, quantity: 1 }],
      }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });

    await expect(
      createInvoiceForSession(ownerA, {
        customerId: seededA.customer.id,
        status: "draft",
        issueDate: "2026-01-01",
        dueDate: "2026-01-15",
        currency: "USD",
        lineItems: [{ productId: seededB.product.id, quantity: 1 }],
      }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });

    const invoiceA = await createInvoiceForSession(ownerA, {
      customerId: seededA.customer.id,
      status: "draft",
      issueDate: "2026-01-01",
      dueDate: "2026-01-15",
      currency: "USD",
      lineItems: [{ productId: seededA.product.id, quantity: 1 }],
    });

    await expect(getInvoiceForSession(ownerB, invoiceA.id)).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });

  it("rejects demo writes while allowing reads", async () => {
    const owner = sessionFor({
      userId: "user_a",
      workspaceId: workspaceA,
      role: "owner",
    });
    const { customer, product } = await seedCustomerAndProduct(owner);
    const invoice = await createInvoiceForSession(owner, {
      customerId: customer.id,
      status: "draft",
      issueDate: "2026-01-01",
      dueDate: "2026-01-15",
      currency: "USD",
      lineItems: [{ productId: product.id, quantity: 1 }],
    });

    const demo = sessionFor({
      userId: "user_a",
      workspaceId: workspaceA,
      role: "owner",
      isDemo: true,
    });

    await expect(getInvoiceForSession(demo, invoice.id)).resolves.toMatchObject({
      invoiceNumber: invoice.invoiceNumber,
    });

    await expect(
      createInvoiceForSession(demo, {
        customerId: customer.id,
        status: "draft",
        issueDate: "2026-01-01",
        dueDate: "2026-01-15",
        currency: "USD",
        lineItems: [{ productId: product.id, quantity: 1 }],
      }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" } satisfies Partial<AppError>);

    await expect(
      updateInvoiceForSession(demo, invoice.id, {
        customerId: customer.id,
        status: "paid",
        issueDate: "2026-01-01",
        dueDate: "2026-01-15",
        currency: "USD",
        lineItems: [{ productId: product.id, quantity: 1 }],
      }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("updates invoice fields and recalculates totals", async () => {
    const session = sessionFor({
      userId: "user_a",
      workspaceId: workspaceA,
      role: "owner",
    });
    const { customer, product } = await seedCustomerAndProduct(session);
    const invoice = await createInvoiceForSession(session, {
      customerId: customer.id,
      status: "draft",
      issueDate: "2026-01-01",
      dueDate: "2026-01-15",
      currency: "USD",
      lineItems: [{ productId: product.id, quantity: 1 }],
    });

    const updated = await updateInvoiceForSession(session, invoice.id, {
      customerId: customer.id,
      status: "sent",
      issueDate: "2026-01-01",
      dueDate: "2026-02-01",
      currency: "USD",
      lineItems: [{ productId: product.id, quantity: 4 }],
    });

    expect(updated.invoiceNumber).toBe(invoice.invoiceNumber);
    expect(updated.status).toBe("sent");
    expect(updated.total).toBe(400);
  });
});
