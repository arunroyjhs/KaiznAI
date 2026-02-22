import type { FastifyRequest, FastifyReply } from 'fastify';

export interface AuthUser {
  id: string;
  email: string;
  name?: string;
  orgId?: string;
  workspaceId?: string;
  role: 'owner' | 'admin' | 'member' | 'viewer';
}

export interface AuthenticatedRequest extends FastifyRequest {
  user: AuthUser;
}

/**
 * Fastify preHandler hook that validates the session/API key.
 * Supports both session-based auth (cookie) and API key auth (Bearer token).
 */
export function authMiddleware(auth: unknown) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const authHeader = request.headers.authorization;

    // API key authentication (for agents and programmatic access)
    if (authHeader?.startsWith('Bearer ')) {
      const apiKey = authHeader.slice(7);
      if (!apiKey) {
        return reply.status(401).send({ error: 'UNAUTHORIZED', message: 'Invalid API key' });
      }

      // TODO: Look up API key in database, validate it, extract user
      // For now, attach a placeholder user
      (request as AuthenticatedRequest).user = {
        id: 'api-key-user',
        email: 'api@placeholder.com',
        role: 'admin',
      };
      return;
    }

    // Session-based authentication (for dashboard users)
    const sessionCookie = request.cookies?.['better-auth.session_token'];
    if (!sessionCookie) {
      return reply.status(401).send({ error: 'UNAUTHORIZED', message: 'No session found' });
    }

    // TODO: Validate session with Better Auth
    // For now, attach a placeholder user
    (request as AuthenticatedRequest).user = {
      id: 'session-user',
      email: 'user@placeholder.com',
      role: 'member',
    };
  };
}

/**
 * Require a specific role or higher.
 */
export function requireRole(...roles: AuthUser['role'][]) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const user = (request as AuthenticatedRequest).user;
    if (!user) {
      return reply.status(401).send({ error: 'UNAUTHORIZED', message: 'Not authenticated' });
    }

    const roleHierarchy: AuthUser['role'][] = ['viewer', 'member', 'admin', 'owner'];
    const userRoleIndex = roleHierarchy.indexOf(user.role);
    const requiredRoleIndex = Math.min(...roles.map((r) => roleHierarchy.indexOf(r)));

    if (userRoleIndex < requiredRoleIndex) {
      return reply.status(403).send({ error: 'FORBIDDEN', message: 'Insufficient permissions' });
    }
  };
}
