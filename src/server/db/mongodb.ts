import "server-only";

import { MongoClient, type Db } from "mongodb";

import { getServerEnv } from "@/config/env";
import { AppError } from "@/lib/errors/app-error";
import { logger } from "@/server/logging/logger";

declare global {
  var __sylqenMongoClient: MongoClient | undefined;
  var __sylqenMongoPromise: Promise<MongoClient> | undefined;
}

const WRAPPER_QUOTE_PAIRS: ReadonlyArray<readonly [string, string]> = [
  ['"', '"'],
  ["'", "'"],
  ["\u201c", "\u201d"],
  ["\u2018", "\u2019"],
];

/**
 * Strip accidental wrappers from env paste (Vercel/dashboard quotes, whitespace).
 * Does not decode, rewrite credentials, or invent a connection string.
 */
export function normalizeMongoUri(raw: string): string {
  let value = raw.trim();

  for (const [open, close] of WRAPPER_QUOTE_PAIRS) {
    if (value.startsWith(open) && value.endsWith(close) && value.length >= 2) {
      value = value.slice(open.length, value.length - close.length).trim();
      break;
    }
  }

  return value;
}

/**
 * Secret-free scheme check. Never logs the URI or credentials.
 */
export function assertMongoUriShape(uri: string): void {
  if (!uri.startsWith("mongodb://") && !uri.startsWith("mongodb+srv://")) {
    throw new AppError({
      code: "INTERNAL_ERROR",
      message:
        "MONGODB_URI must start with mongodb:// or mongodb+srv:// (check for accidental quotes, whitespace, or a missing scheme in the environment variable).",
      userMessage: "Database is not available. Please try again later.",
    });
  }
}

export type MongoUriCredentialIssue =
  | "missing_host_separator"
  | "unencoded_at_in_credentials"
  | "unencoded_colon_in_credentials"
  | "unencoded_reserved_in_credentials"
  | "malformed_percent_encoding";

/**
 * Inspect credential encoding without reading or returning secret values.
 * Detects URI-reserved characters that must be percent-encoded in userinfo.
 */
export function inspectMongoUriCredentialEncoding(
  uri: string,
): MongoUriCredentialIssue | null {
  let rest: string | null = null;
  if (uri.startsWith("mongodb+srv://")) {
    rest = uri.slice("mongodb+srv://".length);
  } else if (uri.startsWith("mongodb://")) {
    rest = uri.slice("mongodb://".length);
  }

  if (rest == null) {
    return null;
  }
  const atMatches = rest.match(/@/g);
  const atCount = atMatches?.length ?? 0;

  if (atCount === 0) {
    return "missing_host_separator";
  }

  if (atCount > 1) {
    return "unencoded_at_in_credentials";
  }

  const atIndex = rest.indexOf("@");
  const userinfo = rest.slice(0, atIndex);

  if (/%(?![0-9A-Fa-f]{2})/.test(userinfo)) {
    return "malformed_percent_encoding";
  }

  const colonCount = (userinfo.match(/:/g) ?? []).length;
  if (colonCount > 1) {
    return "unencoded_colon_in_credentials";
  }

  // RFC3986 / MongoDB: these must be percent-encoded in userinfo.
  if (/[/?#\[\]]/.test(userinfo)) {
    return "unencoded_reserved_in_credentials";
  }

  return null;
}

function credentialIssueHint(issue: MongoUriCredentialIssue): string {
  switch (issue) {
    case "unencoded_at_in_credentials":
      return "The username/password section appears to contain an unencoded '@'. Keep the Atlas password unchanged; in MONGODB_URI encode '@' as %40.";
    case "unencoded_colon_in_credentials":
      return "The username/password section appears to contain an unencoded ':'. Keep the Atlas password unchanged; in MONGODB_URI encode ':' as %3A.";
    case "unencoded_reserved_in_credentials":
      return "The username/password section appears to contain an unencoded reserved character (/ ? # [ ]). Keep the Atlas password unchanged; percent-encode those characters in MONGODB_URI.";
    case "malformed_percent_encoding":
      return "The username/password section has a malformed percent-encoding sequence. Fix %HH sequences in MONGODB_URI without changing the Atlas password.";
    case "missing_host_separator":
      return "MONGODB_URI is missing the '@host' separator after credentials.";
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
  const credentialIssue = inspectMongoUriCredentialEncoding(uri);

  let client: MongoClient;
  try {
    client = new MongoClient(uri, {
      maxPoolSize: 10,
    });
  } catch (error) {
    const reason = error instanceof Error ? error.message : "unknown";
    const hint =
      credentialIssue != null
        ? credentialIssueHint(credentialIssue)
        : "If the Atlas password contains reserved characters (: / ? # [ ] @), keep that password in Atlas and percent-encode those characters inside MONGODB_URI only (example: @ → %40). Do not wrap the URI in quotes.";

    logger.error("MongoDB client rejected MONGODB_URI", {
      reason,
      credentialIssue: credentialIssue ?? "none",
      hint,
    });

    throw new AppError({
      code: "INTERNAL_ERROR",
      message: `MONGODB_URI is syntactically invalid (${reason}). ${hint}`,
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
