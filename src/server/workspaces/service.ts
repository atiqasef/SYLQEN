import "server-only";

import { updateWorkspaceNameSchema } from "@/features/settings/schemas";
import { AppError } from "@/lib/errors/app-error";
import { parseWithSchema } from "@/lib/validation/result";
import type { SessionContext } from "@/server/auth/types";
import { logger } from "@/server/logging/logger";
import {
  createWorkspaceWithOwner,
  ensureWorkspaceIndexes,
  findMembership,
  findPrimaryMembershipWithWorkspace,
  findWorkspaceById,
  updateWorkspaceName,
} from "@/server/workspaces/repository";
import type {
  MembershipDocument,
  WorkspaceDocument,
} from "@/server/workspaces/types";

function assertWorkspacePermission(
  session: SessionContext,
  permission: SessionContext["membership"]["permissions"][number],
) {
  if (!session.membership.permissions.includes(permission)) {
    throw new AppError({
      code: "FORBIDDEN",
      message: `Missing permission: ${permission}`,
      userMessage: session.user.isDemo
        ? "Demo accounts are read-only. Workspace settings cannot be changed."
        : "You do not have permission to update this workspace.",
    });
  }
}

export async function ensureDefaultWorkspaceForUser(options: {
  userId: string;
  name: string;
}): Promise<{ workspace: WorkspaceDocument; membership: MembershipDocument }> {
  await ensureWorkspaceIndexes();

  const existing = await findPrimaryMembershipWithWorkspace(options.userId);
  if (existing) {
    return existing;
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
  return findPrimaryMembershipWithWorkspace(userId);
}

/**
 * Rename the session workspace. Workspace id comes only from the trusted session.
 */
export async function updateWorkspaceNameForSession(
  session: SessionContext,
  input: unknown,
): Promise<{ id: string; name: string; slug: string }> {
  assertWorkspacePermission(session, "workspace.update");
  await ensureWorkspaceIndexes();

  const parsed = parseWithSchema(updateWorkspaceNameSchema, input);
  if (!parsed.ok) {
    throw parsed.error;
  }

  const workspaceId = session.workspace.id;
  const updated = await updateWorkspaceName({
    workspaceId,
    name: parsed.data.name,
  });

  if (!updated) {
    throw new AppError({
      code: "NOT_FOUND",
      message: "Workspace not found for update",
      userMessage: "Workspace not found.",
    });
  }

  logger.info("Workspace name updated", {
    workspaceId,
    userId: session.user.id,
  });

  return {
    id: updated._id.toHexString(),
    name: updated.name,
    slug: updated.slug,
  };
}
