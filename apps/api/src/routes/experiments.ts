import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { experimentStore, signalStore } from '../services.js';

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
    const experiment = experimentStore.findById(id);

    if (!experiment) {
      return reply.status(404).send({ error: 'NOT_FOUND', message: `Experiment ${id} not found` });
    }
    return reply.send(experiment);
  });

  // Get experiment brief (for AI agents)
  app.get('/api/v1/experiments/:id/brief', async (request, reply) => {
    const { id } = request.params as { id: string };
    const experiment = experimentStore.findById(id);

    if (!experiment) {
      return reply.status(404).send({ error: 'NOT_FOUND', message: `Experiment ${id} not found` });
    }

    const brief = experiment.brief ?? {
      experiment_id: id,
      hypothesis: experiment.hypothesis,
      scope: { allowed_paths: [], forbidden_paths: [] },
      constraints: [],
      feature_flag_key: '',
    };

    return reply.send({ id, brief });
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

    const experiment = experimentStore.findById(id);
    if (!experiment) {
      return reply.status(404).send({ error: 'NOT_FOUND', message: `Experiment ${id} not found` });
    }

    const updated = experimentStore.update(id, {
      status: 'awaiting_launch_gate',
      buildReport: {
        implementation_summary: result.data.implementation_summary,
        files_changed: result.data.files_changed,
        feature_flag_key: result.data.feature_flag_key,
        agent_notes: result.data.agent_notes,
        reported_at: new Date().toISOString(),
      },
    });

    return reply.send({
      ...updated,
      message: 'Build reported — launch gate created',
    });
  });

  // Get current measurement result
  app.get('/api/v1/experiments/:id/result', async (request, reply) => {
    const { id } = request.params as { id: string };
    const experiment = experimentStore.findById(id);

    if (!experiment) {
      return reply.status(404).send({ error: 'NOT_FOUND', message: `Experiment ${id} not found` });
    }

    return reply.send({ id, result: experiment.result ?? null });
  });

  // Time-series signal data for experiment
  app.get('/api/v1/experiments/:id/signals', async (request, reply) => {
    const { id } = request.params as { id: string };
    const signals = signalStore.findByExperimentId(id);
    return reply.send({ experimentId: id, data: signals });
  });
}
