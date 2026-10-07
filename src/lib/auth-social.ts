import {
  getServerEnv,
  isFacebookOAuthConfigured,
  isGoogleOAuthConfigured,
} from "@/config/env";

type GoogleProvider = {
  google: { clientId: string; clientSecret: string };
};

type FacebookProvider = {
  facebook: { clientId: string; clientSecret: string };
};

/**
 * Better Auth `socialProviders` fragment for Google.
 * Returns an empty object when credentials are absent so email/password
 * auth keeps working without a partially configured Google provider.
 *
 * Secrets stay server-only — never import this module from client components.
 */
export function buildGoogleSocialProviders():
  | GoogleProvider
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

/**
 * Better Auth `socialProviders` fragment for Facebook.
 * Returns an empty object when credentials are absent so email/password
 * and Google auth keep working without a partially configured Facebook provider.
 *
 * Secrets stay server-only — never import this module from client components.
 */
export function buildFacebookSocialProviders():
  | FacebookProvider
  | Record<string, never> {
  const env = getServerEnv();
  if (!isFacebookOAuthConfigured()) {
    return {};
  }

  return {
    facebook: {
      clientId: env.FACEBOOK_CLIENT_ID!,
      clientSecret: env.FACEBOOK_CLIENT_SECRET!,
    },
  };
}

/** Merge optional social providers for Better Auth. */
export function buildSocialProviders(): GoogleProvider | FacebookProvider | (GoogleProvider & FacebookProvider) | Record<string, never> {
  return {
    ...buildGoogleSocialProviders(),
    ...buildFacebookSocialProviders(),
  };
}
