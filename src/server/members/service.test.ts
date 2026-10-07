import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { MongoMemoryServer } from "mongodb-memory-server";
import { MongoClient, ObjectId } from "mongodb";

import { AppError } from "@/lib/errors/app-error";
import { effectivePermissions } from "@/server/auth/permissions";
import type { SessionContext } from "@/server/auth/types";
import { getDb, setMongoClientForTests } from "@/server/db/mongodb";
import {
  getMemberForSession,
  listMembersForSession,
  removeMemberForSession,
  updateMemberRoleForSession,
} from "@/server/members/service";
import {
  createWorkspaceWithOwner,
  findMembership,
  insertMembership,
  resetWorkspaceIndexesForTests,
} from "@/server/workspaces/repository";

function sessionFor(options: {
  userId: string;
  workspaceId: string;
  role: SessionContext["membership"]["role"];
  membershipId?: string;
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
      id: options.membershipId ?? `mem_${options.userId}`,
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

describe("members service", () => {
  let memory: MongoMemoryServer;
  let client: MongoClient;
  let workspaceA: string;
  let workspaceB: string;
  let ownerMembershipA: string;

  beforeAll(async () => {
    process.env.MONGODB_USE_TRANSACTIONS = "false";
    process.env.MONGODB_URI = "mongodb://127.0.0.1:27017/sylqen-members-test";
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
    await getDb().dropDatabase();
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
    ownerMembershipA = a.membership._id.toHexString();

    await getDb().collection("user").insertMany([
      {
        _id: new ObjectId(),
        id: "user_owner_a",
        name: "Owner A",
        email: "owner-a@example.test",
      },
      {
        _id: new ObjectId(),
        id: "user_member_a",
        name: "Member A",
        email: "member-a@example.test",
      },
      {
        _id: new ObjectId(),
        id: "user_viewer_a",
        name: "Viewer A",
        email: "viewer-a@example.test",
      },
      {
        _id: new ObjectId(),
        id: "user_owner_b",
        name: "Owner B",
        email: "owner-b@example.test",
      },
    ]);
  });

  it("lists workspace members with identity fields", async () => {
    await insertMembership({
      workspaceId: workspaceA,
      userId: "user_member_a",
      role: "member",
    });

    const owner = sessionFor({
      userId: "user_owner_a",
      workspaceId: workspaceA,
      role: "owner",
      membershipId: ownerMembershipA,
    });

    const list = await listMembersForSession(owner);
    expect(list.total).toBe(2);
    expect(list.ownerCount).toBe(1);
    expect(list.items.some((row) => row.email === "member-a@example.test")).toBe(
      true,
    );
    expect(list.items.find((row) => row.userId === "user_owner_a")?.isCurrentUser).toBe(
      true,
    );
  });

  it("allows owners to update roles and remove non-final owners", async () => {
    const member = await insertMembership({
      workspaceId: workspaceA,
      userId: "user_member_a",
      role: "member",
    });
    const owner = sessionFor({
      userId: "user_owner_a",
      workspaceId: workspaceA,
      role: "owner",
      membershipId: ownerMembershipA,
    });

    const updated = await updateMemberRoleForSession(owner, {
      membershipId: member._id.toHexString(),
      role: "viewer",
    });
    expect(updated.role).toBe("viewer");

    await removeMemberForSession(owner, {
      membershipId: member._id.toHexString(),
    });

    const gone = await findMembership({
      userId: "user_member_a",
      workspaceId: workspaceA,
    });
    expect(gone).toBeNull();
  });

  it("blocks member and viewer from managing membership", async () => {
    const memberDoc = await insertMembership({
      workspaceId: workspaceA,
      userId: "user_member_a",
      role: "member",
    });
    await insertMembership({
      workspaceId: workspaceA,
      userId: "user_viewer_a",
      role: "viewer",
    });

    const member = sessionFor({
      userId: "user_member_a",
      workspaceId: workspaceA,
      role: "member",
      membershipId: memberDoc._id.toHexString(),
    });
    const viewer = sessionFor({
      userId: "user_viewer_a",
      workspaceId: workspaceA,
      role: "viewer",
    });

    await expect(listMembersForSession(member)).resolves.toMatchObject({
      total: 3,
    });
    await expect(
      updateMemberRoleForSession(member, {
        membershipId: ownerMembershipA,
        role: "member",
      }),
    ).rejects.toBeInstanceOf(AppError);
    await expect(
      removeMemberForSession(viewer, {
        membershipId: memberDoc._id.toHexString(),
      }),
    ).rejects.toBeInstanceOf(AppError);
  });

  it("enforces final-owner protection for demote and remove", async () => {
    const owner = sessionFor({
      userId: "user_owner_a",
      workspaceId: workspaceA,
      role: "owner",
      membershipId: ownerMembershipA,
    });

    await expect(
      updateMemberRoleForSession(owner, {
        membershipId: ownerMembershipA,
        role: "member",
      }),
    ).rejects.toMatchObject({
      code: "VALIDATION_ERROR",
    });

    await expect(
      removeMemberForSession(owner, {
        membershipId: ownerMembershipA,
      }),
    ).rejects.toMatchObject({
      code: "VALIDATION_ERROR",
    });

    await insertMembership({
      workspaceId: workspaceA,
      userId: "user_member_a",
      role: "owner",
    });

    const demoted = await updateMemberRoleForSession(owner, {
      membershipId: ownerMembershipA,
      role: "member",
    });
    expect(demoted.role).toBe("member");
  });

  it("isolates members across workspaces", async () => {
    const memberA = await insertMembership({
      workspaceId: workspaceA,
      userId: "user_member_a",
      role: "member",
    });
    const ownerB = sessionFor({
      userId: "user_owner_b",
      workspaceId: workspaceB,
      role: "owner",
    });

    await expect(getMemberForSession(ownerB, memberA._id.toHexString())).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
    await expect(
      updateMemberRoleForSession(ownerB, {
        membershipId: memberA._id.toHexString(),
        role: "viewer",
      }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(
      removeMemberForSession(ownerB, {
        membershipId: memberA._id.toHexString(),
      }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("keeps demo accounts read-only for team mutations", async () => {
    const member = await insertMembership({
      workspaceId: workspaceA,
      userId: "user_member_a",
      role: "member",
    });
    const demo = sessionFor({
      userId: "user_owner_a",
      workspaceId: workspaceA,
      role: "owner",
      membershipId: ownerMembershipA,
      isDemo: true,
    });

    await expect(listMembersForSession(demo)).resolves.toMatchObject({
      total: 2,
    });
    await expect(
      updateMemberRoleForSession(demo, {
        membershipId: member._id.toHexString(),
        role: "viewer",
      }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(
      removeMemberForSession(demo, {
        membershipId: member._id.toHexString(),
      }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("enforces unique workspace/user membership", async () => {
    await insertMembership({
      workspaceId: workspaceA,
      userId: "user_member_a",
      role: "member",
    });

    await expect(
      insertMembership({
        workspaceId: workspaceA,
        userId: "user_member_a",
        role: "viewer",
      }),
    ).rejects.toThrow();
  });
});
