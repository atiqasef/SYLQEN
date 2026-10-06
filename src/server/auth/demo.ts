import "server-only";

import { headers } from "next/headers";

import { getServerEnv, isDemoConfigured } from "@/config/env";
import { getAuth } from "@/lib/auth";
import { AppError } from "@/lib/errors/app-error";
import { logger } from "@/server/logging/logger";
import { connectMongo } from "@/server/db/mongodb";
import { ensureDefaultWorkspaceForUser } from "@/server/workspaces/service";
import { updateMembershipRole } from "@/server/workspaces/repository";

/**
 * Provision the portfolio demo identity without sending verification email.
 * Credentials come only from environment variables — never hard-coded.
 */
export async function ensureDemoAccount(): Promise<{
  email: string;
  userId: string;
}> {
  if (!isDemoConfigured()) {
    logger.error("Demo account requested but DEMO_* env vars are missing", {
      demoEmailConfigured: Boolean(getServerEnv().DEMO_EMAIL),
      demoPasswordConfigured: Boolean(getServerEnv().DEMO_PASSWORD),
      demoNameConfigured: Boolean(getServerEnv().DEMO_NAME),
    });
    throw new AppError({
      code: "INTERNAL_ERROR",
      message: "Demo credentials are not configured",
      userMessage: "Demo access is not available in this environment.",
    });
  }

  await connectMongo();

  const env = getServerEnv();
  const email = env.DEMO_EMAIL!.toLowerCase();
  const password = env.DEMO_PASSWORD!;
  const name = env.DEMO_NAME ?? "SYLQEN Demo";

  const auth = getAuth();
  const ctx = await auth.$context;
  const passwordHash = await ctx.password.hash(password);

  const existing = await ctx.internalAdapter.findUserByEmail(email, {
    includeAccounts: true,
  });

  let userId: string;

  if (!existing?.user) {
    const created = await ctx.internalAdapter.createUser(
      {
        email,
        name,
        emailVerified: true,
        isDemo: true,
      },
      { method: "email-password" },
    );

    if (!created?.id) {
      throw new AppError({
        code: "INTERNAL_ERROR",
        message: "Unable to create demo user",
        userMessage: "Demo access is temporarily unavailable.",
      });
    }

    await ctx.internalAdapter.linkAccount({
      userId: created.id,
      providerId: "credential",
      accountId: created.id,
      password: passwordHash,
    });

    userId = created.id;
    logger.info("Demo user created", { userId });
  } else {
    userId = existing.user.id;

    await ctx.internalAdapter.updateUser(userId, {
      emailVerified: true,
      isDemo: true,
      name,
    });

    const credentialAccount = existing.accounts?.find(
      (account) =>
        account.providerId === "credential" &&
        account.accountId === existing.user.id,
    );

    if (credentialAccount?.id) {
      await ctx.internalAdapter.updateAccount(credentialAccount.id, {
        password: passwordHash,
      });
    } else {
      await ctx.internalAdapter.linkAccount({
        userId,
        providerId: "credential",
        accountId: userId,
        password: passwordHash,
      });
    }

    logger.info("Demo user refreshed", { userId });
  }

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

  logger.info("Demo account ready", { userId });

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
