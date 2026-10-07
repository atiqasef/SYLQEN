import "server-only";

import { AppError } from "@/lib/errors/app-error";
import { parseWithSchema } from "@/lib/validation/result";
import {
  removeMemberSchema,
  updateMemberRoleSchema,
} from "@/features/members/schemas";
import type { SessionContext } from "@/server/auth/types";
import { findAuthUserProfilesByIds } from "@/server/members/user-profiles";
import type { MemberDTO, MemberListResult } from "@/server/members/types";
import {
  countOwnersInWorkspace,
  deleteMembershipInWorkspace,
  ensureWorkspaceIndexes,
  findMembershipByIdInWorkspace,
  listMembershipsInWorkspace,
  updateMembershipRoleInWorkspace,
} from "@/server/workspaces/repository";
import type { MembershipDocument } from "@/server/workspaces/types";

function assertPermission(
  session: SessionContext,
  permission: SessionContext["membership"]["permissions"][number],
) {
  if (!session.membership.permissions.includes(permission)) {
    throw new AppError({
      code: "FORBIDDEN",
      message: `Missing permission: ${permission}`,
      userMessage: session.user.isDemo
        ? "Demo accounts are read-only. Team changes are disabled."
        : "You do not have permission to perform this action.",
    });
  }
}

function toMemberDTO(
  doc: MembershipDocument,
  profile: { name: string; email: string } | undefined,
  currentUserId: string,
): MemberDTO {
  return {
    id: doc._id.toHexString(),
    userId: doc.userId,
    name: profile?.name || "Unknown member",
    email: profile?.email || "",
    role: doc.role,
    joinedAt: doc.createdAt.toISOString(),
    isCurrentUser: doc.userId === currentUserId,
  };
}

export async function listMembersForSession(
  session: SessionContext,
): Promise<MemberListResult> {
  assertPermission(session, "members.read");
  await ensureWorkspaceIndexes();

  const workspaceId = session.workspace.id;
  const [docs, ownerCount] = await Promise.all([
    listMembershipsInWorkspace({ workspaceId }),
    countOwnersInWorkspace(workspaceId),
  ]);

  const profiles = await findAuthUserProfilesByIds(
    docs.map((doc) => doc.userId),
  );

  return {
    items: docs.map((doc) =>
      toMemberDTO(doc, profiles.get(doc.userId), session.user.id),
    ),
    total: docs.length,
    ownerCount,
  };
}

export async function getMemberForSession(
  session: SessionContext,
  membershipId: string,
): Promise<MemberDTO> {
  assertPermission(session, "members.read");
  await ensureWorkspaceIndexes();

  const doc = await findMembershipByIdInWorkspace({
    workspaceId: session.workspace.id,
    membershipId,
  });

  if (!doc) {
    throw new AppError({
      code: "NOT_FOUND",
      message: "Membership not found in workspace",
      userMessage: "Member not found.",
    });
  }

  const profiles = await findAuthUserProfilesByIds([doc.userId]);
  return toMemberDTO(doc, profiles.get(doc.userId), session.user.id);
}

async function loadTargetMembership(
  session: SessionContext,
  membershipId: string,
): Promise<MembershipDocument> {
  const doc = await findMembershipByIdInWorkspace({
    workspaceId: session.workspace.id,
    membershipId,
  });

  if (!doc) {
    throw new AppError({
      code: "NOT_FOUND",
      message: "Membership not found in workspace",
      userMessage: "Member not found.",
    });
  }

  return doc;
}

async function assertNotLastOwner(
  workspaceId: string,
  target: MembershipDocument,
  action: "demote" | "remove",
) {
  if (target.role !== "owner") {
    return;
  }

  const ownerCount = await countOwnersInWorkspace(workspaceId);
  if (ownerCount <= 1) {
    throw new AppError({
      code: "VALIDATION_ERROR",
      message: `Cannot ${action} the final workspace owner`,
      userMessage:
        action === "demote"
          ? "The workspace must keep at least one owner. Promote another member before changing this role."
          : "The workspace must keep at least one owner. Promote another member before removing this one.",
    });
  }
}

export async function updateMemberRoleForSession(
  session: SessionContext,
  rawInput: unknown,
): Promise<MemberDTO> {
  assertPermission(session, "members.update");
  await ensureWorkspaceIndexes();

  const parsed = parseWithSchema(updateMemberRoleSchema, rawInput);
  if (!parsed.ok) {
    throw parsed.error;
  }

  const { membershipId, role } = parsed.data;
  const target = await loadTargetMembership(session, membershipId);

  if (target.role === role) {
    const profiles = await findAuthUserProfilesByIds([target.userId]);
    return toMemberDTO(target, profiles.get(target.userId), session.user.id);
  }

  if (target.role === "owner" && role !== "owner") {
    await assertNotLastOwner(session.workspace.id, target, "demote");
  }

  const updated = await updateMembershipRoleInWorkspace({
    workspaceId: session.workspace.id,
    membershipId,
    role,
  });

  if (!updated) {
    throw new AppError({
      code: "NOT_FOUND",
      message: "Membership not found during role update",
      userMessage: "Member not found.",
    });
  }

  const profiles = await findAuthUserProfilesByIds([updated.userId]);
  return toMemberDTO(updated, profiles.get(updated.userId), session.user.id);
}

export async function removeMemberForSession(
  session: SessionContext,
  rawInput: unknown,
): Promise<{ id: string }> {
  assertPermission(session, "members.remove");
  await ensureWorkspaceIndexes();

  const parsed = parseWithSchema(removeMemberSchema, rawInput);
  if (!parsed.ok) {
    throw parsed.error;
  }

  const target = await loadTargetMembership(
    session,
    parsed.data.membershipId,
  );

  await assertNotLastOwner(session.workspace.id, target, "remove");

  const deleted = await deleteMembershipInWorkspace({
    workspaceId: session.workspace.id,
    membershipId: parsed.data.membershipId,
  });

  if (!deleted) {
    throw new AppError({
      code: "NOT_FOUND",
      message: "Membership not found during removal",
      userMessage: "Member not found.",
    });
  }

  return { id: parsed.data.membershipId };
}
