/**
 * Authentication and authorization boundary.
 * No fake session behavior is implemented in Phase 1.
 */

export type Role = "owner" | "admin" | "member" | "viewer";

export type Permission =
  | "workspace:read"
  | "workspace:write"
  | "billing:manage"
  | "members:manage"
  | "ai:use";

export type AuthUser = {
  id: string;
  email: string;
  name: string;
  imageUrl?: string;
};

export type WorkspaceMembership = {
  workspaceId: string;
  userId: string;
  role: Role;
  permissions: Permission[];
};

/**
 * Trusted identity derived on the server from the session.
 * Never accept userId/workspaceId from the client as the sole authority.
 */
export type SessionContext = {
  user: AuthUser;
  membership: WorkspaceMembership;
};
