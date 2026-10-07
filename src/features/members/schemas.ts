import { z } from "zod";

/** Roles assignable through Team management (Phase 10A). */
export const MANAGEABLE_MEMBER_ROLES = ["owner", "member", "viewer"] as const;

export type ManageableMemberRole = (typeof MANAGEABLE_MEMBER_ROLES)[number];

export const MEMBER_ROLE_LABELS: Record<
  ManageableMemberRole | "admin",
  string
> = {
  owner: "Owner",
  admin: "Admin",
  member: "Member",
  viewer: "Viewer",
};

export const memberRoleSchema = z.enum(MANAGEABLE_MEMBER_ROLES, {
  error: "Select a valid role",
});

export const updateMemberRoleSchema = z.object({
  membershipId: z
    .string()
    .trim()
    .regex(/^[a-f\d]{24}$/i, "Invalid member"),
  role: memberRoleSchema,
});

export type UpdateMemberRoleInput = z.infer<typeof updateMemberRoleSchema>;

export const removeMemberSchema = z.object({
  membershipId: z
    .string()
    .trim()
    .regex(/^[a-f\d]{24}$/i, "Invalid member"),
});

export type RemoveMemberInput = z.infer<typeof removeMemberSchema>;
