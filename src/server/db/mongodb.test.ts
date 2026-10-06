import { describe, expect, it } from "vitest";

import { AppError } from "@/lib/errors/app-error";
import {
  assertMongoUriShape,
  inspectMongoUriCredentialEncoding,
  normalizeMongoUri,
} from "@/server/db/mongodb";

describe("normalizeMongoUri", () => {
  it("trims whitespace and strips surrounding quotes", () => {
    expect(normalizeMongoUri('  "mongodb+srv://u:p@host/db"  ')).toBe(
      "mongodb+srv://u:p@host/db",
    );
    expect(normalizeMongoUri("'mongodb://127.0.0.1:27017/testdb'")).toBe(
      "mongodb://127.0.0.1:27017/testdb",
    );
    expect(normalizeMongoUri("mongodb://127.0.0.1:27017/testdb")).toBe(
      "mongodb://127.0.0.1:27017/testdb",
    );
    expect(
      normalizeMongoUri("\u201cmongodb+srv://u:p@host/db\u201d"),
    ).toBe("mongodb+srv://u:p@host/db");
  });

  it("does not invent or rewrite credentials", () => {
    const uri = "mongodb+srv://test_user:test_pass@cluster0.example.net/testdb";
    expect(normalizeMongoUri(uri)).toBe(uri);
  });
});

describe("assertMongoUriShape", () => {
  it("accepts mongodb and mongodb+srv schemes", () => {
    expect(() =>
      assertMongoUriShape("mongodb://127.0.0.1:27017/testdb"),
    ).not.toThrow();
    expect(() =>
      assertMongoUriShape("mongodb+srv://u:p@cluster.example.net/testdb"),
    ).not.toThrow();
  });

  it("rejects missing schemes with a secret-free AppError", () => {
    expect(() => assertMongoUriShape("user:pass@host/db")).toThrow(AppError);
    try {
      assertMongoUriShape("not-a-mongo-uri");
    } catch (error) {
      expect(error).toBeInstanceOf(AppError);
      expect((error as AppError).message).not.toMatch(/not-a-mongo-uri/);
      expect((error as AppError).message).toMatch(/mongodb:\/\//);
    }
  });
});

describe("inspectMongoUriCredentialEncoding", () => {
  it("accepts properly encoded credentials", () => {
    expect(
      inspectMongoUriCredentialEncoding(
        "mongodb+srv://test_user:p%40ssword@cluster0.example.net/testdb",
      ),
    ).toBeNull();
  });

  it("detects unencoded @ in credentials without exposing secrets", () => {
    expect(
      inspectMongoUriCredentialEncoding(
        "mongodb+srv://test_user:p@ssword@cluster0.example.net/testdb",
      ),
    ).toBe("unencoded_at_in_credentials");
  });

  it("detects unencoded : in credentials", () => {
    expect(
      inspectMongoUriCredentialEncoding(
        "mongodb+srv://test_user:p:ssword@cluster0.example.net/testdb",
      ),
    ).toBe("unencoded_colon_in_credentials");
  });
});
