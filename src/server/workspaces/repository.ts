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

export async function ensureWorkspaceIndexes() {
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
      { key: { userId: 1 }, name: "memberships_userId" },
    ]),
  ]);
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
