import "server-only";

import { APIError } from "better-auth/api";
import { headers } from "next/headers";

import { getServerEnv, isDemoConfigured } from "@/config/env";
import { getAuth } from "@/lib/auth";
import { AppError } from "@/lib/errors/app-error";
import { logger } from "@/server/logging/logger";
import { connectMongo, getDb } from "@/server/db/mongodb";
import { ensureDefaultWorkspaceForUser } from "@/server/workspaces/service";
import { updateMembershipRole } from "@/server/workspaces/repository";

/**
 * Ensure the portfolio demo identity exists with viewer membership.
 * Credentials come only from environment variables — never hard-coded.
 */
export async function ensureDemoAccount(): Promise<{
  email: string;
  userId: string;
}> {
  if (!isDemoConfigured()) {
    throw new AppError({
      code: "INTERNAL_ERROR",
      message: "Demo credentials are not configured",
      userMessage: "Demo access is not available in this environment.",
    });
  }

  await connectMongo();

  const env = getServerEnv();
  const email = env.DEMO_EMAIL!;
  const password = env.DEMO_PASSWORD!;
  const name = env.DEMO_NAME ?? "SYLQEN Demo";

  const db = getDb();
  const existing = await db.collection("user").findOne({ email });

  if (!existing) {
    try {
      await getAuth().api.signUpEmail({
        body: {
          email,
          password,
          name,
        },
      });
    } catch (error) {
      if (!(error instanceof APIError)) {
        throw error;
      }
    }
  }

  const user = await db.collection("user").findOneAndUpdate(
    { email },
    {
      $set: {
        emailVerified: true,
        isDemo: true,
        name,
        updatedAt: new Date(),
      },
    },
    { returnDocument: "after" },
  );

  if (!user) {
    throw new AppError({
      code: "INTERNAL_ERROR",
      message: "Unable to provision demo user",
      userMessage: "Demo access is temporarily unavailable.",
    });
  }

  const userId = String(
    (user as { id?: string }).id ?? user._id,
  );
  const workspace = await ensureDefaultWorkspaceForUser({
    userId,
    name: "SYLQEN Demo Workspace",
  });

  if (workspace.membership.role !== "viewer") {
    await updateMembershipRole({
      membershipId: workspace.membership._id.toHexString(),
      role: "viewer",
    });
  }

  // Keep ownership metadata on workspace, but demo membership stays viewer.
  await db.collection("workspaces").updateOne(
    { _id: workspace.workspace._id },
    {
      $set: {
        name: "SYLQEN Demo Workspace",
        updatedAt: new Date(),
      },
    },
  );

  logger.info("Demo account ready", { email, userId });

  return { email, userId };
}

export async function signInDemoAccount() {
  const { email } = await ensureDemoAccount();
  const env = getServerEnv();

  return getAuth().api.signInEmail({
    body: {
      email,
      password: env.DEMO_PASSWORD!,
    },
    headers: await headers(),
  });
}
