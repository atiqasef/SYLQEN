import "server-only";

import {
  getServerEnv,
  isEmailDeliveryConfigured,
  isProductionRuntime,
} from "@/config/env";
import { logger } from "@/server/logging/logger";

import { DevEmailProvider } from "./dev-provider";
import { createResendProvider } from "./resend-provider";
import type { EmailProvider, SendEmailInput } from "./types";

export type { CapturedEmail, EmailProvider, SendEmailInput } from "./types";
export {
  clearDevEmailOutbox,
  findLatestDevEmail,
  getDevEmailOutbox,
} from "./dev-provider";

let cached: EmailProvider | null = null;
let productionMisconfigLogged = false;

export function getEmailProvider(): EmailProvider {
  if (cached) {
    return cached;
  }

  const env = getServerEnv();

  if (env.EMAIL_PROVIDER === "resend" && env.RESEND_API_KEY) {
    cached = createResendProvider();
  } else {
    if (isProductionRuntime() && !productionMisconfigLogged) {
      productionMisconfigLogged = true;
      logger.error("Production email delivery is not configured", {
        emailProvider: env.EMAIL_PROVIDER,
        resendConfigured: Boolean(env.RESEND_API_KEY),
        hint: "Set EMAIL_PROVIDER=resend, RESEND_API_KEY, and EMAIL_FROM in Vercel Production.",
      });
    }
    cached = new DevEmailProvider();
  }

  return cached;
}

export async function sendEmail(input: SendEmailInput): Promise<void> {
  await getEmailProvider().send(input);
}

export function getEmailDeliveryDiagnostics() {
  const env = getServerEnv();
  return {
    provider: isEmailDeliveryConfigured() ? "resend" : env.EMAIL_PROVIDER,
    deliveryConfigured: isEmailDeliveryConfigured(),
    productionRuntime: isProductionRuntime(),
  };
}

export function resetEmailProviderCache() {
  cached = null;
}

export function verificationEmailContent(url: string) {
  return {
    subject: "Verify your SYLQEN email",
    text: `Verify your email to activate your SYLQEN account:\n\n${url}\n\nIf you did not create this account, you can ignore this email.`,
    html: `
      <div style="font-family: IBM Plex Sans, Arial, sans-serif; line-height: 1.6; color: #12171c;">
        <h1 style="font-size: 20px;">Verify your email</h1>
        <p>Confirm your email address to activate your SYLQEN account.</p>
        <p><a href="${url}" style="display:inline-block;background:#0f6e72;color:#fff;padding:10px 16px;border-radius:8px;text-decoration:none;">Verify email</a></p>
        <p style="color:#5b6775;font-size:13px;">If you did not create this account, you can ignore this email.</p>
      </div>
    `,
  };
}

export function resetPasswordEmailContent(url: string) {
  return {
    subject: "Reset your SYLQEN password",
    text: `Reset your SYLQEN password using this link:\n\n${url}\n\nIf you did not request a reset, you can ignore this email.`,
    html: `
      <div style="font-family: IBM Plex Sans, Arial, sans-serif; line-height: 1.6; color: #12171c;">
        <h1 style="font-size: 20px;">Reset your password</h1>
        <p>Use the button below to choose a new password for your SYLQEN account.</p>
        <p><a href="${url}" style="display:inline-block;background:#0f6e72;color:#fff;padding:10px 16px;border-radius:8px;text-decoration:none;">Reset password</a></p>
        <p style="color:#5b6775;font-size:13px;">If you did not request this, you can ignore this email.</p>
      </div>
    `,
  };
}
