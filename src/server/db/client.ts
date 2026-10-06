import "server-only";

import { AppError } from "@/lib/errors/app-error";
import { logger } from "@/server/logging/logger";
import { isMongoConfigured, pingDatabase } from "@/server/db/mongodb";

import type { DatabaseClient } from "./types";

class MongoDatabaseClient implements DatabaseClient {
  async ping() {
    return pingDatabase();
  }
}

class UnconfiguredDatabaseClient implements DatabaseClient {
  async ping() {
    return {
      ok: false as const,
      reason: "MONGODB_URI is not configured.",
    };
  }
}

let client: DatabaseClient | null = null;

export function getDatabaseClient(): DatabaseClient {
  if (!client) {
    client = isMongoConfigured()
      ? new MongoDatabaseClient()
      : new UnconfiguredDatabaseClient();
  }

  return client;
}

export function assertDatabaseReady(): void {
  if (!isMongoConfigured()) {
    logger.warn("Database operation attempted before configuration");
    throw new AppError({
      code: "INTERNAL_ERROR",
      message: "Database is not configured",
      userMessage: "Data persistence is not available yet.",
    });
  }
}
