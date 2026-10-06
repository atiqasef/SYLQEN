import { describe, expect, it } from "vitest";

import { getSafeNextPath } from "@/lib/navigation/safe-next-path";

describe("getSafeNextPath", () => {
  it("keeps relative app paths", () => {
    expect(getSafeNextPath("/")).toBe("/");
    expect(getSafeNextPath("/settings")).toBe("/settings");
    expect(getSafeNextPath("/verify-email?token=abc")).toBe(
      "/verify-email?token=abc",
    );
  });

  it("rejects absolute and protocol-relative URLs", () => {
    expect(getSafeNextPath("https://evil.example")).toBe("/");
    expect(getSafeNextPath("//evil.example")).toBe("/");
    expect(getSafeNextPath("\\\\evil.example")).toBe("/");
    expect(getSafeNextPath("/\\evil.example")).toBe("/");
  });

  it("falls back for empty or non-path values", () => {
    expect(getSafeNextPath(null)).toBe("/");
    expect(getSafeNextPath("")).toBe("/");
    expect(getSafeNextPath("settings")).toBe("/");
    expect(getSafeNextPath(null, "/overview")).toBe("/overview");
  });
});
