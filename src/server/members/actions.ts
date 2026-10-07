"use server";

import { revalidatePath } from "next/cache";

import { isAppError, toAppError } from "@/lib/errors/app-error";
import { requireSession } from "@/server/auth/session";
import { logger } from "@/server/logging/logger";
import {
  removeMemberForSession,
  updateMemberRoleForSession,
} from "@/server/members/service";

export type MemberActionResult =
  | { ok: true; id: string }
  | {
      ok: false;
      error: string;
      code?: string;
      fieldErrors?: Record<string, string[] | undefined>;
    };

function mapActionError(error: unknown): MemberActionResult {
  const appError = toAppError(error);
  if (!isAppError(error)) {
    logger.error("Member action failed", {
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

export async function updateMemberRoleAction(
  input: unknown,
): Promise<MemberActionResult> {
  try {
    const session = await requireSession();
    const updated = await updateMemberRoleForSession(session, input);
    revalidatePath("/team");
    return { ok: true, id: updated.id };
  } catch (error) {
    return mapActionError(error);
  }
}

export async function removeMemberAction(
  input: unknown,
): Promise<MemberActionResult> {
  try {
    const session = await requireSession();
    const removed = await removeMemberForSession(session, input);
    revalidatePath("/team");
    return { ok: true, id: removed.id };
  } catch (error) {
    return mapActionError(error);
  }
}
