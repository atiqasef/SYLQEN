import "server-only";

import { Resend } from "resend";

import { getServerEnv } from "@/config/env";
import { AppError } from "@/lib/errors/app-error";
import { logger } from "@/server/logging/logger";

import type { EmailProvider, SendEmailInput } from "./types";

export class ResendEmailProvider implements EmailProvider {
  readonly name = "resend";
  private readonly client: Resend;
  private readonly from: string;

  constructor(apiKey: string, from: string) {
    this.client = new Resend(apiKey);
    this.from = from;
  }

  async send(input: SendEmailInput): Promise<void> {
    const result = await this.client.emails.send({
      from: this.from,
      to: input.to,
      subject: input.subject,
      html: input.html,
      text: input.text,
    });

    if (result.error) {
      logger.error("Resend email failed", {
        provider: this.name,
        to: input.to,
        message: result.error.message,
      });
      throw new AppError({
        code: "INTERNAL_ERROR",
        message: result.error.message,
        userMessage: "Unable to send email right now. Please try again.",
      });
    }

    logger.info("Email sent", {
      provider: this.name,
      to: input.to,
      subject: input.subject,
    });
  }
}

export function createResendProvider(): ResendEmailProvider {
  const env = getServerEnv();
  if (!env.RESEND_API_KEY) {
    throw new AppError({
      code: "INTERNAL_ERROR",
      message: "RESEND_API_KEY is not configured",
      userMessage: "Email delivery is not configured.",
    });
  }

  return new ResendEmailProvider(
    env.RESEND_API_KEY,
    env.EMAIL_FROM ?? "SYLQEN <onboarding@resend.dev>",
  );
}
