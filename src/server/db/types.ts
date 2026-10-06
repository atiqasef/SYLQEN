/**
 * Database boundary types for future MongoDB integration.
 * Multi-tenancy is a first-class concept from day one.
 */

export type TenantId = string;
export type UserId = string;
export type WorkspaceId = string;

/**
 * Every tenant-scoped record must carry workspace/organization identity.
 * Repositories must enforce isolation using trusted server context — never
 * browser-supplied tenant IDs alone.
 */
export type TenantScoped = {
  workspaceId: WorkspaceId;
};

export type RepositoryContext = {
  workspaceId: WorkspaceId;
  userId: UserId;
};

export interface DatabaseClient {
  /** Health probe for future connection pooling / readiness checks. */
  ping(): Promise<{ ok: true } | { ok: false; reason: string }>;
}
