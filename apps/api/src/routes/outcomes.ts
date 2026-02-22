import { FastifyInstance } from 'fastify';
import { z } from 'zod';

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

    // TODO: Query from database
    return reply.send({
      data: [],
      pagination: { page, limit, total: 0 },
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

    // TODO: Insert into database
    const outcome = {
      id: crypto.randomUUID(),
      ...result.data,
      status: 'draft',
      secondarySignals: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    return reply.status(201).send(outcome);
  });

  // Get outcome detail
  app.get('/api/v1/outcomes/:id', async (request, reply) => {
    const { id } = request.params as { id: string };

    // TODO: Query from database
    return reply.send({ id, message: 'Outcome detail endpoint' });
  });

  // Update outcome (draft only)
  app.put('/api/v1/outcomes/:id', async (request, reply) => {
    const { id } = request.params as { id: string };

    // TODO: Check status is draft, then update
    return reply.send({ id, message: 'Outcome updated' });
  });

  // Activate outcome (triggers hypothesis generation)
  app.post('/api/v1/outcomes/:id/activate', async (request, reply) => {
    const { id } = request.params as { id: string };

    // TODO: Validate outcome, trigger hypothesis engine
    return reply.send({
      id,
      status: 'active',
      message: 'Outcome activated — hypothesis generation started',
    });
  });

  // List experiments for outcome
  app.get('/api/v1/outcomes/:id/experiments', async (request, reply) => {
    const { id } = request.params as { id: string };

    // TODO: Query experiments by outcome_id
    return reply.send({ outcomeId: id, data: [] });
  });

  // Time-series signal data for outcome
  app.get('/api/v1/outcomes/:id/signals', async (request, reply) => {
    const { id } = request.params as { id: string };

    // TODO: Query signal_measurements by outcome_id
    return reply.send({ outcomeId: id, data: [] });
  });

  // Relevant past learnings for outcome
  app.get('/api/v1/outcomes/:id/learnings', async (request, reply) => {
    const { id } = request.params as { id: string };

    // TODO: Query learnings by outcome_id
    return reply.send({ outcomeId: id, data: [] });
  });
}
