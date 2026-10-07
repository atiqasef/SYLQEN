import { getServerEnv, isGoogleOAuthConfigured } from "@/config/env";

/**
 * Better Auth `socialProviders` fragment for Google.
 * Returns an empty object when credentials are absent so email/password
 * auth keeps working without a partially configured Google provider.
 *
 * Secrets stay server-only — never import this module from client components.
 */
export function buildGoogleSocialProviders():
  | { google: { clientId: string; clientSecret: string } }
  | Record<string, never> {
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
