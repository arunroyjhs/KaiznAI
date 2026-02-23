import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { workspaceStore } from '../services.js';

const inviteMemberSchema = z.object({
  email: z.string().email(),
  role: z.enum(['admin', 'member', 'viewer']).default('member'),
});

export async function workspaceRoutes(app: FastifyInstance) {
  // Get workspace settings
  app.get('/api/v1/workspace', async (request, reply) => {
    const query = request.query as { orgId?: string };
    if (!query.orgId) {
      return reply.send({ message: 'orgId query parameter is required' });
    }

    const workspace = workspaceStore.getWorkspaceByOrgId(query.orgId);
    if (!workspace) {
      return reply.status(404).send({
        error: 'NOT_FOUND',
        message: 'Workspace not found for this organization',
      });
    }
    return reply.send(workspace);
  });

  // Update workspace settings
  app.put('/api/v1/workspace', async (request, reply) => {
    const body = request.body as { orgId?: string; name?: string; settings?: Record<string, unknown> };
    if (!body.orgId) {
      return reply.status(400).send({ error: 'VALIDATION_ERROR', message: 'orgId is required' });
    }

    const updated = workspaceStore.updateWorkspace(body.orgId, {
      ...(body.name && { name: body.name }),
      ...(body.settings && { settings: body.settings }),
    });

    if (!updated) {
      // Create workspace if it doesn't exist
      const workspace = workspaceStore.setWorkspace({
        id: crypto.randomUUID(),
        name: body.name ?? 'Default Workspace',
        orgId: body.orgId,
        settings: body.settings ?? {},
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      return reply.send(workspace);
    }

    return reply.send(updated);
  });

  // List team members
  app.get('/api/v1/workspace/members', async (request, reply) => {
    const query = request.query as { orgId?: string };
    if (!query.orgId) {
      return reply.send({ data: [] });
    }

    const members = workspaceStore.getMembers(query.orgId);
    return reply.send({ data: members });
  });

  // Invite member
  app.post('/api/v1/workspace/members/invite', async (request, reply) => {
    const result = inviteMemberSchema.safeParse(request.body);
    if (!result.success) {
      return reply.status(400).send({
        error: 'VALIDATION_ERROR',
        message: 'Invalid invite data',
        details: result.error.issues,
      });
    }

    const body = request.body as { orgId?: string };
    const member = workspaceStore.addMember({
      id: crypto.randomUUID(),
      email: result.data.email,
      role: result.data.role,
      orgId: body.orgId ?? '',
      status: 'invited',
      invitedAt: new Date().toISOString(),
    });

    return reply.status(201).send({
      id: member.id,
      email: member.email,
      role: member.role,
      status: member.status,
      message: 'Invite sent',
    });
  });
}
