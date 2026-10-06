import "server-only";

import type { UpdateFilter } from "mongodb";
import { ObjectId, type Filter } from "mongodb";

import {
  dateOnlyToUtcDate,
  utcDateToDateOnly,
  type ProjectStatus,
} from "@/features/projects/schemas";
import { getDb } from "@/server/db/mongodb";
import type { ProjectDocument, ProjectDTO } from "@/server/projects/types";

const PROJECTS = "projects";

/**
 * Process-scoped ensure: createIndexes runs at most once per warm runtime.
 * Failures clear the promise so the next call can retry.
 */
let projectIndexesPromise: Promise<void> | undefined;

async function createProjectIndexes() {
  const db = getDb();
  await db.collection(PROJECTS).createIndexes([
    {
      key: { workspaceId: 1, createdAt: -1 },
      name: "projects_workspace_createdAt",
    },
    {
      key: { workspaceId: 1, name: 1 },
      name: "projects_workspace_name",
    },
    {
      key: { workspaceId: 1, status: 1 },
      name: "projects_workspace_status",
    },
  ]);
}

export async function ensureProjectIndexes() {
  if (!projectIndexesPromise) {
    projectIndexesPromise = createProjectIndexes().catch((error: unknown) => {
      projectIndexesPromise = undefined;
      throw error;
    });
  }

  return projectIndexesPromise;
}

/** Test helper — clear the process-level index ensure guard. */
export function resetProjectIndexesForTests() {
  projectIndexesPromise = undefined;
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function toProjectDTO(doc: ProjectDocument): ProjectDTO {
  return {
    id: doc._id.toHexString(),
    name: doc.name,
    description: doc.description,
    status: doc.status,
    clientName: doc.clientName,
    startDate: doc.startDate ? utcDateToDateOnly(doc.startDate) : undefined,
    dueDate: doc.dueDate ? utcDateToDateOnly(doc.dueDate) : undefined,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  };
}

export async function insertProject(input: {
  workspaceId: string;
  createdByUserId: string;
  name: string;
  description?: string;
  status: ProjectStatus;
  clientName?: string;
  startDate?: string;
  dueDate?: string;
}): Promise<ProjectDocument> {
  const db = getDb();
  const now = new Date();
  const doc: ProjectDocument = {
    _id: new ObjectId(),
    workspaceId: input.workspaceId,
    name: input.name,
    description: input.description,
    status: input.status,
    clientName: input.clientName,
    startDate: input.startDate ? dateOnlyToUtcDate(input.startDate) : undefined,
    dueDate: input.dueDate ? dateOnlyToUtcDate(input.dueDate) : undefined,
    createdByUserId: input.createdByUserId,
    createdAt: now,
    updatedAt: now,
  };

  await db.collection<ProjectDocument>(PROJECTS).insertOne(doc);
  return doc;
}

export async function updateProjectInWorkspace(options: {
  workspaceId: string;
  projectId: string;
  patch: {
    name: string;
    description?: string;
    status: ProjectStatus;
    clientName?: string;
    startDate?: string;
    dueDate?: string;
  };
}): Promise<ProjectDocument | null> {
  if (!ObjectId.isValid(options.projectId)) {
    return null;
  }

  const db = getDb();
  const $set: Record<string, unknown> = {
    name: options.patch.name,
    status: options.patch.status,
    updatedAt: new Date(),
  };
  const $unset: Record<string, ""> = {};

  for (const key of ["description", "clientName"] as const) {
    const value = options.patch[key];
    if (value) {
      $set[key] = value;
    } else {
      $unset[key] = "";
    }
  }

  for (const key of ["startDate", "dueDate"] as const) {
    const value = options.patch[key];
    if (value) {
      $set[key] = dateOnlyToUtcDate(value);
    } else {
      $unset[key] = "";
    }
  }

  const update: UpdateFilter<ProjectDocument> = { $set };
  if (Object.keys($unset).length > 0) {
    update.$unset = $unset;
  }

  const result = await db.collection<ProjectDocument>(PROJECTS).findOneAndUpdate(
    {
      _id: new ObjectId(options.projectId),
      workspaceId: options.workspaceId,
    },
    update,
    { returnDocument: "after" },
  );

  return result ?? null;
}

export async function findProjectInWorkspace(options: {
  workspaceId: string;
  projectId: string;
}): Promise<ProjectDocument | null> {
  if (!ObjectId.isValid(options.projectId)) {
    return null;
  }

  const db = getDb();
  return db.collection<ProjectDocument>(PROJECTS).findOne({
    _id: new ObjectId(options.projectId),
    workspaceId: options.workspaceId,
  });
}

export async function listProjectsInWorkspace(options: {
  workspaceId: string;
  q?: string;
  page: number;
  pageSize: number;
}): Promise<{ items: ProjectDocument[]; total: number }> {
  const db = getDb();
  const filter: Filter<ProjectDocument> = {
    workspaceId: options.workspaceId,
  };

  if (options.q) {
    const pattern = escapeRegex(options.q.slice(0, 100));
    const regex = { $regex: pattern, $options: "i" as const };
    filter.$or = [
      { name: regex },
      { clientName: regex },
      { description: regex },
    ];
  }

  const collection = db.collection<ProjectDocument>(PROJECTS);
  const skip = (options.page - 1) * options.pageSize;

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
