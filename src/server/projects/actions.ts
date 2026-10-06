"use server";

import { revalidatePath } from "next/cache";

import { isAppError, toAppError } from "@/lib/errors/app-error";
import { requireSession } from "@/server/auth/session";
import {
  createProjectForSession,
  updateProjectForSession,
} from "@/server/projects/service";
import { logger } from "@/server/logging/logger";

export type ProjectActionResult =
  | { ok: true; id: string }
  | {
      ok: false;
      error: string;
      code?: string;
      fieldErrors?: Record<string, string[] | undefined>;
    };

function mapActionError(error: unknown): ProjectActionResult {
  const appError = toAppError(error);
  if (!isAppError(error)) {
    logger.error("Project action failed", {
      code: appError.code,
      message: appError.message,
    });
  }

  return {
    ok: false,
    error: appError.userMessage,
    code: appError.code,
    fieldErrors:
      appError.details &&
      typeof appError.details === "object" &&
      "fieldErrors" in appError.details
        ? (appError.details.fieldErrors as Record<string, string[] | undefined>)
        : undefined,
  };
}

export async function createProjectAction(
  input: unknown,
): Promise<ProjectActionResult> {
  try {
    const session = await requireSession();
    const created = await createProjectForSession(session, input);
    revalidatePath("/projects");
    return { ok: true, id: created.id };
  } catch (error) {
    return mapActionError(error);
  }
}

export async function updateProjectAction(
  projectId: string,
  input: unknown,
): Promise<ProjectActionResult> {
  try {
    const session = await requireSession();
    const updated = await updateProjectForSession(session, projectId, input);
    revalidatePath("/projects");
    revalidatePath(`/projects/${updated.id}`);
    return { ok: true, id: updated.id };
  } catch (error) {
    return mapActionError(error);
  }
}
