import "server-only";

import { ObjectId } from "mongodb";

import { getDb } from "@/server/db/mongodb";
import type { Role } from "@/server/auth/types";
import type {
  MembershipDocument,
  WorkspaceDocument,
} from "@/server/workspaces/types";

const WORKSPACES = "workspaces";
const MEMBERSHIPS = "memberships";

let workspaceIndexesPromise: Promise<void> | undefined;

async function createWorkspaceIndexes() {
  const db = getDb();
  await Promise.all([
    db.collection(WORKSPACES).createIndexes([
      { key: { slug: 1 }, unique: true, name: "workspaces_slug_unique" },
      { key: { ownerId: 1 }, name: "workspaces_ownerId" },
    ]),
    db.collection(MEMBERSHIPS).createIndexes([
      {
        key: { workspaceId: 1, userId: 1 },
        unique: true,
        name: "memberships_workspace_user_unique",
      },
      {
        key: { workspaceId: 1, createdAt: 1 },
        name: "memberships_workspace_createdAt",
      },
      { key: { userId: 1 }, name: "memberships_userId" },
    ]),
  ]);
}

export async function ensureWorkspaceIndexes() {
  if (!workspaceIndexesPromise) {
    workspaceIndexesPromise = createWorkspaceIndexes().catch((error: unknown) => {
      workspaceIndexesPromise = undefined;
      throw error;
    });
  }

  await workspaceIndexesPromise;
}

/** Test helper: clear process-scoped index promise between cases. */
export function resetWorkspaceIndexesForTests() {
  workspaceIndexesPromise = undefined;
}

function slugify(input: string): string {
  const base = input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);

  return base.length > 0 ? base : "workspace";
}

export async function createWorkspaceWithOwner(options: {
  name: string;
  ownerId: string;
}): Promise<{ workspace: WorkspaceDocument; membership: MembershipDocument }> {
  const db = getDb();
  const now = new Date();
  const baseSlug = slugify(options.name);
  let slug = baseSlug;
  let attempt = 0;

  while (await db.collection(WORKSPACES).findOne({ slug })) {
    attempt += 1;
    slug = `${baseSlug}-${attempt}`;
  }

  const workspaceId = new ObjectId();
  const membershipId = new ObjectId();

  const workspace: WorkspaceDocument = {
    _id: workspaceId,
    name: options.name,
    slug,
    ownerId: options.ownerId,
    createdAt: now,
    updatedAt: now,
  };

  const membership: MembershipDocument = {
    _id: membershipId,
    workspaceId: workspaceId.toHexString(),
    userId: options.ownerId,
    role: "owner",
    createdAt: now,
    updatedAt: now,
  };

  await db.collection<WorkspaceDocument>(WORKSPACES).insertOne(workspace);
  await db.collection<MembershipDocument>(MEMBERSHIPS).insertOne(membership);

  return { workspace, membership };
}

export async function findMembershipsForUser(
  userId: string,
): Promise<MembershipDocument[]> {
  const db = getDb();
  return db
    .collection<MembershipDocument>(MEMBERSHIPS)
    .find({ userId })
    .sort({ createdAt: 1 })
    .toArray();
}

type PrimaryWorkspaceAggregateRow = {
  membership: MembershipDocument;
  workspace: WorkspaceDocument | null;
};

/**
 * Resolve the user's earliest membership and its workspace in one round-trip.
 * Workspace identity still comes from the membership record (server-side), never
 * from browser-supplied IDs.
 */
export async function findPrimaryMembershipWithWorkspace(
  userId: string,
): Promise<{
  workspace: WorkspaceDocument;
  membership: MembershipDocument;
} | null> {
  const db = getDb();
  const rows = await db
    .collection<MembershipDocument>(MEMBERSHIPS)
    .aggregate<PrimaryWorkspaceAggregateRow>([
      { $match: { userId } },
      { $sort: { createdAt: 1 } },
      { $limit: 1 },
      {
        $lookup: {
          from: WORKSPACES,
          let: { workspaceId: "$workspaceId" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $ne: ["$$workspaceId", null] },
                    { $ne: ["$$workspaceId", ""] },
                    {
                      $eq: [
                        "$_id",
                        {
                          $convert: {
                            input: "$$workspaceId",
                            to: "objectId",
                            onError: null,
                            onNull: null,
                          },
                        },
                      ],
                    },
                  ],
                },
              },
            },
            { $limit: 1 },
          ],
          as: "workspaceDocs",
        },
      },
      {
        $project: {
          membership: {
            _id: "$_id",
            workspaceId: "$workspaceId",
            userId: "$userId",
            role: "$role",
            createdAt: "$createdAt",
            updatedAt: "$updatedAt",
          },
          workspace: { $arrayElemAt: ["$workspaceDocs", 0] },
        },
      },
    ])
    .toArray();

  const row = rows[0];
  if (!row?.membership || !row.workspace) {
    return null;
  }

  return {
    membership: row.membership,
    workspace: row.workspace,
  };
}

