/**
 * Multi-tenancy helpers for org/workspace data isolation.
 */

export interface TenantContext {
  orgId: string;
  workspaceId: string;
  userId: string;
}

/**
 * Row-level security helper — appends org_id filter to queries.
 * Used by all data access to enforce tenant isolation.
 */
export function withTenantFilter<T extends Record<string, unknown>>(
  query: T,
  context: TenantContext,
): T & { orgId: string } {
  return { ...query, orgId: context.orgId };
}

/**
 * Validate that a resource belongs to the current tenant.
 * Throws if the resource's orgId doesn't match the context.
 */
export function assertTenantAccess(
  resource: { orgId: string },
  context: TenantContext,
): void {
  if (resource.orgId !== context.orgId) {
    throw new TenantAccessError(context.orgId, resource.orgId);
  }
}

export class TenantAccessError extends Error {
  constructor(expectedOrg: string, actualOrg: string) {
    super(`Tenant access violation: expected org ${expectedOrg}, got ${actualOrg}`);
    this.name = 'TenantAccessError';
  }
}

/**
 * API key model for programmatic access.
 */
export interface ApiKey {
  id: string;
  key: string; // hashed
  name: string;
  orgId: string;
  workspaceId: string;
  createdBy: string;
  scopes: string[];
  expiresAt?: Date;
  lastUsedAt?: Date;
  createdAt: Date;
}
