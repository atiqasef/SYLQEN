import { z } from "zod";

/**
 * Environment configuration boundary.
 *
 * - `NEXT_PUBLIC_*` values are safe for the browser.
 * - Server-only secrets must never be prefixed with `NEXT_PUBLIC_`.
 * - Future services (MongoDB, auth, Stripe, email, AI, storage, jobs)
 *   are declared here as optional until Phase 2+ wires them up.
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

  // Reserved for future phases — validated only when present
  MONGODB_URI: z.string().min(1).optional(),
  AUTH_SECRET: z.string().min(1).optional(),
  STRIPE_SECRET_KEY: z.string().min(1).optional(),
  STRIPE_WEBHOOK_SECRET: z.string().min(1).optional(),
  EMAIL_FROM: z.string().min(1).optional(),
  EMAIL_SERVER: z.string().min(1).optional(),
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
    AUTH_SECRET: process.env.AUTH_SECRET,
    STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
    STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,
    EMAIL_FROM: process.env.EMAIL_FROM,
    EMAIL_SERVER: process.env.EMAIL_SERVER,
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

/** Reset cached env — intended for tests only. */
export function resetServerEnvCache() {
  cachedServerEnv = null;
}
