import { z } from "zod";

/**
 * Environment configuration boundary.
 *
 * - `NEXT_PUBLIC_*` values are safe for the browser.
 * - Server-only secrets must never be prefixed with `NEXT_PUBLIC_`.
 */

const booleanFromEnv = z
  .enum(["true", "false", "1", "0", ""])
  .optional()
  .transform((value) => value === "true" || value === "1");

const publicEnvSchema = z.object({
  NEXT_PUBLIC_APP_URL: z.string().url().optional(),
  NEXT_PUBLIC_APP_NAME: z.string().min(1).optional(),
});

const serverEnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  AI_ENABLED: booleanFromEnv.default(false),
  AI_PROVIDER: z.enum(["mock", "anthropic", "openai"]).default("mock"),
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),

  MONGODB_URI: z.string().min(1).optional(),
  MONGODB_DB_NAME: z.string().min(1).optional(),

  BETTER_AUTH_SECRET: z.string().min(32).optional(),
  BETTER_AUTH_URL: z.string().url().optional(),

  GOOGLE_CLIENT_ID: z.string().min(1).optional(),
  GOOGLE_CLIENT_SECRET: z.string().min(1).optional(),

  EMAIL_PROVIDER: z.enum(["dev", "resend"]).default("dev"),
  RESEND_API_KEY: z.string().min(1).optional(),
  EMAIL_FROM: z.string().min(1).optional(),
  EMAIL_CAPTURE_TO_DISK: booleanFromEnv.default(false),

  DEMO_EMAIL: z.string().email().optional(),
  DEMO_PASSWORD: z.string().min(8).optional(),
  DEMO_NAME: z.string().min(1).optional(),

  STRIPE_SECRET_KEY: z.string().min(1).optional(),
  STRIPE_WEBHOOK_SECRET: z.string().min(1).optional(),
  ANTHROPIC_API_KEY: z.string().min(1).optional(),
  OPENAI_API_KEY: z.string().min(1).optional(),
  STORAGE_BUCKET: z.string().min(1).optional(),
});

export type PublicEnv = z.infer<typeof publicEnvSchema>;
export type ServerEnv = z.infer<typeof serverEnvSchema>;

function readPublicEnv(): PublicEnv {
  const parsed = publicEnvSchema.safeParse({
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_APP_NAME: process.env.NEXT_PUBLIC_APP_NAME,
  });

  if (!parsed.success) {
    throw new Error(
      `Invalid public environment variables: ${parsed.error.issues
        .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
        .join(", ")}`,
    );
  }

  return parsed.data;
}

let cachedServerEnv: ServerEnv | null = null;

/**
 * Typed server environment. Call only from server code.
 * Secrets are never returned to the client.
 */
export function getServerEnv(): ServerEnv {
  if (cachedServerEnv) {
    return cachedServerEnv;
  }

  const parsed = serverEnvSchema.safeParse({
    NODE_ENV: process.env.NODE_ENV,
    AI_ENABLED: process.env.AI_ENABLED,
    AI_PROVIDER: process.env.AI_PROVIDER,
    LOG_LEVEL: process.env.LOG_LEVEL,
    MONGODB_URI: process.env.MONGODB_URI,
    MONGODB_DB_NAME: process.env.MONGODB_DB_NAME,
    BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET,
    BETTER_AUTH_URL: process.env.BETTER_AUTH_URL,
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
    EMAIL_PROVIDER: process.env.EMAIL_PROVIDER,
    RESEND_API_KEY: process.env.RESEND_API_KEY,
    EMAIL_FROM: process.env.EMAIL_FROM,
    EMAIL_CAPTURE_TO_DISK: process.env.EMAIL_CAPTURE_TO_DISK,
    DEMO_EMAIL: process.env.DEMO_EMAIL,
    DEMO_PASSWORD: process.env.DEMO_PASSWORD,
    DEMO_NAME: process.env.DEMO_NAME,
    STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
    STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,
    ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    STORAGE_BUCKET: process.env.STORAGE_BUCKET,
  });

  if (!parsed.success) {
    throw new Error(
      `Invalid server environment variables: ${parsed.error.issues
        .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
        .join(", ")}`,
    );
  }

  cachedServerEnv = parsed.data;
  return cachedServerEnv;
}

export const publicEnv = readPublicEnv();

/** Strip trailing slashes so origin checks match browser Origin headers. */
export function normalizeAppUrl(url: string): string {
  return url.trim().replace(/\/+$/, "");
}

export function getAppBaseUrl(): string {
  return normalizeAppUrl(
    getServerEnv().BETTER_AUTH_URL ??
      publicEnv.NEXT_PUBLIC_APP_URL ??
      "http://localhost:3000",
  );
}

/**
 * Origins trusted by Better Auth. Includes both BETTER_AUTH_URL and
 * NEXT_PUBLIC_APP_URL when they differ (trailing-slash / alias drift).
 */
export function getTrustedOrigins(): string[] {
  const origins = new Set<string>();
  origins.add(getAppBaseUrl());

  const publicUrl = publicEnv.NEXT_PUBLIC_APP_URL;
  if (publicUrl) {
    origins.add(normalizeAppUrl(publicUrl));
  }

  const authUrl = getServerEnv().BETTER_AUTH_URL;
  if (authUrl) {
    origins.add(normalizeAppUrl(authUrl));
  }

  return [...origins];
}

export function isProductionRuntime(): boolean {
  return (
    process.env.VERCEL_ENV === "production" ||
    (process.env.NODE_ENV === "production" && Boolean(process.env.VERCEL))
  );
}

/** True when a real outbound email provider is configured. */
export function isEmailDeliveryConfigured(): boolean {
  const env = getServerEnv();
  return env.EMAIL_PROVIDER === "resend" && Boolean(env.RESEND_API_KEY);
}

export function isGoogleOAuthConfigured(): boolean {
  const env = getServerEnv();
  return Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET);
}

export function isDemoConfigured(): boolean {
  const env = getServerEnv();
  return Boolean(env.DEMO_EMAIL && env.DEMO_PASSWORD);
}

/** Reset cached env — intended for tests only. */
export function resetServerEnvCache() {
  cachedServerEnv = null;
}
