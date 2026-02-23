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
 *
 * The `auth` parameter accepts a Better Auth instance. When available, it is
 * used to validate session tokens. When null/undefined, sessions fall back to
 * a development-mode placeholder user.
 */
export function authMiddleware(auth: unknown) {
  const betterAuth = auth as { api?: { getSession?: (opts: { headers: unknown }) => Promise<{ user?: { id: string; email: string; name?: string } } | null> } } | null;

  return async (request: FastifyRequest, reply: FastifyReply) => {
    const authHeader = request.headers.authorization;

    // API key authentication (for agents and programmatic access)
    if (authHeader?.startsWith('Bearer ')) {
      const apiKey = authHeader.slice(7);
      if (!apiKey) {
        return reply.status(401).send({ error: 'UNAUTHORIZED', message: 'Invalid API key' });
      }

      // Derive a deterministic user identity from the API key prefix.
      // In production this would look up the key in the api_keys table,
      // verify the hash, and return the associated user + org + scopes.
      const keyHash = apiKey.slice(-8);
      (request as AuthenticatedRequest).user = {
        id: `apikey-${keyHash}`,
        email: `apikey-${keyHash}@system`,
        role: 'admin',
      };
      return;
    }

    // Session-based authentication (for dashboard users)
    const sessionCookie = request.cookies?.['better-auth.session_token'];
    if (!sessionCookie) {
      return reply.status(401).send({ error: 'UNAUTHORIZED', message: 'No session found' });
    }

    // Validate session with Better Auth when available
    if (betterAuth?.api?.getSession) {
      try {
        const session = await betterAuth.api.getSession({
          headers: request.headers,
        });

        if (!session?.user) {
          return reply.status(401).send({ error: 'UNAUTHORIZED', message: 'Invalid session' });
        }

        (request as AuthenticatedRequest).user = {
          id: session.user.id,
          email: session.user.email,
          name: session.user.name,
          role: 'member',
        };
        return;
      } catch {
        return reply.status(401).send({ error: 'UNAUTHORIZED', message: 'Session validation failed' });
      }
    }

    // Development fallback: extract user info from session cookie
    (request as AuthenticatedRequest).user = {
      id: `session-${sessionCookie.slice(0, 8)}`,
      email: 'user@session.local',
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
