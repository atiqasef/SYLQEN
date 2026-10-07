import "server-only";

import { ObjectId, type Filter } from "mongodb";

import { summarizeAutomation } from "@/features/automations/schemas";
import type {
  AutomationAction,
  AutomationCondition,
  AutomationTrigger,
  AutomationTriggerType,
} from "@/features/automations/schemas";
import { getDb } from "@/server/db/mongodb";
import type {
  AutomationDocument,
  AutomationDTO,
  AutomationExecutionDocument,
  AutomationExecutionDTO,
  AutomationExecutionStatus,
  AutomationNotificationDocument,
  AutomationNotificationDTO,
} from "@/server/automations/types";

const AUTOMATIONS = "automations";
const EXECUTIONS = "automation_executions";
const NOTIFICATIONS = "automation_notifications";

let automationIndexesPromise: Promise<void> | undefined;

async function createAutomationIndexes() {
  const db = getDb();
  await db.collection(AUTOMATIONS).createIndexes([
    {
      key: { workspaceId: 1, createdAt: -1 },
      name: "automations_workspace_createdAt",
    },
    {
      key: { workspaceId: 1, enabled: 1, "trigger.type": 1 },
      name: "automations_workspace_enabled_trigger",
    },
    {
      key: { workspaceId: 1, name: 1 },
      name: "automations_workspace_name",
    },
  ]);
  await db.collection(EXECUTIONS).createIndexes([
    {
      key: { workspaceId: 1, automationId: 1, createdAt: -1 },
      name: "automation_exec_workspace_automation_createdAt",
    },
    {
      key: { workspaceId: 1, createdAt: -1 },
      name: "automation_exec_workspace_createdAt",
    },
    {
      key: { workspaceId: 1, automationId: 1, eventKey: 1 },
      unique: true,
      name: "automation_exec_workspace_automation_eventKey_unique",
    },
  ]);
  await db.collection(NOTIFICATIONS).createIndexes([
    {
      key: { workspaceId: 1, createdAt: -1 },
      name: "automation_notifications_workspace_createdAt",
    },
  ]);
}

export async function ensureAutomationIndexes() {
  if (!automationIndexesPromise) {
    automationIndexesPromise = createAutomationIndexes().catch(
      (error: unknown) => {
        automationIndexesPromise = undefined;
        throw error;
      },
    );
  }
  return automationIndexesPromise;
}

export function resetAutomationIndexesForTests() {
  automationIndexesPromise = undefined;
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function toAutomationDTO(doc: AutomationDocument): AutomationDTO {
  return {
    id: doc._id.toHexString(),
    name: doc.name,
    description: doc.description,
    enabled: doc.enabled,
    trigger: doc.trigger,
    conditions: doc.conditions,
    actions: doc.actions,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
    lastRunAt: doc.lastRunAt?.toISOString(),
    lastRunStatus: doc.lastRunStatus,
    summary: summarizeAutomation({
      trigger: doc.trigger,
      conditions: doc.conditions,
      actions: doc.actions,
    }),
  };
}

export function toExecutionDTO(
  doc: AutomationExecutionDocument,
): AutomationExecutionDTO {
  return {
    id: doc._id.toHexString(),
    automationId: doc.automationId,
    automationNameSnapshot: doc.automationNameSnapshot,
    triggerType: doc.triggerType,
    eventKey: doc.eventKey,
    status: doc.status,
    startedAt: doc.startedAt.toISOString(),
    completedAt: doc.completedAt.toISOString(),
    errorMessage: doc.errorMessage,
    actionSummaries: doc.actionSummaries,
    createdAt: doc.createdAt.toISOString(),
  };
}

export function toNotificationDTO(
  doc: AutomationNotificationDocument,
): AutomationNotificationDTO {
  return {
    id: doc._id.toHexString(),
    automationId: doc.automationId,
    automationNameSnapshot: doc.automationNameSnapshot,
    title: doc.title,
    message: doc.message,
    triggerType: doc.triggerType,
    eventKey: doc.eventKey,
    createdAt: doc.createdAt.toISOString(),
  };
}

export async function insertAutomation(input: {
  workspaceId: string;
  createdByUserId: string;
  name: string;
  description?: string;
  enabled: boolean;
  trigger: AutomationTrigger;
  conditions: AutomationCondition[];
  actions: AutomationAction[];
}): Promise<AutomationDocument> {
  const db = getDb();
  const now = new Date();
  const doc: AutomationDocument = {
    _id: new ObjectId(),
    workspaceId: input.workspaceId,
    name: input.name,
    description: input.description,
    enabled: input.enabled,
    trigger: input.trigger,
    conditions: input.conditions,
    actions: input.actions,
    createdByUserId: input.createdByUserId,
    createdAt: now,
    updatedAt: now,
  };
  await db.collection<AutomationDocument>(AUTOMATIONS).insertOne(doc);
  return doc;
}

export async function updateAutomationInWorkspace(options: {
  workspaceId: string;
  automationId: string;
  patch: {
    name: string;
    description?: string;
    enabled: boolean;
    trigger: AutomationTrigger;
    conditions: AutomationCondition[];
    actions: AutomationAction[];
  };
}): Promise<AutomationDocument | null> {
  if (!ObjectId.isValid(options.automationId)) {
    return null;
  }
  const db = getDb();
  const result = await db
    .collection<AutomationDocument>(AUTOMATIONS)
    .findOneAndUpdate(
      {
        _id: new ObjectId(options.automationId),
        workspaceId: options.workspaceId,
      },
      {
        $set: {
          ...options.patch,
          updatedAt: new Date(),
        },
      },
      { returnDocument: "after" },
    );
  return result ?? null;
}

export async function findAutomationInWorkspace(options: {
  workspaceId: string;
  automationId: string;
}): Promise<AutomationDocument | null> {
  if (!ObjectId.isValid(options.automationId)) {
    return null;
  }
  const db = getDb();
  return db.collection<AutomationDocument>(AUTOMATIONS).findOne({
    _id: new ObjectId(options.automationId),
    workspaceId: options.workspaceId,
  });
}

export async function listAutomationsInWorkspace(options: {
  workspaceId: string;
  q?: string;
  page: number;
  pageSize: number;
}): Promise<{ items: AutomationDocument[]; total: number }> {
  const db = getDb();
  const filter: Filter<AutomationDocument> = {
    workspaceId: options.workspaceId,
  };
  if (options.q) {
    filter.name = { $regex: escapeRegex(options.q), $options: "i" };
  }
  const skip = (options.page - 1) * options.pageSize;
  const collection = db.collection<AutomationDocument>(AUTOMATIONS);
  const [items, total] = await Promise.all([
    collection
      .find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(options.pageSize)
      .toArray(),
    collection.countDocuments(filter),
  ]);
  return { items, total };
}

export async function listEnabledAutomationsForTrigger(options: {
  workspaceId: string;
  triggerType: AutomationTriggerType;
}): Promise<AutomationDocument[]> {
  const db = getDb();
  return db
    .collection<AutomationDocument>(AUTOMATIONS)
    .find({
      workspaceId: options.workspaceId,
      enabled: true,
      "trigger.type": options.triggerType,
    })
    .toArray();
}

export async function markAutomationLastRun(options: {
  workspaceId: string;
  automationId: string;
  status: AutomationExecutionStatus;
  ranAt: Date;
}): Promise<void> {
  if (!ObjectId.isValid(options.automationId)) {
    return;
  }
  const db = getDb();
  await db.collection<AutomationDocument>(AUTOMATIONS).updateOne(
    {
      _id: new ObjectId(options.automationId),
      workspaceId: options.workspaceId,
    },
    {
      $set: {
        lastRunAt: options.ranAt,
        lastRunStatus: options.status,
        updatedAt: options.ranAt,
      },
    },
  );
}

export async function tryInsertExecution(
  input: Omit<AutomationExecutionDocument, "_id">,
): Promise<{ inserted: boolean; doc?: AutomationExecutionDocument }> {
  const db = getDb();
  const doc: AutomationExecutionDocument = {
    _id: new ObjectId(),
    ...input,
  };
  try {
    await db.collection<AutomationExecutionDocument>(EXECUTIONS).insertOne(doc);
    return { inserted: true, doc };
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      (error as { code?: number }).code === 11000
    ) {
      return { inserted: false };
    }
    throw error;
  }
}

