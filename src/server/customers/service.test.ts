import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { MongoMemoryServer } from "mongodb-memory-server";
import { MongoClient } from "mongodb";

import { AppError } from "@/lib/errors/app-error";
import { effectivePermissions } from "@/server/auth/permissions";
import type { SessionContext } from "@/server/auth/types";
import { resetCustomerIndexesForTests } from "@/server/customers/repository";
import {
  createCustomerForSession,
  getCustomerForSession,
  listCustomersForSession,
  updateCustomerForSession,
} from "@/server/customers/service";
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

describe("customers service", () => {
  let memory: MongoMemoryServer;
  let client: MongoClient;
  let workspaceA: string;
  let workspaceB: string;

  beforeAll(async () => {
    process.env.MONGODB_USE_TRANSACTIONS = "false";
    process.env.MONGODB_URI = "mongodb://127.0.0.1:27017/sylqen-customers-test";
    memory = await MongoMemoryServer.create();
    client = new MongoClient(memory.getUri());
    await client.connect();
    setMongoClientForTests(client);
  }, 60_000);

  afterAll(async () => {
    await client.close();
    await memory.stop();
    setMongoClientForTests(undefined);
    delete process.env.MONGODB_URI;
    delete process.env.MONGODB_USE_TRANSACTIONS;
  });

  beforeEach(async () => {
    resetCustomerIndexesForTests();
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

  it("creates, gets, updates, lists, and searches customers within a workspace", async () => {
    const session = sessionFor({
      userId: "user_a",
      workspaceId: workspaceA,
      role: "owner",
    });

    const created = await createCustomerForSession(session, {
      name: "Ada Lovelace",
      email: "ada@example.com",
      company: "Analytical Engines",
      phone: "+1 555 0100",
    });

    expect(created.id).toBeTruthy();
    expect(created.email).toBe("ada@example.com");

    const fetched = await getCustomerForSession(session, created.id);
    expect(fetched.name).toBe("Ada Lovelace");

    const updated = await updateCustomerForSession(session, created.id, {
      name: "Ada L.",
      email: "ada@example.com",
      company: "Analytical Engines Ltd",
    });
    expect(updated.name).toBe("Ada L.");
    expect(updated.company).toBe("Analytical Engines Ltd");

    await createCustomerForSession(session, {
      name: "Grace Hopper",
      email: "grace@example.com",
      company: "US Navy",
    });

    const listed = await listCustomersForSession(session, {
      page: 1,
      pageSize: 10,
    });
    expect(listed.total).toBe(2);
    expect(listed.items).toHaveLength(2);

    const searched = await listCustomersForSession(session, {
      q: "Hopper",
      page: 1,
      pageSize: 10,
    });
    expect(searched.total).toBe(1);
    expect(searched.items[0]?.name).toBe("Grace Hopper");
  });

  it("paginates server-side and never returns the full collection at once", async () => {
    const session = sessionFor({
      userId: "user_a",
      workspaceId: workspaceA,
      role: "owner",
    });

    for (let i = 0; i < 5; i += 1) {
      await createCustomerForSession(session, {
        name: `Customer ${i}`,
        email: `customer-${i}@example.com`,
      });
    }

    const page1 = await listCustomersForSession(session, {
      page: 1,
      pageSize: 2,
    });
    const page2 = await listCustomersForSession(session, {
      page: 2,
      pageSize: 2,
    });
    const page3 = await listCustomersForSession(session, {
      page: 3,
      pageSize: 2,
    });

    expect(page1.total).toBe(5);
    expect(page1.pageCount).toBe(3);
    expect(page1.items).toHaveLength(2);
    expect(page2.items).toHaveLength(2);
    expect(page3.items).toHaveLength(1);
    expect(page1.items[0]?.id).not.toBe(page2.items[0]?.id);
  });

  it("rejects invalid create input", async () => {
    const session = sessionFor({
      userId: "user_a",
      workspaceId: workspaceA,
      role: "owner",
    });

    await expect(
      createCustomerForSession(session, {
        name: "",
        email: "bad",
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
      getCustomerForSession(session, "not-a-valid-object-id"),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });

    await expect(
      getCustomerForSession(session, "507f1f77bcf86cd799439011"),
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

    const customerA = await createCustomerForSession(ownerA, {
      name: "Tenant A Customer",
      email: "a-customer@example.com",
    });

    await expect(
      getCustomerForSession(ownerB, customerA.id),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });

    await expect(
      updateCustomerForSession(ownerB, customerA.id, {
        name: "Hijacked",
        email: "hijacked@example.com",
      }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });

    const stillA = await getCustomerForSession(ownerA, customerA.id);
    expect(stillA.name).toBe("Tenant A Customer");
  });

  it("rejects demo write attempts while allowing reads", async () => {
    const owner = sessionFor({
      userId: "user_a",
      workspaceId: workspaceA,
      role: "owner",
    });
    const created = await createCustomerForSession(owner, {
      name: "Demo Visible",
      email: "visible@example.com",
      company: "Demo Co",
    });

    const demo = sessionFor({
      userId: "user_a",
      workspaceId: workspaceA,
      role: "owner",
      isDemo: true,
    });

    const listed = await listCustomersForSession(demo, { page: 1, pageSize: 10 });
    expect(listed.total).toBe(1);

    const fetched = await getCustomerForSession(demo, created.id);
    expect(fetched.name).toBe("Demo Visible");

    await expect(
      createCustomerForSession(demo, {
        name: "Should Fail",
        email: "fail@example.com",
      }),
    ).rejects.toMatchObject({
      code: "FORBIDDEN",
      userMessage: expect.stringMatching(/read-only/i),
    });

    await expect(
      updateCustomerForSession(demo, created.id, {
        name: "Should Fail",
        email: "visible@example.com",
      }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("rejects duplicate emails inside the same workspace", async () => {
    const session = sessionFor({
      userId: "user_a",
      workspaceId: workspaceA,
      role: "owner",
    });

    await createCustomerForSession(session, {
      name: "One",
      email: "dup@example.com",
    });

    await expect(
      createCustomerForSession(session, {
        name: "Two",
        email: "DUP@example.com",
      }),
    ).rejects.toMatchObject({ code: "CONFLICT" });
  });
});
