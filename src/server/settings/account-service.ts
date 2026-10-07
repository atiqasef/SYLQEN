import "server-only";

import { ObjectId } from "mongodb";

import { updateAccountNameSchema } from "@/features/settings/schemas";
import { getAuth } from "@/lib/auth";
import { AppError } from "@/lib/errors/app-error";
import { parseWithSchema } from "@/lib/validation/result";
import type { SessionContext } from "@/server/auth/types";
import { getDb } from "@/server/db/mongodb";
import { logger } from "@/server/logging/logger";

/**
 * Persist display name for the authenticated user via Better Auth when
 * available, with a direct `user` collection fallback for tests.
 */
async function persistAuthUserName(options: {
  userId: string;
  name: string;
}): Promise<boolean> {
  try {
    const auth = getAuth();
    const ctx = await auth.$context;
    const updated = await ctx.internalAdapter.updateUser(options.userId, {
      name: options.name,
    });
    if (updated) {
      return true;
    }
  } catch {
    // Fall through to collection update (memory Mongo tests).
  }

  const db = getDb();
  const filter = ObjectId.isValid(options.userId)
    ? {
        $or: [
          { id: options.userId },
          { _id: new ObjectId(options.userId) },
        ],
      }
    : { id: options.userId };

  const result = await db.collection("user").updateOne(filter, {
    $set: { name: options.name },
  });

  return result.matchedCount > 0;
}

/**
 * Update the signed-in user's display name.
 * Email changes and password changes are intentionally out of scope here.
 */
export async function updateAccountNameForSession(
  session: SessionContext,
  input: unknown,
): Promise<{ name: string }> {
  if (session.user.isDemo) {
    throw new AppError({
      code: "FORBIDDEN",
      message: "Demo accounts cannot update profile",
      userMessage:
        "Demo accounts are read-only. Account settings cannot be changed.",
    });
  }

  const parsed = parseWithSchema(updateAccountNameSchema, input);
  if (!parsed.ok) {
    throw parsed.error;
  }

  const ok = await persistAuthUserName({
    userId: session.user.id,
    name: parsed.data.name,
  });

  if (!ok) {
    throw new AppError({
      code: "NOT_FOUND",
      message: "Auth user not found for profile update",
      userMessage: "Unable to update your account right now.",
    });
  }

  logger.info("Account display name updated", {
    userId: session.user.id,
  });

  return { name: parsed.data.name };
}
