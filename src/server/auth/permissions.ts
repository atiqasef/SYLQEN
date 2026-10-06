import "server-only";

import type { Permission, Role } from "@/server/auth/types";

export const ALL_PERMISSIONS = [
  "workspace.read",
  "workspace.update",
  "members.read",
  "members.invite",
  "members.update",
  "members.remove",
  "customers.read",
  "customers.create",
  "customers.update",
] as const satisfies readonly Permission[];

const ROLE_PERMISSIONS: Record<Role, readonly Permission[]> = {
  owner: ALL_PERMISSIONS,
  admin: ALL_PERMISSIONS,
  member: [
    "workspace.read",
    "members.read",
    "customers.read",
    "customers.create",
    "customers.update",
  ],
  viewer: ["workspace.read", "members.read", "customers.read"],
};

export function permissionsForRole(role: Role): Permission[] {
  return [...ROLE_PERMISSIONS[role]];
}

export function roleHasPermission(role: Role, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role].includes(permission);
}

/**
 * Demo accounts are permanently capped to viewer-level read access,
 * regardless of stored role claims.
 */
export function effectivePermissions(options: {
  role: Role;
  isDemo: boolean;
}): Permission[] {
  if (options.isDemo) {
    return permissionsForRole("viewer");
  }

  return permissionsForRole(options.role);
}

export function canPerform(options: {
  role: Role;
  isDemo: boolean;
  permission: Permission;
}): boolean {
  return effectivePermissions(options).includes(options.permission);
}
