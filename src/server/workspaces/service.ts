import "server-only";

import { AppError } from "@/lib/errors/app-error";
import { logger } from "@/server/logging/logger";
import {
  createWorkspaceWithOwner,
  ensureWorkspaceIndexes,
  findMembership,
  findMembershipsForUser,
  findWorkspaceById,
} from "@/server/workspaces/repository";
import type {
  MembershipDocument,
  WorkspaceDocument,
} from "@/server/workspaces/types";

export async function ensureDefaultWorkspaceForUser(options: {
  userId: string;
  name: string;
}): Promise<{ workspace: WorkspaceDocument; membership: MembershipDocument }> {
  await ensureWorkspaceIndexes();

  const existing = await findMembershipsForUser(options.userId);
  const first = existing[0];
  if (first) {
    const workspace = await findWorkspaceById(first.workspaceId);
    if (workspace) {
      return { workspace, membership: first };
    }
  }

  const workspaceName = `${options.name.trim() || "My"} Workspace`;
  const created = await createWorkspaceWithOwner({
    name: workspaceName,
    ownerId: options.userId,
  });

  logger.info("Default workspace created", {
    workspaceId: created.workspace._id.toHexString(),
    userId: options.userId,
  });

  return created;
}

/**
 * Resolve trusted membership for a user inside a workspace.
 * Never trust browser-supplied workspace IDs alone for authorization.
 */
export async function requireMembershipInWorkspace(options: {
  userId: string;
  workspaceId: string;
}): Promise<{ workspace: WorkspaceDocument; membership: MembershipDocument }> {
  const membership = await findMembership(options);
  if (!membership) {
    throw new AppError({
      code: "FORBIDDEN",
      message: "Membership not found for workspace",
      userMessage: "You do not have access to this workspace.",
    });
  }

  const workspace = await findWorkspaceById(options.workspaceId);
  if (!workspace) {
    throw new AppError({
      code: "NOT_FOUND",
      message: "Workspace not found",
      userMessage: "Workspace not found.",
    });
  }

  return { workspace, membership };
}

export async function getPrimaryWorkspaceForUser(userId: string): Promise<{
  workspace: WorkspaceDocument;
  membership: MembershipDocument;
} | null> {
  const memberships = await findMembershipsForUser(userId);
  const membership = memberships[0];
  if (!membership) {
    return null;
  }

  const workspace = await findWorkspaceById(membership.workspaceId);
  if (!workspace) {
    return null;
  }

  return { workspace, membership };
}
