import { FastifyInstance } from 'fastify';
import { z } from 'zod';

const addProviderSchema = z.object({
  provider: z.enum(['anthropic', 'openai', 'perplexity']),
  auth_mode: z.enum(['api_key', 'oauth_account']),
  api_key: z.string().optional(),
  preferred_model: z.string().optional(),
  fallback_model: z.string().optional(),
  org_id: z.string().uuid(),
});

export async function llmProviderRoutes(app: FastifyInstance) {
  // List configured providers
  app.get('/api/v1/llm/providers', async (request, reply) => {
    const query = request.query as { orgId?: string };

    // TODO: Query from database
    return reply.send({ data: [] });
  });

  // Add provider config
  app.post('/api/v1/llm/providers', async (request, reply) => {
    const result = addProviderSchema.safeParse(request.body);
    if (!result.success) {
      return reply.status(400).send({
        error: 'VALIDATION_ERROR',
        message: 'Invalid provider config',
        details: result.error.issues,
      });
    }

    // TODO: Encrypt API key, store in database
    return reply.status(201).send({
      id: crypto.randomUUID(),
      provider: result.data.provider,
      auth_mode: result.data.auth_mode,
      key_hint: result.data.api_key ? `...${result.data.api_key.slice(-4)}` : undefined,
      is_active: true,
    });
  });

  // Update provider config
  app.put('/api/v1/llm/providers/:id', async (request, reply) => {
    const { id } = request.params as { id: string };

    // TODO: Update in database
    return reply.send({ id, message: 'Provider updated' });
  });

  // Delete provider
  app.delete('/api/v1/llm/providers/:id', async (request, reply) => {
    const { id } = request.params as { id: string };

    // TODO: Soft delete from database
    return reply.send({ id, message: 'Provider removed' });
  });

  // Test provider config
  app.post('/api/v1/llm/providers/:id/test', async (request, reply) => {
    const { id } = request.params as { id: string };

    // TODO: Send test request to provider
    return reply.send({
      id,
      success: true,
      message: 'Provider test placeholder',
    });
  });
}
