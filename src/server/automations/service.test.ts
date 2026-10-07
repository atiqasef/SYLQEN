import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { MongoMemoryServer } from "mongodb-memory-server";
import { MongoClient } from "mongodb";

import { AppError } from "@/lib/errors/app-error";
import { effectivePermissions } from "@/server/auth/permissions";
import type { SessionContext } from "@/server/auth/types";
import { processAutomationEvent } from "@/server/automations/engine";
import { resetAutomationIndexesForTests } from "@/server/automations/repository";
import {
  createAutomationForSession,
  getAutomationForSession,
  listAutomationExecutionsForSession,
  updateAutomationForSession,
} from "@/server/automations/service";
import { setMongoClientForTests } from "@/server/db/mongodb";
import { createWorkspaceWithOwner } from "@/server/workspaces/repository";

function sessionFor(options: {
  userId: string;
  workspaceId: string;
  role: SessionContext["membership"]["role"];
  isDemo?: boolean;
}): SessionContext {
  const isDemo = options.isDemo ?? false;
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
      role: isDemo ? "viewer" : options.role,
      permissions: effectivePermissions({
        role: options.role,
        isDemo,
      }),
    },
  };
}

describe("automations service and engine", () => {
  let memory: MongoMemoryServer;
  let client: MongoClient;
  let workspaceA: string;
  let workspaceB: string;

  beforeAll(async () => {
    process.env.MONGODB_USE_TRANSACTIONS = "false";
    process.env.MONGODB_URI = "mongodb://127.0.0.1:27017/sylqen-automations-test";
    memory = await MongoMemoryServer.create();
    client = new MongoClient(memory.getUri());
    await client.connect();
    setMongoClientForTests(client);
  }, 60_000);

  afterAll(async () => {
    await client.close();
    await memory.stop();
    setMongoClientForTests(undefined);
    resetAutomationIndexesForTests();
    delete process.env.MONGODB_URI;
    delete process.env.MONGODB_USE_TRANSACTIONS;
  });

  beforeEach(async () => {
    resetAutomationIndexesForTests();
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

  it("creates, updates, and isolates automations by workspace", async () => {
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

    const created = await createAutomationForSession(sessionA, {
      name: "Customer ping",
      enabled: true,
      trigger: { type: "customer.created" },
      conditions: [],
      actions: [
        {
          type: "notification.create",
          title: "New customer",
          message: "Follow up",
        },
      ],
    });

    await expect(
      getAutomationForSession(sessionB, created.id),
    ).rejects.toMatchObject({ code: "NOT_FOUND" } satisfies Partial<AppError>);

    const updated = await updateAutomationForSession(sessionA, created.id, {
      name: "Customer ping updated",
      enabled: false,
      trigger: { type: "customer.created" },
      conditions: [],
      actions: [
        {
          type: "notification.create",
          title: "New customer",
          message: "Follow up later",
        },
      ],
    });
    expect(updated.enabled).toBe(false);
    expect(updated.name).toBe("Customer ping updated");
  });

  it("blocks demo from creating automations", async () => {
    const session = sessionFor({
      userId: "user_a",
      workspaceId: workspaceA,
      role: "owner",
      isDemo: true,
    });
    await expect(
      createAutomationForSession(session, {
        name: "Demo blocked",
        trigger: { type: "customer.created" },
        actions: [
          {
            type: "notification.create",
            title: "x",
            message: "y",
          },
        ],
      }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" } satisfies Partial<AppError>);
  });

  it("runs matching automation, skips non-matching conditions, and protects duplicates", async () => {
    const session = sessionFor({
      userId: "user_a",
      workspaceId: workspaceA,
      role: "owner",
    });

    const automation = await createAutomationForSession(session, {
      name: "USD overdue",
      enabled: true,
      trigger: { type: "invoice.overdue" },
      conditions: [
        { field: "invoice.currency", operator: "equals", value: "USD" },
        { field: "invoice.total", operator: "greater_than", value: 100 },
      ],
      actions: [
        {
          type: "notification.create",
          title: "Overdue invoice",
          message: "Collect payment",
        },
      ],
    });

    const eventKey = "invoice.overdue:inv1:2026-01-01";
    await processAutomationEvent({
      type: "invoice.overdue",
      workspaceId: workspaceA,
      eventKey,
      occurredAt: new Date(),
      invoice: {
        id: "inv1",
        invoiceNumber: "INV-1",
        currency: "USD",
        total: 250,
        dueDate: "2026-01-01",
        status: "sent",
      },
    });

    let executions = await listAutomationExecutionsForSession(
      session,
      automation.id,
    );
    expect(executions).toHaveLength(1);
    expect(executions[0]?.status).toBe("success");

    // Duplicate event key should not create another execution.
    await processAutomationEvent({
      type: "invoice.overdue",
      workspaceId: workspaceA,
      eventKey,
      occurredAt: new Date(),
      invoice: {
        id: "inv1",
        invoiceNumber: "INV-1",
        currency: "USD",
        total: 250,
        dueDate: "2026-01-01",
        status: "sent",
      },
    });
    executions = await listAutomationExecutionsForSession(session, automation.id);
    expect(executions).toHaveLength(1);

    // Non-matching condition → skipped for a different event key.
    await processAutomationEvent({
      type: "invoice.overdue",
      workspaceId: workspaceA,
      eventKey: "invoice.overdue:inv2:2026-01-02",
      occurredAt: new Date(),
      invoice: {
        id: "inv2",
        invoiceNumber: "INV-2",
        currency: "EUR",
        total: 250,
        dueDate: "2026-01-02",
        status: "sent",
      },
    });
    executions = await listAutomationExecutionsForSession(session, automation.id);
    expect(executions.some((row) => row.status === "skipped")).toBe(true);
  });
});
