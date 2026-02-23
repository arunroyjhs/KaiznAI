import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { gateManager, gateStore } from '../services.js';

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
    const gates = await gateManager.getPendingGates(
      query.assignedTo ?? '',
      query.orgId ?? '',
    );
    return reply.send({ data: gates });
  });

  // Get gate detail
  app.get('/api/v1/gates/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const gate = await gateStore.findById(id);

    if (!gate) {
      return reply.status(404).send({ error: 'NOT_FOUND', message: `Gate ${id} not found` });
    }
    return reply.send(gate);
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

    try {
      const gate = await gateManager.respondToGate({
        gateId: id,
        status: result.data.status,
        conditions: result.data.conditions,
        responseNote: result.data.response_note,
        decidedBy: result.data.decided_by,
      });

      return reply.send(gate);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to respond to gate';
      return reply.status(404).send({ error: 'NOT_FOUND', message });
    }
  });
}
