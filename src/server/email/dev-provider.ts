import "server-only";

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { isProductionRuntime } from "@/config/env";
import { AppError } from "@/lib/errors/app-error";
import { logger } from "@/server/logging/logger";

import type { CapturedEmail, EmailProvider, SendEmailInput } from "./types";

const outbox: CapturedEmail[] = [];

/**
 * Development/test email provider.
 * Captures messages in memory (and optionally `.local/emails`) without
 * logging verification tokens or reset links.
 *
 * Refuses to run in Vercel production — serverless memory cannot deliver
 * verification email to real inboxes.
 */
export class DevEmailProvider implements EmailProvider {
  readonly name = "dev";

  async send(input: SendEmailInput): Promise<void> {
    if (isProductionRuntime()) {
      logger.error("Dev email provider refused in production", {
        provider: this.name,
        to: input.to,
        subject: input.subject,
        hint: "Set EMAIL_PROVIDER=resend, RESEND_API_KEY, and EMAIL_FROM in Vercel Production.",
      });
      throw new AppError({
        code: "INTERNAL_ERROR",
        message:
          "EMAIL_PROVIDER is 'dev' in production. Set EMAIL_PROVIDER=resend, RESEND_API_KEY, and EMAIL_FROM in Vercel Production.",
        userMessage:
          "Email delivery is not configured for this environment. Please try again later.",
      });
    }

    const captured: CapturedEmail = {
      ...input,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    };

    outbox.unshift(captured);

    logger.info("Dev email captured", {
      provider: this.name,
      to: input.to,
      subject: input.subject,
      id: captured.id,
    });

    if (process.env.EMAIL_CAPTURE_TO_DISK === "true") {
      const dir = path.join(process.cwd(), ".local", "emails");
      await mkdir(dir, { recursive: true });
      await writeFile(
        path.join(dir, `${captured.id}.json`),
        JSON.stringify(captured, null, 2),
        "utf8",
      );
    }
  }
}

export function getDevEmailOutbox(): CapturedEmail[] {
  return [...outbox];
}

export function clearDevEmailOutbox() {
  outbox.length = 0;
}

export function findLatestDevEmail(to: string): CapturedEmail | undefined {
  return outbox.find(
    (email) => email.to.toLowerCase() === to.toLowerCase(),
  );
}
