/**
 * Authentication and authorization types.
 * Trusted identity is always derived from the server session.
 */

export type Role = "owner" | "admin" | "member" | "viewer";

export type Permission =
  | "workspace.read"
  | "workspace.update"
  | "members.read"
  | "members.invite"
  | "members.update"
  | "members.remove"
  | "customers.read"
  | "customers.create"
  | "customers.update"
  | "products.read"
  | "products.create"
  | "products.update";

export type AuthUser = {
  id: string;
  email: string;
  name: string;
  emailVerified: boolean;
  imageUrl?: string;
  isDemo: boolean;
};

export type WorkspaceSummary = {
  id: string;
  name: string;
  slug: string;
};

export type WorkspaceMembership = {
  id: string;
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
  workspace: WorkspaceSummary;
  membership: WorkspaceMembership;
};
