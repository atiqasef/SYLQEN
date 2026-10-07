import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { MongoMemoryServer } from "mongodb-memory-server";
import { MongoClient } from "mongodb";

import { setMongoClientForTests } from "@/server/db/mongodb";
import {
  createWorkspaceWithOwner,
  findMembership,
  findPrimaryMembershipWithWorkspace,
  findWorkspaceById,
  insertMembership,
} from "@/server/workspaces/repository";
import { getPrimaryWorkspaceForUser } from "@/server/workspaces/service";

describe("workspace repository", () => {
  let memory: MongoMemoryServer;
  let client: MongoClient;

  beforeAll(async () => {
    process.env.MONGODB_USE_TRANSACTIONS = "false";
    process.env.MONGODB_URI = "mongodb://127.0.0.1:27017/sylqen-test";
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

  it("creates a workspace and owner membership", async () => {
    const created = await createWorkspaceWithOwner({
      name: "Acme Operations",
      ownerId: "user_owner_1",
    });

    expect(created.membership.role).toBe("owner");
    expect(created.membership.userId).toBe("user_owner_1");
    expect(created.workspace.slug).toContain("acme");

    const membership = await findMembership({
      userId: "user_owner_1",
      workspaceId: created.workspace._id.toHexString(),
    });
    expect(membership?.role).toBe("owner");

    const foreign = await findMembership({
      userId: "user_attacker",
      workspaceId: created.workspace._id.toHexString(),
    });
    expect(foreign).toBeNull();

    const workspace = await findWorkspaceById(
      created.workspace._id.toHexString(),
    );
    expect(workspace?.name).toBe("Acme Operations");
  });

  it("resolves primary membership + workspace in one lookup and isolates tenants", async () => {
    const workspaceA = await createWorkspaceWithOwner({
      name: "Workspace A",
      ownerId: "user_primary_a",
    });
    const workspaceB = await createWorkspaceWithOwner({
      name: "Workspace B",
      ownerId: "user_primary_b",
    });

    await insertMembership({
      workspaceId: workspaceA.workspace._id.toHexString(),
      userId: "user_member_a",
      role: "member",
    });

    const primary = await findPrimaryMembershipWithWorkspace("user_primary_a");
    expect(primary?.workspace.name).toBe("Workspace A");
    expect(primary?.membership.userId).toBe("user_primary_a");
    expect(primary?.membership.role).toBe("owner");

    const viaService = await getPrimaryWorkspaceForUser("user_member_a");
    expect(viaService?.workspace._id.toHexString()).toBe(
      workspaceA.workspace._id.toHexString(),
    );
    expect(viaService?.membership.role).toBe("member");

    const foreign = await findPrimaryMembershipWithWorkspace("user_primary_b");
    expect(foreign?.workspace._id.toHexString()).toBe(
      workspaceB.workspace._id.toHexString(),
    );
    expect(foreign?.workspace._id.toHexString()).not.toBe(
      workspaceA.workspace._id.toHexString(),
    );

    await expect(
      findPrimaryMembershipWithWorkspace("user_missing"),
    ).resolves.toBeNull();
  });
});
