import { describe, it, expect } from 'vitest';
import { withTenantFilter, assertTenantAccess, TenantAccessError } from '../tenant.js';
import type { TenantContext } from '../tenant.js';

function createContext(overrides: Partial<TenantContext> = {}): TenantContext {
  return {
    orgId: 'org-1',
    workspaceId: 'ws-1',
    userId: 'user-1',
    ...overrides,
  };
}

describe('withTenantFilter', () => {
  it('should add orgId to the query', () => {
    const query = { status: 'active', limit: 10 };
    const context = createContext({ orgId: 'org-42' });

    const result = withTenantFilter(query, context);

    expect(result).toEqual({
      status: 'active',
      limit: 10,
      orgId: 'org-42',
    });
  });

  it('should preserve all existing query properties', () => {
    const query = { name: 'test', page: 1, sort: 'desc' };
    const context = createContext();

    const result = withTenantFilter(query, context);

    expect(result.name).toBe('test');
    expect(result.page).toBe(1);
    expect(result.sort).toBe('desc');
    expect(result.orgId).toBe('org-1');
  });

  it('should override existing orgId in query with context orgId', () => {
    const query = { orgId: 'org-old', status: 'active' };
    const context = createContext({ orgId: 'org-new' });

    const result = withTenantFilter(query, context);

    expect(result.orgId).toBe('org-new');
  });

  it('should work with an empty query', () => {
    const query = {};
    const context = createContext({ orgId: 'org-1' });

    const result = withTenantFilter(query, context);

    expect(result).toEqual({ orgId: 'org-1' });
  });
});

describe('assertTenantAccess', () => {
  it('should pass when resource orgId matches context orgId', () => {
    const resource = { orgId: 'org-1' };
    const context = createContext({ orgId: 'org-1' });

    expect(() => assertTenantAccess(resource, context)).not.toThrow();
  });

  it('should throw TenantAccessError when orgIds do not match', () => {
    const resource = { orgId: 'org-other' };
    const context = createContext({ orgId: 'org-1' });

    expect(() => assertTenantAccess(resource, context)).toThrow(TenantAccessError);
  });

  it('should include expected and actual org IDs in error message', () => {
    const resource = { orgId: 'org-intruder' };
    const context = createContext({ orgId: 'org-target' });

    expect(() => assertTenantAccess(resource, context)).toThrow(
      'Tenant access violation: expected org org-target, got org-intruder',
    );
  });
});

describe('TenantAccessError', () => {
  it('should be an instance of Error', () => {
    const error = new TenantAccessError('org-1', 'org-2');

    expect(error).toBeInstanceOf(Error);
  });

  it('should have the name TenantAccessError', () => {
    const error = new TenantAccessError('org-1', 'org-2');

    expect(error.name).toBe('TenantAccessError');
  });

  it('should format the message with expected and actual org IDs', () => {
    const error = new TenantAccessError('org-expected', 'org-actual');

    expect(error.message).toBe(
      'Tenant access violation: expected org org-expected, got org-actual',
    );
  });

  it('should have a stack trace', () => {
    const error = new TenantAccessError('org-1', 'org-2');

    expect(error.stack).toBeDefined();
  });
});