export async function updateExecutionResult(options: {
  workspaceId: string;
  executionId: ObjectId;
  status: AutomationExecutionStatus;
  completedAt: Date;
  actionSummaries: string[];
  errorMessage?: string;
}): Promise<void> {
  const db = getDb();
  const setFields: Partial<AutomationExecutionDocument> = {
    status: options.status,
    completedAt: options.completedAt,
    actionSummaries: options.actionSummaries,
  };
  if (options.errorMessage) {
    setFields.errorMessage = options.errorMessage;
  }

  await db.collection<AutomationExecutionDocument>(EXECUTIONS).updateOne(
    {
      _id: options.executionId,
      workspaceId: options.workspaceId,
    },
    options.errorMessage
      ? { $set: setFields }
      : { $set: setFields, $unset: { errorMessage: "" } },
  );
}

export async function listExecutionsForAutomation(options: {
  workspaceId: string;
  automationId: string;
  limit: number;
}): Promise<AutomationExecutionDocument[]> {
  const db = getDb();
  return db
    .collection<AutomationExecutionDocument>(EXECUTIONS)
    .find({
      workspaceId: options.workspaceId,
      automationId: options.automationId,
    })
    .sort({ createdAt: -1 })
    .limit(options.limit)
    .toArray();
}

export async function listRecentExecutionsInWorkspace(options: {
  workspaceId: string;
  limit: number;
}): Promise<AutomationExecutionDocument[]> {
  const db = getDb();
  return db
    .collection<AutomationExecutionDocument>(EXECUTIONS)
    .find({ workspaceId: options.workspaceId })
    .sort({ createdAt: -1 })
    .limit(options.limit)
    .toArray();
}

export async function insertAutomationNotification(
  input: Omit<AutomationNotificationDocument, "_id">,
): Promise<AutomationNotificationDocument> {
  const db = getDb();
  const doc: AutomationNotificationDocument = {
    _id: new ObjectId(),
    ...input,
  };
  await db.collection<AutomationNotificationDocument>(NOTIFICATIONS).insertOne(doc);
  return doc;
}

export async function listRecentNotificationsInWorkspace(options: {
  workspaceId: string;
  limit: number;
}): Promise<AutomationNotificationDocument[]> {
  const db = getDb();
  return db
    .collection<AutomationNotificationDocument>(NOTIFICATIONS)
    .find({ workspaceId: options.workspaceId })
    .sort({ createdAt: -1 })
    .limit(options.limit)
    .toArray();
}
