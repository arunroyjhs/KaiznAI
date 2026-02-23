import { FastifyInstance } from 'fastify';
import { learningLibrary, learningStore } from '../services.js';

export async function learningRoutes(app: FastifyInstance) {
  // Search learnings (semantic)
  app.get('/api/v1/learnings', async (request, reply) => {
    const query = request.query as { q?: string; orgId?: string; limit?: string };

    if (!query.orgId) {
      return reply.send({ data: [], query: query.q });
    }

    const limit = parseInt(query.limit ?? '10', 10);
    const results = query.q
      ? await learningLibrary.search({ query: query.q, orgId: query.orgId, limit })
      : await learningLibrary.search({ orgId: query.orgId, limit });

    return reply.send({ data: results, query: query.q });
  });

  // Get learning detail
  app.get('/api/v1/learnings/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const learning = await learningStore.findById(id);

    if (!learning) {
      return reply.status(404).send({ error: 'NOT_FOUND', message: `Learning ${id} not found` });
    }
    return reply.send(learning);
  });
}
