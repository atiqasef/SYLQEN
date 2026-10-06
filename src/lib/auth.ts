import { mongodbAdapter } from "@better-auth/mongo-adapter";
import { betterAuth } from "better-auth";
import { nextCookies } from "better-auth/next-js";

import {
  getAppBaseUrl,
  getServerEnv,
  isGoogleOAuthConfigured,
} from "@/config/env";
import {
  resetPasswordEmailContent,
  sendEmail,
  verificationEmailContent,
} from "@/server/email";
import { getDb, getMongoClient } from "@/server/db/mongodb";
import { logger } from "@/server/logging/logger";
import { ensureDefaultWorkspaceForUser } from "@/server/workspaces/service";

function buildSocialProviders() {
  const env = getServerEnv();
  if (!isGoogleOAuthConfigured()) {
    return {};
  }

  return {
    google: {
      clientId: env.GOOGLE_CLIENT_ID!,
      clientSecret: env.GOOGLE_CLIENT_SECRET!,
    },
  };
}

/**
 * Lazily construct Better Auth so importing this module (e.g. during Next.js
 * page-data collection) does not construct a MongoClient until a request runs.
 */
function createAuth() {
  return betterAuth({
    appName: "SYLQEN",
    baseURL: getAppBaseUrl(),
    secret:
      getServerEnv().BETTER_AUTH_SECRET ??
      "dev-only-sylqen-secret-change-me-32+",
    database: mongodbAdapter(
      getDb(),
      // Atlas/replica-set deployments can enable transactions. Standalone and
      // memory-server test environments should set MONGODB_USE_TRANSACTIONS=false.
      process.env.MONGODB_USE_TRANSACTIONS === "false"
        ? undefined
        : { client: getMongoClient() },
    ),
    user: {
      additionalFields: {
        isDemo: {
          type: "boolean",
          required: false,
          defaultValue: false,
          input: false,
        },
      },
    },
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: true,
      minPasswordLength: 8,
      maxPasswordLength: 128,
      sendResetPassword: async ({ user, url }) => {
        const content = resetPasswordEmailContent(url);
        void sendEmail({
          to: user.email,
          subject: content.subject,
          html: content.html,
          text: content.text,
        });
      },
    },
    emailVerification: {
      sendOnSignUp: true,
      sendOnSignIn: true,
      autoSignInAfterVerification: true,
      sendVerificationEmail: async ({ user, url }) => {
        const content = verificationEmailContent(url);
        void sendEmail({
          to: user.email,
          subject: content.subject,
          html: content.html,
          text: content.text,
        });
      },
      afterEmailVerification: async (user) => {
        try {
          await ensureDefaultWorkspaceForUser({
            userId: user.id,
            name: user.name,
          });
        } catch (error) {
          logger.error("Failed to create workspace after verification", {
            userId: user.id,
            error: error instanceof Error ? error.message : "unknown",
          });
        }
      },
    },
    socialProviders: buildSocialProviders(),
    databaseHooks: {
      user: {
        create: {
          after: async (user) => {
            // Google / already-verified users get a workspace immediately.
            if (user.emailVerified) {
              try {
                await ensureDefaultWorkspaceForUser({
                  userId: user.id,
                  name: user.name,
                });
              } catch (error) {
                logger.error("Failed to create workspace for verified user", {
                  userId: user.id,
                  error: error instanceof Error ? error.message : "unknown",
                });
              }
            }
          },
        },
      },
    },
    session: {
      expiresIn: 60 * 60 * 24 * 7,
      updateAge: 60 * 60 * 24,
    },
    trustedOrigins: [getAppBaseUrl()],
    plugins: [nextCookies()],
  });
}

export type SylqenAuth = ReturnType<typeof createAuth>;
export type AuthSession = SylqenAuth["$Infer"]["Session"];

let authInstance: SylqenAuth | undefined;

export function getAuth(): SylqenAuth {
  if (!authInstance) {
    authInstance = createAuth();
  }
  return authInstance;
}
