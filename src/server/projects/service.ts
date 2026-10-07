import "server-only";

import { AppError } from "@/lib/errors/app-error";
import { parseWithSchema } from "@/lib/validation/result";
import {
  projectInputSchema,
  projectListQuerySchema,
  type ProjectInput,
} from "@/features/projects/schemas";
import {
  ensureProjectIndexes,
  findProjectInWorkspace,
  insertProject,
  listProjectsInWorkspace,
  toProjectDTO,
  updateProjectInWorkspace,
} from "@/server/projects/repository";
import type { ProjectDTO, ProjectListResult } from "@/server/projects/types";
import type { SessionContext } from "@/server/auth/types";
import { emitProjectStatusChanged } from "@/server/automations/events";

function assertPermission(
  session: SessionContext,
  permission: SessionContext["membership"]["permissions"][number],
) {
  if (!session.membership.permissions.includes(permission)) {
    throw new AppError({
      code: "FORBIDDEN",
      message: `Missing permission: ${permission}`,
      userMessage: session.user.isDemo
        ? "Demo accounts are read-only. Project changes are disabled."
        : "You do not have permission to perform this action.",
    });
  }
}

export async function listProjectsForSession(
  session: SessionContext,
  rawQuery: unknown,
): Promise<ProjectListResult> {
  assertPermission(session, "projects.read");
  await ensureProjectIndexes();

  const parsed = parseWithSchema(projectListQuerySchema, rawQuery);
  if (!parsed.ok) {
    throw parsed.error;
  }

  const { q, page, pageSize } = parsed.data;
  const { items, total } = await listProjectsInWorkspace({
    workspaceId: session.workspace.id,
    q,
    page,
    pageSize,
  });

  const pageCount = total === 0 ? 0 : Math.ceil(total / pageSize);

  return {
    items: items.map(toProjectDTO),
    total,
    page,
    pageSize,
    pageCount,
  };
}

export async function getProjectForSession(
  session: SessionContext,
  projectId: string,
): Promise<ProjectDTO> {
  assertPermission(session, "projects.read");
  await ensureProjectIndexes();

  const doc = await findProjectInWorkspace({
    workspaceId: session.workspace.id,
    projectId,
  });

  if (!doc) {
    throw new AppError({
      code: "NOT_FOUND",
      message: "Project not found in workspace",
      userMessage: "Project not found.",
    });
  }

  return toProjectDTO(doc);
}

export async function createProjectForSession(
  session: SessionContext,
  rawInput: unknown,
): Promise<ProjectDTO> {
  assertPermission(session, "projects.create");
  await ensureProjectIndexes();

  const parsed = parseWithSchema(projectInputSchema, rawInput);
  if (!parsed.ok) {
    throw parsed.error;
  }

  const input = parsed.data;
  const created = await insertProject({
    workspaceId: session.workspace.id,
    createdByUserId: session.user.id,
    ...input,
  });
  return toProjectDTO(created);
}

export async function updateProjectForSession(
  session: SessionContext,
  projectId: string,
  rawInput: unknown,
): Promise<ProjectDTO> {
  assertPermission(session, "projects.update");
  await ensureProjectIndexes();

  const parsed = parseWithSchema(projectInputSchema, rawInput);
  if (!parsed.ok) {
    throw parsed.error;
  }

  const input: ProjectInput = parsed.data;

  const existing = await findProjectInWorkspace({
    workspaceId: session.workspace.id,
    projectId,
  });

  if (!existing) {
    throw new AppError({
      code: "NOT_FOUND",
      message: "Project not found in workspace",
      userMessage: "Project not found.",
    });
  }

  const previousStatus = existing.status;

  const updated = await updateProjectInWorkspace({
    workspaceId: session.workspace.id,
    projectId,
    patch: input,
  });

  if (!updated) {
    throw new AppError({
      code: "NOT_FOUND",
      message: "Project not found during update",
      userMessage: "Project not found.",
    });
  }

  if (previousStatus !== updated.status) {
    await emitProjectStatusChanged({
      project: updated,
      previousStatus,
    });
  }

  return toProjectDTO(updated);
}
