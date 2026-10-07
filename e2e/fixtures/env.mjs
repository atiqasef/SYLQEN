/**
 * Deterministic E2E fixtures only — not production secrets.
 * Loaded exclusively by the local Playwright test server.
 */

export const E2E_PORT = Number(process.env.E2E_PORT || 3100);

export const E2E_BASE_URL =
  process.env.PLAYWRIGHT_BASE_URL || `http://127.0.0.1:${E2E_PORT}`;

/** Fake demo identity for isolated memory-mongo runs. */
export const E2E_DEMO = {
  email: "e2e-demo@sylqen.test",
  /**
   * Deterministic fixture password for ephemeral local Mongo only.
   * Not a production credential.
   */
  password: "e2e-local-demo-password",
  name: "E2E Demo",
};

/** Synthetic Better Auth secret used only for the ephemeral E2E server. */
export const E2E_AUTH_SECRET =
  "e2e-local-better-auth-secret-not-for-production";

/**
 * @param {string} mongoUri
 * @returns {NodeJS.ProcessEnv}
 */
export function buildE2EServerEnv(mongoUri) {
  const env = {
    ...process.env,
    NODE_ENV: "production",
    PORT: String(E2E_PORT),
    MONGODB_URI: mongoUri,
    MONGODB_DB_NAME: "sylqen-e2e",
    MONGODB_USE_TRANSACTIONS: "false",
    BETTER_AUTH_SECRET: E2E_AUTH_SECRET,
    BETTER_AUTH_URL: E2E_BASE_URL,
    NEXT_PUBLIC_APP_URL: E2E_BASE_URL,
    NEXT_PUBLIC_APP_NAME: "SYLQEN",
    EMAIL_PROVIDER: "dev",
    EMAIL_CAPTURE_TO_DISK: "false",
    DEMO_EMAIL: E2E_DEMO.email,
    DEMO_PASSWORD: E2E_DEMO.password,
    DEMO_NAME: E2E_DEMO.name,
    AI_ENABLED: "false",
  };

  // Ensure optional integrations stay unset (empty string fails zod min length).
  // Also keep local next start from being treated as Vercel production.
  for (const key of [
    "VERCEL",
    "VERCEL_ENV",
    "RESEND_API_KEY",
    "GOOGLE_CLIENT_ID",
    "GOOGLE_CLIENT_SECRET",
    "FACEBOOK_CLIENT_ID",
    "FACEBOOK_CLIENT_SECRET",
    "EMAIL_FROM",
    "STRIPE_SECRET_KEY",
    "STRIPE_WEBHOOK_SECRET",
    "ANTHROPIC_API_KEY",
    "OPENAI_API_KEY",
    "STORAGE_BUCKET",
  ]) {
    delete env[key];
  }

  return env;
}
