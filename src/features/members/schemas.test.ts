import { describe, expect, it } from "vitest";

import {
  removeMemberSchema,
  updateMemberRoleSchema,
} from "./schemas";

describe("member schemas", () => {
  it("accepts valid role updates", () => {
    const parsed = updateMemberRoleSchema.safeParse({
      membershipId: "507f1f77bcf86cd799439011",
      role: "member",
    });
    expect(parsed.success).toBe(true);
  });

  it("rejects arbitrary roles and client workspace ids", () => {
    expect(
      updateMemberRoleSchema.safeParse({
        membershipId: "507f1f77bcf86cd799439011",
        role: "superadmin",
      }).success,
    ).toBe(false);
    expect(
      updateMemberRoleSchema.safeParse({
        membershipId: "507f1f77bcf86cd799439011",
        role: "admin",
      }).success,
    ).toBe(false);
    expect(
      updateMemberRoleSchema.safeParse({
        membershipId: "not-an-id",
        role: "viewer",
        workspaceId: "injected",
      }).success,
    ).toBe(false);
  });

  it("validates remove member id", () => {
    expect(
      removeMemberSchema.safeParse({
        membershipId: "507f1f77bcf86cd799439011",
      }).success,
    ).toBe(true);
    expect(removeMemberSchema.safeParse({ membershipId: "x" }).success).toBe(
      false,
    );
  });
});
