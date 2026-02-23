import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { outcomeStore, experimentStore, signalStore, learningLibrary } from '../services.js';

const createOutcomeSchema = z.object({
  slug: z.string().regex(/^[a-z0-9-]+$/),
  title: z.string().min(1),
  description: z.string().optional(),
  primarySignal: z.object({
    source: z.string(),
    metric: z.string(),
    method: z.enum(['funnel', 'event', 'custom']),
    funnel_steps: z.array(z.string()).optional(),
    segment: z.record(z.string()).optional(),
    aggregation: z.enum(['point', '7d_rolling', '30d_rolling']).default('point'),
  }),
  target: z.object({
    direction: z.enum(['increase', 'decrease']),
    from: z.number().optional(),
    to: z.number(),
    confidence_required: z.number().min(0).max(1).default(0.95),
  }),
  constraints: z.array(z.object({
    signal: z.string().optional(),
    min: z.number().optional(),
    max: z.number().optional(),
    rule: z.string().optional(),
    source: z.string().optional(),
    metric: z.string().optional(),
  })).default([]),
  maxConcurrentExperiments: z.number().int().min(1).default(3),
  horizon: z.string(),
  owner: z.string(),
  teamMembers: z.array(z.string()).default([]),
  orgId: z.string().uuid(),
  workspaceId: z.string().uuid().optional(),
});

export async function outcomeRoutes(app: FastifyInstance) {
  // List outcomes (paginated)
  app.get('/api/v1/outcomes', async (request, reply) => {
    const query = request.query as { orgId?: string; page?: string; limit?: string };
    const page = parseInt(query.page ?? '1', 10);
    const limit = parseInt(query.limit ?? '20', 10);

    if (!query.orgId) {
      return reply.send({ data: [], pagination: { page, limit, total: 0 } });
    }

    const result = outcomeStore.findByOrgId(query.orgId, page, limit);
    return reply.send({
      data: result.data,
      pagination: { page, limit, total: result.total },
    });
  });

  // Create outcome
  app.post('/api/v1/outcomes', async (request, reply) => {
    const result = createOutcomeSchema.safeParse(request.body);
    if (!result.success) {
      return reply.status(400).send({
        error: 'VALIDATION_ERROR',
        message: 'Invalid outcome data',
        details: result.error.issues,
      });
    }

    const outcome = outcomeStore.create({
      id: crypto.randomUUID(),
      ...result.data,
      status: 'draft',
      secondarySignals: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    return reply.status(201).send(outcome);
  });

  // Get outcome detail
  app.get('/api/v1/outcomes/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const outcome = outcomeStore.findById(id);

    if (!outcome) {
      return reply.status(404).send({ error: 'NOT_FOUND', message: `Outcome ${id} not found` });
    }
    return reply.send(outcome);
  });

  // Update outcome (draft only)
  app.put('/api/v1/outcomes/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const existing = outcomeStore.findById(id);

    if (!existing) {
      return reply.status(404).send({ error: 'NOT_FOUND', message: `Outcome ${id} not found` });
    }
    if (existing.status !== 'draft') {
      return reply.status(409).send({
        error: 'CONFLICT',
        message: `Outcome is ${existing.status}, only draft outcomes can be updated`,
      });
    }

    const updates = request.body as Record<string, unknown>;
    const updated = outcomeStore.update(id, updates);
    return reply.send(updated);
  });

  // Activate outcome (triggers hypothesis generation)
  app.post('/api/v1/outcomes/:id/activate', async (request, reply) => {
    const { id } = request.params as { id: string };
    const existing = outcomeStore.findById(id);

    if (!existing) {
      return reply.status(404).send({ error: 'NOT_FOUND', message: `Outcome ${id} not found` });
    }

    const updated = outcomeStore.update(id, { status: 'active' });
    return reply.send({
      ...updated,
      message: 'Outcome activated — hypothesis generation started',
    });
  });

  // List experiments for outcome
  app.get('/api/v1/outcomes/:id/experiments', async (request, reply) => {
    const { id } = request.params as { id: string };
    const experiments = experimentStore.findByOutcomeId(id);
    return reply.send({ outcomeId: id, data: experiments });
  });

  // Time-series signal data for outcome
  app.get('/api/v1/outcomes/:id/signals', async (request, reply) => {
    const { id } = request.params as { id: string };
    const signals = signalStore.findByOutcomeId(id);
    return reply.send({ outcomeId: id, data: signals });
  });

  // Relevant past learnings for outcome
  app.get('/api/v1/outcomes/:id/learnings', async (request, reply) => {
    const { id } = request.params as { id: string };
    const query = request.query as { orgId?: string };

    if (!query.orgId) {
      return reply.send({ outcomeId: id, data: [] });
    }

    const learnings = await learningLibrary.getRelevantLearnings(id, query.orgId);
    return reply.send({ outcomeId: id, data: learnings });
  });
}
