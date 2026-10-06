import "server-only";

import { MongoClient, type Db } from "mongodb";

import { getServerEnv } from "@/config/env";
import { AppError } from "@/lib/errors/app-error";
import { logger } from "@/server/logging/logger";

declare global {
  var __sylqenMongoClient: MongoClient | undefined;
  var __sylqenMongoPromise: Promise<MongoClient> | undefined;
}

/**
 * Strip accidental wrappers from env paste (Vercel/dashboard quotes, whitespace).
 * Does not decode, rewrite credentials, or invent a connection string.
 */
export function normalizeMongoUri(raw: string): string {
  let value = raw.trim();

  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    value = value.slice(1, -1).trim();
  }

  return value;
}

/**
 * Secret-free scheme check. Never logs the URI or credentials.
 */
export function assertMongoUriShape(uri: string): void {
  if (
    !uri.startsWith("mongodb://") &&
    !uri.startsWith("mongodb+srv://")
  ) {
    throw new AppError({
      code: "INTERNAL_ERROR",
      message:
        "MONGODB_URI must start with mongodb:// or mongodb+srv:// (check for accidental quotes, whitespace, or a missing scheme in the environment variable).",
      userMessage: "Database is not available. Please try again later.",
    });
  }
}

function resolveMongoUri(): string {
  const raw =
    getServerEnv().MONGODB_URI ??
    process.env.MONGODB_URI ??
    "mongodb://127.0.0.1:27017/sylqen";

  const uri = normalizeMongoUri(raw);
  assertMongoUriShape(uri);
  return uri;
}

export function isMongoConfigured(): boolean {
  const raw = getServerEnv().MONGODB_URI ?? process.env.MONGODB_URI;
  if (!raw) {
    return false;
  }
  return normalizeMongoUri(raw).length > 0;
}

export function getMongoClient(): MongoClient {
  if (global.__sylqenMongoClient) {
    return global.__sylqenMongoClient;
  }

  const uri = resolveMongoUri();

  let client: MongoClient;
  try {
    client = new MongoClient(uri, {
      maxPoolSize: 10,
    });
  } catch (error) {
    const reason = error instanceof Error ? error.message : "unknown";
    logger.error("MongoDB client rejected MONGODB_URI", {
      reason,
      hint: "Ensure the value has no surrounding quotes, leading/trailing whitespace, a valid mongodb:// or mongodb+srv:// scheme, and that any special characters in the password are percent-encoded.",
    });
    throw new AppError({
      code: "INTERNAL_ERROR",
      message:
        "MONGODB_URI is syntactically invalid. Remove surrounding quotes/whitespace, use mongodb:// or mongodb+srv://, and percent-encode special characters in the password. Do not paste Atlas placeholders like <password> unless replaced.",
      userMessage: "Database is not available. Please try again later.",
    });
  }

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
