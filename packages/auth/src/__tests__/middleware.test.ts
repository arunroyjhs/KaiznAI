import { describe, it, expect, vi, beforeEach } from 'vitest';
import { authMiddleware, requireRole } from '../middleware.js';
import type { AuthenticatedRequest } from '../middleware.js';

function createMockRequest(overrides: Record<string, unknown> = {}) {
  return {
    headers: {},
    cookies: {},
    ...overrides,
  } as unknown as AuthenticatedRequest;
}

function createMockReply() {
  const reply = {
    statusCode: 200,
    body: null as unknown,
    status: vi.fn().mockImplementation((code: number) => {
      reply.statusCode = code;
      return reply;
    }),
    send: vi.fn().mockImplementation((body: unknown) => {
      reply.body = body;
      return reply;
    }),
  };
  return reply;
}

describe('authMiddleware', () => {
  let middleware: ReturnType<typeof authMiddleware>;

  beforeEach(() => {
    middleware = authMiddleware({});
  });

  it('should attach api-key-user when Bearer token is provided', async () => {
    const request = createMockRequest({
      headers: { authorization: 'Bearer some-valid-api-key' },
    });
    const reply = createMockReply();

    await middleware(request, reply as any);

    expect((request as AuthenticatedRequest).user).toEqual({
      id: 'api-key-user',
      email: 'api@placeholder.com',
      role: 'admin',
    });
    expect(reply.status).not.toHaveBeenCalled();
  });

  it('should return 401 when Bearer token is empty', async () => {
    const request = createMockRequest({
      headers: { authorization: 'Bearer ' },
    });
    const reply = createMockReply();

    await middleware(request, reply as any);

    expect(reply.status).toHaveBeenCalledWith(401);
    expect(reply.send).toHaveBeenCalledWith(
      expect.objectContaining({ error: 'UNAUTHORIZED' }),
    );
  });

  it('should attach session-user when session cookie is present', async () => {
    const request = createMockRequest({
      cookies: { 'better-auth.session_token': 'session-abc-123' },
    });
    const reply = createMockReply();

    await middleware(request, reply as any);

    expect((request as AuthenticatedRequest).user).toEqual({
      id: 'session-user',
      email: 'user@placeholder.com',
      role: 'member',
    });
    expect(reply.status).not.toHaveBeenCalled();
  });

  it('should return 401 when no auth is provided', async () => {
    const request = createMockRequest();
    const reply = createMockReply();

    await middleware(request, reply as any);

    expect(reply.status).toHaveBeenCalledWith(401);
    expect(reply.send).toHaveBeenCalledWith(
      expect.objectContaining({
        error: 'UNAUTHORIZED',
        message: 'No session found',
      }),
    );
  });

  it('should prefer Bearer token over session cookie when both are present', async () => {
    const request = createMockRequest({
      headers: { authorization: 'Bearer my-api-key' },
      cookies: { 'better-auth.session_token': 'session-abc' },
    });
    const reply = createMockReply();

    await middleware(request, reply as any);

    expect((request as AuthenticatedRequest).user.id).toBe('api-key-user');
  });
});

describe('requireRole', () => {
  it('should allow when user has sufficient role', async () => {
    const request = createMockRequest();
    (request as AuthenticatedRequest).user = {
      id: 'user-1',
      email: 'admin@test.com',
      role: 'admin',
    };
    const reply = createMockReply();

    const handler = requireRole('member');
    await handler(request, reply as any);

    expect(reply.status).not.toHaveBeenCalled();
  });

  it('should allow when user has exact required role', async () => {
    const request = createMockRequest();
    (request as AuthenticatedRequest).user = {
      id: 'user-1',
      email: 'member@test.com',
      role: 'member',
    };
    const reply = createMockReply();

    const handler = requireRole('member');
    await handler(request, reply as any);

    expect(reply.status).not.toHaveBeenCalled();
  });

  it('should reject when user has insufficient role', async () => {
    const request = createMockRequest();
    (request as AuthenticatedRequest).user = {
      id: 'user-1',
      email: 'viewer@test.com',
      role: 'viewer',
    };
    const reply = createMockReply();

    const handler = requireRole('admin');
    await handler(request, reply as any);

    expect(reply.status).toHaveBeenCalledWith(403);
    expect(reply.send).toHaveBeenCalledWith(
      expect.objectContaining({
        error: 'FORBIDDEN',
        message: 'Insufficient permissions',
      }),
    );
  });

  it('should return 401 when no user is attached to request', async () => {
    const request = createMockRequest();
    const reply = createMockReply();

    const handler = requireRole('member');
    await handler(request, reply as any);

    expect(reply.status).toHaveBeenCalledWith(401);
    expect(reply.send).toHaveBeenCalledWith(
      expect.objectContaining({
        error: 'UNAUTHORIZED',
        message: 'Not authenticated',
      }),
    );
  });

  it('should allow owner for any role requirement', async () => {
    const request = createMockRequest();
    (request as AuthenticatedRequest).user = {
      id: 'user-1',
      email: 'owner@test.com',
      role: 'owner',
    };
    const reply = createMockReply();

    const handler = requireRole('admin');
    await handler(request, reply as any);

    expect(reply.status).not.toHaveBeenCalled();
  });

  it('should respect the role hierarchy: viewer < member < admin < owner', async () => {
    const roles = ['viewer', 'member', 'admin', 'owner'] as const;

    for (let i = 0; i < roles.length; i++) {
      for (let j = 0; j < roles.length; j++) {
        const userRole = roles[i];
        const requiredRole = roles[j];

        const request = createMockRequest();
        (request as AuthenticatedRequest).user = {
          id: 'user-1',
          email: 'test@test.com',
          role: userRole,
        };
        const reply = createMockReply();

        const handler = requireRole(requiredRole);
        await handler(request, reply as any);

        if (i >= j) {
          // User role is sufficient
          expect(reply.status).not.toHaveBeenCalled();
        } else {
          // User role is insufficient
          expect(reply.status).toHaveBeenCalledWith(403);
        }
      }
    }
  });

  it('should accept any of multiple roles (uses minimum required)', async () => {
    const request = createMockRequest();
    (request as AuthenticatedRequest).user = {
      id: 'user-1',
      email: 'member@test.com',
      role: 'member',
    };
    const reply = createMockReply();

    // Requiring 'member' or 'admin' — minimum is 'member', so member should pass
    const handler = requireRole('member', 'admin');
    await handler(request, reply as any);

    expect(reply.status).not.toHaveBeenCalled();
  });
});
