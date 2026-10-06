import { mongodbAdapter } from "@better-auth/mongo-adapter";
import { betterAuth } from "better-auth";
import { nextCookies } from "better-auth/next-js";

import {
  getAppBaseUrl,
  getServerEnv,
  getTrustedOrigins,
  isGoogleOAuthConfigured,
} from "@/config/env";
import {
  getEmailDeliveryDiagnostics,
  resetPasswordEmailContent,
  sendEmail,
  verificationEmailContent,
} from "@/server/email";
import { getDb, getMongoClient } from "@/server/db/mongodb";
import { logger } from "@/server/logging/logger";
import { ensureDefaultWorkspaceForUser } from "@/server/workspaces/service";

function mongoAdapterOptions() {
  // Opt-in only: createIndex + multi-doc transactions are unsafe together on
  // cold serverless starts. Atlas can enable with MONGODB_USE_TRANSACTIONS=true.
  if (process.env.MONGODB_USE_TRANSACTIONS === "true") {
    return { client: getMongoClient() };
  }
  return undefined;
}

async function deliverAuthEmail(input: {
  to: string;
  subject: string;
  html: string;
  text: string;
  purpose: "verification" | "password-reset";
}) {
  const diagnostics = getEmailDeliveryDiagnostics();
  try {
    await sendEmail({
      to: input.to,
      subject: input.subject,
      html: input.html,
      text: input.text,
    });
    logger.info("Auth email delivered", {
      purpose: input.purpose,
      provider: diagnostics.provider,
      deliveryConfigured: diagnostics.deliveryConfigured,
    });
  } catch (error) {
    logger.error("Auth email delivery failed", {
      purpose: input.purpose,
      provider: diagnostics.provider,
      deliveryConfigured: diagnostics.deliveryConfigured,
      productionRuntime: diagnostics.productionRuntime,
      error: error instanceof Error ? error.message : "unknown",
    });
    throw error;
  }
}

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
    database: mongodbAdapter(getDb(), mongoAdapterOptions()),
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
        await deliverAuthEmail({
          to: user.email,
          subject: content.subject,
          html: content.html,
          text: content.text,
          purpose: "password-reset",
        });
      },
    },
    emailVerification: {
      sendOnSignUp: true,
      sendOnSignIn: true,
      autoSignInAfterVerification: true,
      sendVerificationEmail: async ({ user, url }) => {
        const content = verificationEmailContent(url);
        await deliverAuthEmail({
          to: user.email,
          subject: content.subject,
          html: content.html,
          text: content.text,
          purpose: "verification",
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
    trustedOrigins: getTrustedOrigins(),
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
