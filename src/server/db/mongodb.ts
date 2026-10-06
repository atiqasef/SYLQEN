import "server-only";

import { MongoClient, type Db } from "mongodb";

import { getServerEnv } from "@/config/env";
import { AppError } from "@/lib/errors/app-error";
import { logger } from "@/server/logging/logger";

declare global {
  var __sylqenMongoClient: MongoClient | undefined;
  var __sylqenMongoPromise: Promise<MongoClient> | undefined;
}

function resolveMongoUri(): string {
  return (
    getServerEnv().MONGODB_URI ??
    process.env.MONGODB_URI ??
    "mongodb://127.0.0.1:27017/sylqen"
  );
}

export function isMongoConfigured(): boolean {
  return Boolean(getServerEnv().MONGODB_URI ?? process.env.MONGODB_URI);
}

export function getMongoClient(): MongoClient {
  if (global.__sylqenMongoClient) {
    return global.__sylqenMongoClient;
  }

  const client = new MongoClient(resolveMongoUri(), {
    maxPoolSize: 10,
  });

  global.__sylqenMongoClient = client;
  return client;
}

export async function connectMongo(): Promise<MongoClient> {
  if (!isMongoConfigured() && process.env.NODE_ENV !== "test") {
    throw new AppError({
      code: "INTERNAL_ERROR",
      message: "MONGODB_URI is not configured",
      userMessage: "Database is not available. Please try again later.",
    });
  }

  if (!global.__sylqenMongoPromise) {
    const client = getMongoClient();
    global.__sylqenMongoPromise = client.connect().catch((error: unknown) => {
      global.__sylqenMongoPromise = undefined;
      logger.error("MongoDB connection failed", {
        error: error instanceof Error ? error.message : "unknown",
      });
      throw error;
    });
  }

  return global.__sylqenMongoPromise;
}

export function getDb(): Db {
  const env = getServerEnv();
  const dbName = env.MONGODB_DB_NAME ?? "sylqen";
  return getMongoClient().db(dbName);
}

export async function pingDatabase(): Promise<
  { ok: true } | { ok: false; reason: string }
> {
  try {
    const client = await connectMongo();
    await client.db("admin").command({ ping: 1 });
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      reason: error instanceof Error ? error.message : "MongoDB ping failed",
    };
  }
}

/** Test helper — replace the shared client (e.g. memory server). */
export function setMongoClientForTests(client: MongoClient | undefined) {
  global.__sylqenMongoClient = client;
  global.__sylqenMongoPromise = client ? Promise.resolve(client) : undefined;
}
