import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { MongoMemoryServer } from "mongodb-memory-server";
import { MongoClient } from "mongodb";

import { AppError } from "@/lib/errors/app-error";
import { effectivePermissions } from "@/server/auth/permissions";
import type { SessionContext } from "@/server/auth/types";
import { setMongoClientForTests } from "@/server/db/mongodb";
import {
  createWorkspaceWithOwner,
  findWorkspaceById,
  insertMembership,
  resetWorkspaceIndexesForTests,
} from "@/server/workspaces/repository";
import { updateWorkspaceNameForSession } from "@/server/workspaces/service";

function sessionFor(options: {
  userId: string;
  workspaceId: string;
  role: SessionContext["membership"]["role"];
  workspaceName?: string;
  workspaceSlug?: string;
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
      name: options.workspaceName ?? "Test Workspace",
      slug: options.workspaceSlug ?? "test-workspace",
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

describe("workspace settings service", () => {
  let memory: MongoMemoryServer;
  let client: MongoClient;
  let workspaceA: string;
  let workspaceB: string;
  let slugA: string;

  beforeAll(async () => {
    process.env.MONGODB_USE_TRANSACTIONS = "false";
    process.env.MONGODB_URI =
      "mongodb://127.0.0.1:27017/sylqen-workspace-settings-test";
    memory = await MongoMemoryServer.create();
    client = new MongoClient(memory.getUri());
    await client.connect();
    setMongoClientForTests(client);
  }, 60_000);

  afterAll(async () => {
    await client.close();
    await memory.stop();
    setMongoClientForTests(undefined);
    resetWorkspaceIndexesForTests();
    delete process.env.MONGODB_URI;
    delete process.env.MONGODB_USE_TRANSACTIONS;
  });

  beforeEach(async () => {
    resetWorkspaceIndexesForTests();
    await client.db().dropDatabase();
    const a = await createWorkspaceWithOwner({
      name: "Workspace A",
      ownerId: "user_owner_a",
    });
    const b = await createWorkspaceWithOwner({
      name: "Workspace B",
      ownerId: "user_owner_b",
    });
    workspaceA = a.workspace._id.toHexString();
    workspaceB = b.workspace._id.toHexString();
    slugA = a.workspace.slug;

    await insertMembership({
      workspaceId: workspaceA,
      userId: "user_member_a",
      role: "member",
    });
    await insertMembership({
      workspaceId: workspaceA,
      userId: "user_viewer_a",
      role: "viewer",
    });
  });

  it("allows owners to rename their session workspace without changing slug", async () => {
    const session = sessionFor({
      userId: "user_owner_a",
      workspaceId: workspaceA,
      role: "owner",
      workspaceName: "Workspace A",
      workspaceSlug: slugA,
    });

    const updated = await updateWorkspaceNameForSession(session, {
      name: "  Acme Ops  ",
    });

    expect(updated.name).toBe("Acme Ops");
    expect(updated.slug).toBe(slugA);

    const doc = await findWorkspaceById(workspaceA);
    expect(doc?.name).toBe("Acme Ops");
    expect(doc?.slug).toBe(slugA);
  });

  it("rejects invalid names", async () => {
    const session = sessionFor({
      userId: "user_owner_a",
      workspaceId: workspaceA,
      role: "owner",
      workspaceSlug: slugA,
    });

    await expect(
      updateWorkspaceNameForSession(session, { name: "A" }),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR" } satisfies Partial<AppError>);
  });

  it("rejects members, viewers, and demo accounts", async () => {
    const member = sessionFor({
      userId: "user_member_a",
      workspaceId: workspaceA,
      role: "member",
      workspaceSlug: slugA,
    });
    await expect(
      updateWorkspaceNameForSession(member, { name: "Nope" }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });

    const viewer = sessionFor({
      userId: "user_viewer_a",
      workspaceId: workspaceA,
      role: "viewer",
      workspaceSlug: slugA,
    });
    await expect(
      updateWorkspaceNameForSession(viewer, { name: "Nope" }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });

    const demo = sessionFor({
      userId: "user_owner_a",
      workspaceId: workspaceA,
      role: "owner",
      workspaceSlug: slugA,
      isDemo: true,
    });
    await expect(
      updateWorkspaceNameForSession(demo, { name: "Nope" }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("never updates a foreign workspace even if the payload tries", async () => {
    const session = sessionFor({
      userId: "user_owner_a",
      workspaceId: workspaceA,
      role: "owner",
      workspaceSlug: slugA,
    });

    await updateWorkspaceNameForSession(session, {
      name: "Owned Rename",
      workspaceId: workspaceB,
    } as { name: string });

    const foreign = await findWorkspaceById(workspaceB);
    expect(foreign?.name).toBe("Workspace B");

    const own = await findWorkspaceById(workspaceA);
    expect(own?.name).toBe("Owned Rename");
  });
});
