import { FastifyInstance } from 'fastify';
import { z } from 'zod';

const inviteMemberSchema = z.object({
  email: z.string().email(),
  role: z.enum(['admin', 'member', 'viewer']).default('member'),
});

export async function workspaceRoutes(app: FastifyInstance) {
  // Get workspace settings
  app.get('/api/v1/workspace', async (_request, reply) => {
    // TODO: Query from database
    return reply.send({ message: 'Workspace settings endpoint' });
  });

  // Update workspace settings
  app.put('/api/v1/workspace', async (_request, reply) => {
    // TODO: Update workspace
    return reply.send({ message: 'Workspace updated' });
  });

  // List team members
  app.get('/api/v1/workspace/members', async (_request, reply) => {
    // TODO: Query members
    return reply.send({ data: [] });
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

    // TODO: Send invite email
    return reply.status(201).send({
      email: result.data.email,
      role: result.data.role,
      message: 'Invite sent',
    });
  });
}
