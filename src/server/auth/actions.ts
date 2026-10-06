"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { isDemoConfigured } from "@/config/env";
import { getAuth } from "@/lib/auth";
import { toAppError } from "@/lib/errors/app-error";
import { signInDemoAccount } from "@/server/auth/demo";
import { connectMongo } from "@/server/db/mongodb";
import { logger } from "@/server/logging/logger";

export type ActionResult =
  | { ok: true }
  | { ok: false; error: string; code?: string };

export async function signOutAction(): Promise<void> {
  await connectMongo();
  await getAuth().api.signOut({
    headers: await headers(),
  });
  redirect("/login");
}

export async function exploreDemoAction(): Promise<ActionResult> {
  if (!isDemoConfigured()) {
    return {
      ok: false,
      error: "Demo access is not configured for this environment.",
      code: "DEMO_UNAVAILABLE",
    };
  }

  try {
    await connectMongo();
    await signInDemoAccount();
    return { ok: true };
  } catch (error) {
    const appError = toAppError(error);
    logger.error("Demo sign-in failed", {
      code: appError.code,
      message: appError.message,
    });
    return {
      ok: false,
      error: appError.userMessage,
      code: appError.code,
    };
  }
}
