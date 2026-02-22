import { FastifyInstance } from 'fastify';
import { z } from 'zod';

const reportBuiltSchema = z.object({
  implementation_summary: z.string().min(1),
  files_changed: z.array(z.string()),
  feature_flag_key: z.string().optional(),
  agent_notes: z.string().optional(),
});

export async function experimentRoutes(app: FastifyInstance) {
  // Get experiment detail
  app.get('/api/v1/experiments/:id', async (request, reply) => {
    const { id } = request.params as { id: string };

    // TODO: Query from database
    return reply.send({ id, message: 'Experiment detail endpoint' });
  });

  // Get experiment brief (for AI agents)
  app.get('/api/v1/experiments/:id/brief', async (request, reply) => {
    const { id } = request.params as { id: string };

    // TODO: Build agent-ready experiment brief
    return reply.send({
      id,
      message: 'Agent experiment brief endpoint',
      brief: {
        experiment_id: id,
        hypothesis: '',
        scope: { allowed_paths: [], forbidden_paths: [] },
        constraints: [],
        feature_flag_key: '',
      },
    });
  });

  // Agent reports build complete
  app.post('/api/v1/experiments/:id/built', async (request, reply) => {
    const { id } = request.params as { id: string };

    const result = reportBuiltSchema.safeParse(request.body);
    if (!result.success) {
      return reply.status(400).send({
        error: 'VALIDATION_ERROR',
        message: 'Invalid report data',
        details: result.error.issues,
      });
    }

    // TODO: Update experiment status, create launch gate
    return reply.send({
      id,
      status: 'awaiting_launch_gate',
      message: 'Build reported — launch gate created',
    });
  });

  // Get current measurement result
  app.get('/api/v1/experiments/:id/result', async (request, reply) => {
    const { id } = request.params as { id: string };

    // TODO: Query current result
    return reply.send({ id, result: null });
  });

  // Time-series signal data for experiment
  app.get('/api/v1/experiments/:id/signals', async (request, reply) => {
    const { id } = request.params as { id: string };

    // TODO: Query signal_measurements by experiment_id
    return reply.send({ experimentId: id, data: [] });
  });
}
