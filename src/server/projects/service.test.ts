import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { MongoMemoryServer } from "mongodb-memory-server";
import { MongoClient } from "mongodb";

import { AppError } from "@/lib/errors/app-error";
import { effectivePermissions } from "@/server/auth/permissions";
import type { SessionContext } from "@/server/auth/types";
import { resetProjectIndexesForTests } from "@/server/projects/repository";
import {
  createProjectForSession,
  getProjectForSession,
  listProjectsForSession,
  updateProjectForSession,
} from "@/server/projects/service";
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

describe("projects service", () => {
  let memory: MongoMemoryServer;
  let client: MongoClient;
  let workspaceA: string;
  let workspaceB: string;

  beforeAll(async () => {
    process.env.MONGODB_USE_TRANSACTIONS = "false";
    process.env.MONGODB_URI = "mongodb://127.0.0.1:27017/sylqen-projects-test";
    memory = await MongoMemoryServer.create();
    client = new MongoClient(memory.getUri());
    await client.connect();
    setMongoClientForTests(client);
  }, 60_000);

  afterAll(async () => {
    await client.close();
    await memory.stop();
    setMongoClientForTests(undefined);
    resetProjectIndexesForTests();
    delete process.env.MONGODB_URI;
    delete process.env.MONGODB_USE_TRANSACTIONS;
  });

  beforeEach(async () => {
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

  it("creates, gets, updates, lists, and searches projects", async () => {
    const session = sessionFor({
      userId: "user_a",
      workspaceId: workspaceA,
      role: "owner",
    });

    const created = await createProjectForSession(session, {
      name: "Website redesign",
      status: "planning",
      clientName: "Acme",
      description: "Marketing site refresh",
      startDate: "2026-01-10",
      dueDate: "2026-03-01",
    });

    expect(created.status).toBe("planning");
    expect(created.startDate).toBe("2026-01-10");
    expect(created.dueDate).toBe("2026-03-01");

    const fetched = await getProjectForSession(session, created.id);
    expect(fetched.name).toBe("Website redesign");

    const updated = await updateProjectForSession(session, created.id, {
      name: "Website redesign",
      status: "active",
      clientName: "Acme",
      description: "Marketing site refresh",
      startDate: "2026-01-10",
      dueDate: "2026-03-15",
    });
    expect(updated.status).toBe("active");
    expect(updated.dueDate).toBe("2026-03-15");

    await createProjectForSession(session, {
      name: "Internal tooling",
      status: "on_hold",
      description: "Ops automation backlog",
    });

    const listed = await listProjectsForSession(session, {
      page: 1,
      pageSize: 10,
    });
    expect(listed.total).toBe(2);

    const searched = await listProjectsForSession(session, {
      q: "automation",
      page: 1,
      pageSize: 10,
    });
    expect(searched.total).toBe(1);
    expect(searched.items[0]?.name).toBe("Internal tooling");

    const clientSearch = await listProjectsForSession(session, {
      q: "acme",
      page: 1,
      pageSize: 10,
    });
    expect(clientSearch.total).toBe(1);
  });

  it("paginates server-side", async () => {
    const session = sessionFor({
      userId: "user_a",
      workspaceId: workspaceA,
      role: "owner",
    });

    for (let i = 0; i < 5; i += 1) {
      await createProjectForSession(session, {
        name: `Project ${i}`,
        status: "planning",
      });
    }

    const page1 = await listProjectsForSession(session, {
      page: 1,
      pageSize: 2,
    });
    const page2 = await listProjectsForSession(session, {
      page: 2,
      pageSize: 2,
    });

    expect(page1.total).toBe(5);
    expect(page1.pageCount).toBe(3);
    expect(page1.items).toHaveLength(2);
    expect(page2.items).toHaveLength(2);
    expect(page1.items[0]?.id).not.toBe(page2.items[0]?.id);
  });

  it("rejects invalid create input and date order", async () => {
    const session = sessionFor({
      userId: "user_a",
      workspaceId: workspaceA,
      role: "owner",
    });

    await expect(
      createProjectForSession(session, {
        name: "",
        status: "invalid",
      }),
    ).rejects.toMatchObject({
      code: "VALIDATION_ERROR",
    } satisfies Partial<AppError>);

    await expect(
      createProjectForSession(session, {
        name: "Bad dates",
        status: "planning",
        startDate: "2026-05-01",
        dueDate: "2026-04-01",
      }),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
  });

  it("returns NOT_FOUND for missing and malformed ids", async () => {
    const session = sessionFor({
      userId: "user_a",
      workspaceId: workspaceA,
      role: "owner",
    });

    await expect(
      getProjectForSession(session, "not-a-valid-object-id"),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });

    await expect(
      getProjectForSession(session, "507f1f77bcf86cd799439011"),
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

    const projectA = await createProjectForSession(ownerA, {
      name: "Tenant A Project",
      status: "active",
    });

    await expect(getProjectForSession(ownerB, projectA.id)).rejects.toMatchObject({
      code: "NOT_FOUND",
    });

    await expect(
      updateProjectForSession(ownerB, projectA.id, {
        name: "Hijacked",
        status: "completed",
      }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("rejects demo write attempts while allowing reads", async () => {
    const owner = sessionFor({
      userId: "user_a",
      workspaceId: workspaceA,
      role: "owner",
    });
    const created = await createProjectForSession(owner, {
      name: "Demo Visible",
      status: "planning",
    });

    const demo = sessionFor({
      userId: "user_a",
      workspaceId: workspaceA,
      role: "owner",
      isDemo: true,
    });

    const listed = await listProjectsForSession(demo, { page: 1, pageSize: 10 });
    expect(listed.total).toBe(1);
    await expect(getProjectForSession(demo, created.id)).resolves.toMatchObject({
      name: "Demo Visible",
    });

    await expect(
      createProjectForSession(demo, {
        name: "Nope",
        status: "planning",
      }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });

    await expect(
      updateProjectForSession(demo, created.id, {
        name: "Nope",
        status: "active",
      }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
