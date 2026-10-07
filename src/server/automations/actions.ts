"use server";

import { revalidatePath } from "next/cache";

import { isAppError } from "@/lib/errors/app-error";
import { requireSession } from "@/server/auth/session";
import {
  createAutomationForSession,
  updateAutomationForSession,
} from "@/server/automations/service";

type ActionResult =
  | { ok: true; id: string }
  | {
      ok: false;
      error: string;
      fieldErrors?: Record<string, string[] | undefined>;
    };

export async function createAutomationAction(
  rawInput: unknown,
): Promise<ActionResult> {
  try {
    const session = await requireSession();
    const created = await createAutomationForSession(session, rawInput);
    revalidatePath("/automations");
    return { ok: true, id: created.id };
  } catch (error) {
    if (isAppError(error)) {
      return {
        ok: false,
        error: error.userMessage,
        fieldErrors: error.details?.fieldErrors as
          | Record<string, string[] | undefined>
          | undefined,
      };
    }
    return { ok: false, error: "Could not create automation." };
  }
}

export async function updateAutomationAction(
  automationId: string,
  rawInput: unknown,
): Promise<ActionResult> {
  try {
    const session = await requireSession();
    const updated = await updateAutomationForSession(
      session,
      automationId,
      rawInput,
    );
    revalidatePath("/automations");
    revalidatePath(`/automations/${updated.id}`);
    revalidatePath(`/automations/${updated.id}/edit`);
    return { ok: true, id: updated.id };
  } catch (error) {
    if (isAppError(error)) {
      return {
        ok: false,
        error: error.userMessage,
        fieldErrors: error.details?.fieldErrors as
          | Record<string, string[] | undefined>
          | undefined,
      };
    }
    return { ok: false, error: "Could not update automation." };
  }
}
