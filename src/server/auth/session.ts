import "server-only";

import { cache } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { getAuth } from "@/lib/auth";
import { AppError } from "@/lib/errors/app-error";
import { effectivePermissions } from "@/server/auth/permissions";
import type { SessionContext } from "@/server/auth/types";
import { connectMongo, isMongoConfigured } from "@/server/db/mongodb";
import {
  ensureDefaultWorkspaceForUser,
  getPrimaryWorkspaceForUser,
} from "@/server/workspaces/service";

function mapUser(sessionUser: {
  id: string;
  email: string;
  name: string;
  emailVerified: boolean;
  image?: string | null;
  isDemo?: boolean | null;
}) {
  return {
    id: sessionUser.id,
    email: sessionUser.email,
    name: sessionUser.name,
    emailVerified: sessionUser.emailVerified,
    imageUrl: sessionUser.image ?? undefined,
    isDemo: Boolean(sessionUser.isDemo),
  };
}

/**
 * Resolve trusted session + workspace membership once per request.
 *
 * Wrapped in React `cache()` so layout + page (and nested helpers) that call
 * getSession / requireVerifiedPageSession share one DB round-trip within the
 * same RSC/server request. Not a cross-request or global session cache.
 */
export const getSession = cache(async (): Promise<SessionContext | null> => {
  if (!isMongoConfigured()) {
    return null;
  }

  await connectMongo();

  const session = await getAuth().api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    return null;
  }

  const user = mapUser(session.user);

  let workspaceContext = await getPrimaryWorkspaceForUser(user.id);

  if (!workspaceContext) {
    workspaceContext = await ensureDefaultWorkspaceForUser({
      userId: user.id,
      name: user.name,
    });
  }

  if (!workspaceContext) {
    return null;
  }

  const role = user.isDemo ? "viewer" : workspaceContext.membership.role;

  return {
    user,
    workspace: {
      id: workspaceContext.workspace._id.toHexString(),
      name: workspaceContext.workspace.name,
      slug: workspaceContext.workspace.slug,
    },
    membership: {
      id: workspaceContext.membership._id.toHexString(),
      workspaceId: workspaceContext.membership.workspaceId,
      userId: workspaceContext.membership.userId,
      role,
      permissions: effectivePermissions({
        role: workspaceContext.membership.role,
        isDemo: user.isDemo,
      }),
    },
  };
});

export async function requireSession(): Promise<SessionContext> {
  const session = await getSession();

  if (!session) {
    throw new AppError({
      code: "UNAUTHORIZED",
      message: "Authentication required",
      userMessage: "Please sign in to continue.",
    });
  }

  return session;
}

/**
 * Portfolio stage: email verification is optional and must not block access.
 * Kept as an alias so call sites remain stable when verification is re-enabled.
 */
export async function requireVerifiedSession(): Promise<SessionContext> {
  return requireSession();
}

export async function requireWorkspaceContext(): Promise<SessionContext> {
  return requireSession();
}

export async function requirePermission(
  permission: SessionContext["membership"]["permissions"][number],
): Promise<SessionContext> {
  const session = await requireSession();

  if (!session.membership.permissions.includes(permission)) {
    throw new AppError({
      code: "FORBIDDEN",
      message: `Missing permission: ${permission}`,
      userMessage: "You do not have permission to perform this action.",
    });
  }

  return session;
}

export async function redirectIfAuthenticated() {
  const session = await getSession();
  if (session) {
    redirect("/");
  }
}

export async function requireVerifiedPageSession(): Promise<SessionContext> {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  return session;
}
