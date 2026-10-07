import "server-only";

import { AppError } from "@/lib/errors/app-error";
import { parseWithSchema } from "@/lib/validation/result";
import {
  automationInputSchema,
  automationListQuerySchema,
} from "@/features/automations/schemas";
import type { SessionContext } from "@/server/auth/types";
import {
  ensureAutomationIndexes,
  findAutomationInWorkspace,
  insertAutomation,
  listAutomationsInWorkspace,
  listExecutionsForAutomation,
  listRecentExecutionsInWorkspace,
  listRecentNotificationsInWorkspace,
  toAutomationDTO,
  toExecutionDTO,
  toNotificationDTO,
  updateAutomationInWorkspace,
} from "@/server/automations/repository";
import type {
  AutomationDTO,
  AutomationExecutionDTO,
  AutomationListResult,
  AutomationNotificationDTO,
} from "@/server/automations/types";

function assertPermission(
  session: SessionContext,
  permission: SessionContext["membership"]["permissions"][number],
) {
  if (!session.membership.permissions.includes(permission)) {
    throw new AppError({
      code: "FORBIDDEN",
      message: `Missing permission: ${permission}`,
      userMessage: session.user.isDemo
        ? "Demo accounts are read-only. Automation changes are disabled."
        : "You do not have permission to perform this action.",
    });
  }
}

export async function listAutomationsForSession(
  session: SessionContext,
  rawQuery: unknown,
): Promise<AutomationListResult> {
  assertPermission(session, "automations.read");
  await ensureAutomationIndexes();

  const parsed = parseWithSchema(automationListQuerySchema, rawQuery);
  if (!parsed.ok) {
    throw parsed.error;
  }

  const { q, page, pageSize } = parsed.data;
  const { items, total } = await listAutomationsInWorkspace({
    workspaceId: session.workspace.id,
    q,
    page,
    pageSize,
  });

  const pageCount = total === 0 ? 0 : Math.ceil(total / pageSize);

  return {
    items: items.map(toAutomationDTO),
    total,
    page,
    pageSize,
    pageCount,
  };
}

export async function getAutomationForSession(
  session: SessionContext,
  automationId: string,
): Promise<AutomationDTO> {
  assertPermission(session, "automations.read");
  await ensureAutomationIndexes();

  const doc = await findAutomationInWorkspace({
    workspaceId: session.workspace.id,
    automationId,
  });

  if (!doc) {
    throw new AppError({
      code: "NOT_FOUND",
      message: "Automation not found in workspace",
      userMessage: "Automation not found.",
    });
  }

  return toAutomationDTO(doc);
}

export async function createAutomationForSession(
  session: SessionContext,
  rawInput: unknown,
): Promise<AutomationDTO> {
  assertPermission(session, "automations.create");
  await ensureAutomationIndexes();

  const parsed = parseWithSchema(automationInputSchema, rawInput);
  if (!parsed.ok) {
    throw parsed.error;
  }

  const input = parsed.data;
  const created = await insertAutomation({
    workspaceId: session.workspace.id,
    createdByUserId: session.user.id,
    name: input.name,
    description: input.description,
    enabled: input.enabled,
    trigger: input.trigger,
    conditions: input.conditions,
    actions: input.actions,
  });

  return toAutomationDTO(created);
}

export async function updateAutomationForSession(
  session: SessionContext,
  automationId: string,
  rawInput: unknown,
): Promise<AutomationDTO> {
  assertPermission(session, "automations.update");
  await ensureAutomationIndexes();

  const parsed = parseWithSchema(automationInputSchema, rawInput);
  if (!parsed.ok) {
    throw parsed.error;
  }

  const existing = await findAutomationInWorkspace({
    workspaceId: session.workspace.id,
    automationId,
  });

  if (!existing) {
    throw new AppError({
      code: "NOT_FOUND",
      message: "Automation not found in workspace",
      userMessage: "Automation not found.",
    });
  }

  const input = parsed.data;
  const updated = await updateAutomationInWorkspace({
    workspaceId: session.workspace.id,
    automationId,
    patch: {
      name: input.name,
      description: input.description,
      enabled: input.enabled,
      trigger: input.trigger,
      conditions: input.conditions,
      actions: input.actions,
    },
  });

  if (!updated) {
    throw new AppError({
      code: "NOT_FOUND",
      message: "Automation not found during update",
      userMessage: "Automation not found.",
    });
  }

  return toAutomationDTO(updated);
}

export async function listAutomationExecutionsForSession(
  session: SessionContext,
  automationId: string,
  limit = 20,
): Promise<AutomationExecutionDTO[]> {
  assertPermission(session, "automations.read");
  await ensureAutomationIndexes();

  const existing = await findAutomationInWorkspace({
    workspaceId: session.workspace.id,
    automationId,
  });
  if (!existing) {
    throw new AppError({
      code: "NOT_FOUND",
      message: "Automation not found in workspace",
      userMessage: "Automation not found.",
    });
  }

  const docs = await listExecutionsForAutomation({
    workspaceId: session.workspace.id,
    automationId,
    limit: Math.min(limit, 50),
  });
  return docs.map(toExecutionDTO);
}

export async function listRecentAutomationActivityForSession(
  session: SessionContext,
): Promise<{
  executions: AutomationExecutionDTO[];
  notifications: AutomationNotificationDTO[];
}> {
  assertPermission(session, "automations.read");
  await ensureAutomationIndexes();

  const [executions, notifications] = await Promise.all([
    listRecentExecutionsInWorkspace({
      workspaceId: session.workspace.id,
      limit: 8,
    }),
    listRecentNotificationsInWorkspace({
      workspaceId: session.workspace.id,
      limit: 8,
    }),
  ]);

  return {
    executions: executions.map(toExecutionDTO),
    notifications: notifications.map(toNotificationDTO),
  };
}
