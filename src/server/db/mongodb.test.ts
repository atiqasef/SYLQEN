import { describe, expect, it } from "vitest";

import {
  assertMongoUriShape,
  normalizeMongoUri,
} from "@/server/db/mongodb";
import { AppError } from "@/lib/errors/app-error";

describe("normalizeMongoUri", () => {
  it("trims whitespace and strips surrounding quotes", () => {
    expect(normalizeMongoUri('  "mongodb+srv://u:p@host/db"  ')).toBe(
      "mongodb+srv://u:p@host/db",
    );
    expect(normalizeMongoUri("'mongodb://127.0.0.1:27017/sylqen'")).toBe(
      "mongodb://127.0.0.1:27017/sylqen",
    );
    expect(normalizeMongoUri("mongodb://127.0.0.1:27017/sylqen")).toBe(
      "mongodb://127.0.0.1:27017/sylqen",
    );
  });

  it("does not invent or rewrite credentials", () => {
    const uri = "mongodb+srv://sylqen_app:s3cret@cluster.mongodb.net/sylqen";
    expect(normalizeMongoUri(uri)).toBe(uri);
  });
});

describe("assertMongoUriShape", () => {
  it("accepts mongodb and mongodb+srv schemes", () => {
    expect(() =>
      assertMongoUriShape("mongodb://127.0.0.1:27017/sylqen"),
    ).not.toThrow();
    expect(() =>
      assertMongoUriShape("mongodb+srv://u:p@cluster.mongodb.net/sylqen"),
    ).not.toThrow();
  });

  it("rejects missing schemes with a secret-free AppError", () => {
    expect(() => assertMongoUriShape("sylqen_app:pass@host/db")).toThrow(
      AppError,
    );
    try {
      assertMongoUriShape("not-a-mongo-uri");
    } catch (error) {
      expect(error).toBeInstanceOf(AppError);
      expect((error as AppError).message).not.toMatch(/not-a-mongo-uri/);
      expect((error as AppError).message).toMatch(/mongodb:\/\//);
    }
  });
});
