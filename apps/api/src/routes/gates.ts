import { FastifyInstance } from 'fastify';
import { z } from 'zod';

const respondToGateSchema = z.object({
  status: z.enum(['approved', 'rejected', 'approved_with_conditions']),
  conditions: z.array(z.string()).optional(),
  response_note: z.string().optional(),
  decided_by: z.string(),
});

export async function gateRoutes(app: FastifyInstance) {
  // Get all pending gates for user
  app.get('/api/v1/gates/pending', async (request, reply) => {
    const query = request.query as { assignedTo?: string; orgId?: string };

    // TODO: Query pending gates
    return reply.send({ data: [] });
  });

  // Get gate detail
  app.get('/api/v1/gates/:id', async (request, reply) => {
    const { id } = request.params as { id: string };

    // TODO: Query from database
    return reply.send({ id, message: 'Gate detail endpoint' });
  });

  // Human responds to gate
  app.post('/api/v1/gates/:id/respond', async (request, reply) => {
    const { id } = request.params as { id: string };

    const result = respondToGateSchema.safeParse(request.body);
    if (!result.success) {
      return reply.status(400).send({
        error: 'VALIDATION_ERROR',
        message: 'Invalid response data',
        details: result.error.issues,
      });
    }

    // TODO: Process gate response, transition experiment state
    return reply.send({
      id,
      status: result.data.status,
      message: `Gate ${result.data.status}`,
    });
  });
}
