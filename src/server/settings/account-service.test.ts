import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { MongoMemoryServer } from "mongodb-memory-server";
import { MongoClient, ObjectId } from "mongodb";

import { AppError } from "@/lib/errors/app-error";
import { effectivePermissions } from "@/server/auth/permissions";
import type { SessionContext } from "@/server/auth/types";
import { getDb, setMongoClientForTests } from "@/server/db/mongodb";
import { updateAccountNameForSession } from "@/server/settings/account-service";

function sessionFor(options: {
  userId: string;
  isDemo?: boolean;
  role?: SessionContext["membership"]["role"];
}): SessionContext {
  const isDemo = options.isDemo ?? false;
  const role = isDemo ? "viewer" : (options.role ?? "member");

  return {
    user: {
      id: options.userId,
      email: `${options.userId}@example.test`,
      name: "Original Name",
      emailVerified: true,
      isDemo,
    },
    workspace: {
      id: "ws_test",
      name: "Test Workspace",
      slug: "test-workspace",
    },
    membership: {
      id: `mem_${options.userId}`,
      workspaceId: "ws_test",
      userId: options.userId,
      role,
      permissions: effectivePermissions({
        role: options.role ?? "member",
        isDemo,
      }),
    },
  };
}

describe("account settings service", () => {
  let memory: MongoMemoryServer;
  let client: MongoClient;

  beforeAll(async () => {
    process.env.MONGODB_USE_TRANSACTIONS = "false";
    process.env.MONGODB_URI =
      "mongodb://127.0.0.1:27017/sylqen-account-settings-test";
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
    await getDb().dropDatabase();
    await getDb().collection("user").insertMany([
      {
        _id: new ObjectId(),
        id: "user_a",
        name: "Original Name",
        email: "user_a@example.test",
      },
      {
        _id: new ObjectId(),
        id: "user_demo",
        name: "Demo User",
        email: "user_demo@example.test",
        isDemo: true,
      },
    ]);
  });

  it("updates the authenticated user's display name", async () => {
    const session = sessionFor({ userId: "user_a", role: "member" });
    const result = await updateAccountNameForSession(session, {
      name: "  Ada Lovelace  ",
    });
    expect(result.name).toBe("Ada Lovelace");

    const doc = await getDb().collection("user").findOne({ id: "user_a" });
    expect(doc?.name).toBe("Ada Lovelace");
  });

  it("rejects invalid names", async () => {
    const session = sessionFor({ userId: "user_a" });
    await expect(
      updateAccountNameForSession(session, { name: "   " }),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR" } satisfies Partial<AppError>);
  });

  it("rejects demo accounts", async () => {
    const session = sessionFor({
      userId: "user_demo",
      role: "owner",
      isDemo: true,
    });
    await expect(
      updateAccountNameForSession(session, { name: "Hacked" }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });

    const doc = await getDb().collection("user").findOne({ id: "user_demo" });
    expect(doc?.name).toBe("Demo User");
  });

  it("does not update a different user id from the session", async () => {
    const session = sessionFor({ userId: "user_a" });
    await updateAccountNameForSession(session, {
      name: "Self Only",
      userId: "user_demo",
    } as { name: string });

    const self = await getDb().collection("user").findOne({ id: "user_a" });
    const other = await getDb().collection("user").findOne({ id: "user_demo" });
    expect(self?.name).toBe("Self Only");
    expect(other?.name).toBe("Demo User");
  });
});
