import "server-only";

import { AppError } from "@/lib/errors/app-error";
import { logger } from "@/server/logging/logger";

import type { DatabaseClient } from "./types";

/**
 * Placeholder database client.
 * MongoDB is intentionally not connected in Phase 1.
 */
class UnconfiguredDatabaseClient implements DatabaseClient {
  async ping() {
    return {
      ok: false as const,
      reason: "Database is not configured in Phase 1. Set MONGODB_URI in a later phase.",
    };
  }
}

let client: DatabaseClient | null = null;

export function getDatabaseClient(): DatabaseClient {
  if (!client) {
    client = new UnconfiguredDatabaseClient();
  }

  return client;
}

/**
 * Guard for future repository methods.
 * Throws a safe application error until persistence is implemented.
 */
export function assertDatabaseReady(): never {
  logger.warn("Database operation attempted before configuration");
  throw new AppError({
    code: "INTERNAL_ERROR",
    message: "Database is not configured",
    userMessage: "Data persistence is not available yet.",
  });
}