export async function findMembership(options: {
  userId: string;
  workspaceId: string;
}): Promise<MembershipDocument | null> {
  const db = getDb();
  return db.collection<MembershipDocument>(MEMBERSHIPS).findOne({
    userId: options.userId,
    workspaceId: options.workspaceId,
  });
}

export async function findWorkspaceById(
  workspaceId: string,
): Promise<WorkspaceDocument | null> {
  if (!ObjectId.isValid(workspaceId)) {
    return null;
  }

  const db = getDb();
  return db.collection<WorkspaceDocument>(WORKSPACES).findOne({
    _id: new ObjectId(workspaceId),
  });
}

/**
 * Update workspace display name. Slug stays stable as the workspace identifier.
 * Scoped by workspace `_id` only — callers must authorize from session context.
 */
export async function updateWorkspaceName(options: {
  workspaceId: string;
  name: string;
}): Promise<WorkspaceDocument | null> {
  if (!ObjectId.isValid(options.workspaceId)) {
    return null;
  }

  const db = getDb();
  const result = await db
    .collection<WorkspaceDocument>(WORKSPACES)
    .findOneAndUpdate(
      { _id: new ObjectId(options.workspaceId) },
      { $set: { name: options.name, updatedAt: new Date() } },
      { returnDocument: "after" },
    );

  return result ?? null;
}

export async function updateMembershipRole(options: {
  membershipId: string;
  role: Role;
}): Promise<boolean> {
  if (!ObjectId.isValid(options.membershipId)) {
    return false;
  }

  const db = getDb();
  const result = await db.collection<MembershipDocument>(MEMBERSHIPS).updateOne(
    { _id: new ObjectId(options.membershipId) },
    { $set: { role: options.role, updatedAt: new Date() } },
  );

  return result.matchedCount > 0;
}

export async function listMembershipsInWorkspace(options: {
  workspaceId: string;
}): Promise<MembershipDocument[]> {
  const db = getDb();
  return db
    .collection<MembershipDocument>(MEMBERSHIPS)
    .find({ workspaceId: options.workspaceId })
    .sort({ createdAt: 1 })
    .toArray();
}

export async function findMembershipByIdInWorkspace(options: {
  workspaceId: string;
  membershipId: string;
}): Promise<MembershipDocument | null> {
  if (!ObjectId.isValid(options.membershipId)) {
    return null;
  }

  const db = getDb();
  return db.collection<MembershipDocument>(MEMBERSHIPS).findOne({
    _id: new ObjectId(options.membershipId),
    workspaceId: options.workspaceId,
  });
}

export async function countOwnersInWorkspace(
  workspaceId: string,
): Promise<number> {
  const db = getDb();
  return db.collection<MembershipDocument>(MEMBERSHIPS).countDocuments({
    workspaceId,
    role: "owner",
  });
}

export async function insertMembership(options: {
  workspaceId: string;
  userId: string;
  role: Role;
}): Promise<MembershipDocument> {
  await ensureWorkspaceIndexes();

  const db = getDb();
  const now = new Date();
  const membership: MembershipDocument = {
    _id: new ObjectId(),
    workspaceId: options.workspaceId,
    userId: options.userId,
    role: options.role,
    createdAt: now,
    updatedAt: now,
  };

  await db.collection<MembershipDocument>(MEMBERSHIPS).insertOne(membership);
  return membership;
}

export async function deleteMembershipInWorkspace(options: {
  workspaceId: string;
  membershipId: string;
}): Promise<boolean> {
  if (!ObjectId.isValid(options.membershipId)) {
    return false;
  }

  const db = getDb();
  const result = await db.collection<MembershipDocument>(MEMBERSHIPS).deleteOne({
    _id: new ObjectId(options.membershipId),
    workspaceId: options.workspaceId,
  });

  return result.deletedCount > 0;
}

export async function updateMembershipRoleInWorkspace(options: {
  workspaceId: string;
  membershipId: string;
  role: Role;
}): Promise<MembershipDocument | null> {
  if (!ObjectId.isValid(options.membershipId)) {
    return null;
  }

  const db = getDb();
  const result = await db
    .collection<MembershipDocument>(MEMBERSHIPS)
    .findOneAndUpdate(
      {
        _id: new ObjectId(options.membershipId),
        workspaceId: options.workspaceId,
      },
      { $set: { role: options.role, updatedAt: new Date() } },
      { returnDocument: "after" },
    );

  return result ?? null;
}
