import { FastifyInstance } from 'fastify';

export async function learningRoutes(app: FastifyInstance) {
  // Search learnings (semantic)
  app.get('/api/v1/learnings', async (request, reply) => {
    const query = request.query as { q?: string; orgId?: string; limit?: string };

    // TODO: Semantic search with pgvector
    return reply.send({ data: [], query: query.q });
  });

  // Get learning detail
  app.get('/api/v1/learnings/:id', async (request, reply) => {
    const { id } = request.params as { id: string };

    // TODO: Query from database
    return reply.send({ id, message: 'Learning detail endpoint' });
  });
}
