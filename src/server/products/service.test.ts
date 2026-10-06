import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { MongoMemoryServer } from "mongodb-memory-server";
import { MongoClient } from "mongodb";

import { AppError } from "@/lib/errors/app-error";
import { effectivePermissions } from "@/server/auth/permissions";
import type { SessionContext } from "@/server/auth/types";
import { resetProductIndexesForTests } from "@/server/products/repository";
import {
  createProductForSession,
  getProductForSession,
  listProductsForSession,
  updateProductForSession,
} from "@/server/products/service";
import { setMongoClientForTests } from "@/server/db/mongodb";
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

describe("products service", () => {
  let memory: MongoMemoryServer;
  let client: MongoClient;
  let workspaceA: string;
  let workspaceB: string;

  beforeAll(async () => {
    process.env.MONGODB_USE_TRANSACTIONS = "false";
    process.env.MONGODB_URI = "mongodb://127.0.0.1:27017/sylqen-products-test";
    memory = await MongoMemoryServer.create();
    client = new MongoClient(memory.getUri());
    await client.connect();
    setMongoClientForTests(client);
  }, 60_000);

  afterAll(async () => {
    await client.close();
    await memory.stop();
    setMongoClientForTests(undefined);
    resetProductIndexesForTests();
    delete process.env.MONGODB_URI;
    delete process.env.MONGODB_USE_TRANSACTIONS;
  });

  beforeEach(async () => {
    resetProductIndexesForTests();
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

  it("creates, gets, updates, lists, and searches products", async () => {
    const session = sessionFor({
      userId: "user_a",
      workspaceId: workspaceA,
      role: "owner",
    });

    const created = await createProductForSession(session, {
      name: "Consulting hour",
      sku: "svc-hour",
      price: 150,
      currency: "usd",
      unit: "hour",
      description: "Billable consulting unit",
    });

    expect(created.sku).toBe("SVC-HOUR");
    expect(created.currency).toBe("USD");

    const fetched = await getProductForSession(session, created.id);
    expect(fetched.name).toBe("Consulting hour");

    const updated = await updateProductForSession(session, created.id, {
      name: "Consulting hour (standard)",
      sku: "svc-hour",
      price: 175,
      currency: "USD",
      unit: "hour",
    });
    expect(updated.price).toBe(175);

    await createProductForSession(session, {
      name: "Retainer package",
      sku: "RET-PKG",
      price: 2000,
      currency: "USD",
      description: "Monthly retainer",
    });

    const listed = await listProductsForSession(session, {
      page: 1,
      pageSize: 10,
    });
    expect(listed.total).toBe(2);

    const searched = await listProductsForSession(session, {
      q: "retainer",
      page: 1,
      pageSize: 10,
    });
    expect(searched.total).toBe(1);
    expect(searched.items[0]?.sku).toBe("RET-PKG");
  });

  it("paginates server-side", async () => {
    const session = sessionFor({
      userId: "user_a",
      workspaceId: workspaceA,
      role: "owner",
    });

    for (let i = 0; i < 5; i += 1) {
      await createProductForSession(session, {
        name: `Product ${i}`,
        sku: `SKU-${i}`,
        price: i,
        currency: "USD",
      });
    }

    const page1 = await listProductsForSession(session, {
      page: 1,
      pageSize: 2,
    });
    const page2 = await listProductsForSession(session, {
      page: 2,
      pageSize: 2,
    });

    expect(page1.total).toBe(5);
    expect(page1.pageCount).toBe(3);
    expect(page1.items).toHaveLength(2);
    expect(page2.items).toHaveLength(2);
    expect(page1.items[0]?.id).not.toBe(page2.items[0]?.id);
  });

  it("rejects invalid create input", async () => {
    const session = sessionFor({
      userId: "user_a",
      workspaceId: workspaceA,
      role: "owner",
    });

    await expect(
      createProductForSession(session, {
        name: "",
        sku: "",
        price: -5,
        currency: "US",
      }),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR" } satisfies Partial<AppError>);
  });

  it("returns NOT_FOUND for missing and malformed ids", async () => {
    const session = sessionFor({
      userId: "user_a",
      workspaceId: workspaceA,
      role: "owner",
    });

    await expect(
      getProductForSession(session, "not-a-valid-object-id"),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });

    await expect(
      getProductForSession(session, "507f1f77bcf86cd799439011"),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("prevents cross-tenant read and update", async () => {
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

    const productA = await createProductForSession(ownerA, {
      name: "Tenant A Product",
      sku: "A-1",
      price: 10,
      currency: "USD",
    });

    await expect(getProductForSession(ownerB, productA.id)).rejects.toMatchObject({
      code: "NOT_FOUND",
    });

    await expect(
      updateProductForSession(ownerB, productA.id, {
        name: "Hijacked",
        sku: "HACK",
        price: 1,
        currency: "USD",
      }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("rejects demo write attempts while allowing reads", async () => {
    const owner = sessionFor({
      userId: "user_a",
      workspaceId: workspaceA,
      role: "owner",
    });
    const created = await createProductForSession(owner, {
      name: "Demo Visible",
      sku: "DEMO-1",
      price: 25,
      currency: "USD",
    });

    const demo = sessionFor({
      userId: "user_a",
      workspaceId: workspaceA,
      role: "owner",
      isDemo: true,
    });

    const listed = await listProductsForSession(demo, { page: 1, pageSize: 10 });
    expect(listed.total).toBe(1);
    await expect(getProductForSession(demo, created.id)).resolves.toMatchObject({
      name: "Demo Visible",
    });

    await expect(
      createProductForSession(demo, {
        name: "Nope",
        sku: "NOPE",
        price: 1,
        currency: "USD",
      }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });

    await expect(
      updateProductForSession(demo, created.id, {
        name: "Nope",
        sku: "DEMO-1",
        price: 1,
        currency: "USD",
      }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("rejects duplicate SKUs inside the same workspace", async () => {
    const session = sessionFor({
      userId: "user_a",
      workspaceId: workspaceA,
      role: "owner",
    });

    await createProductForSession(session, {
      name: "One",
      sku: "dup-sku",
      price: 1,
      currency: "USD",
    });

    await expect(
      createProductForSession(session, {
        name: "Two",
        sku: "DUP SKU",
        price: 2,
        currency: "USD",
      }),
    ).rejects.toMatchObject({ code: "CONFLICT" });
  });
});
