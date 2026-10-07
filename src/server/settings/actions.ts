"use server";

import { revalidatePath } from "next/cache";

import { isAppError, toAppError } from "@/lib/errors/app-error";
import { requireSession } from "@/server/auth/session";
import { logger } from "@/server/logging/logger";
import { updateAccountNameForSession } from "@/server/settings/account-service";
import { updateWorkspaceNameForSession } from "@/server/workspaces/service";

export type SettingsActionResult =
  | { ok: true }
  | {
      ok: false;
      error: string;
      code?: string;
      fieldErrors?: Record<string, string[] | undefined>;
    };

function mapActionError(error: unknown): SettingsActionResult {
  const appError = toAppError(error);
  if (!isAppError(error)) {
    logger.error("Settings action failed", {
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

function revalidateSettingsSurfaces() {
  revalidatePath("/settings");
  revalidatePath("/");
  revalidatePath("/team");
}

export async function updateWorkspaceSettingsAction(
  input: unknown,
): Promise<SettingsActionResult> {
  try {
    const session = await requireSession();
    await updateWorkspaceNameForSession(session, input);
    revalidateSettingsSurfaces();
    return { ok: true };
  } catch (error) {
    return mapActionError(error);
  }
}

export async function updateAccountSettingsAction(
  input: unknown,
): Promise<SettingsActionResult> {
  try {
    const session = await requireSession();
    await updateAccountNameForSession(session, input);
    revalidateSettingsSurfaces();
    return { ok: true };
  } catch (error) {
    return mapActionError(error);
  }
}
