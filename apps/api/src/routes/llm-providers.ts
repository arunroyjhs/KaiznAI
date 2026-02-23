import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { providerStore } from '../services.js';

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
    if (!query.orgId) {
      return reply.send({ data: [] });
    }

    const providers = providerStore.findByOrgId(query.orgId).map((p) => ({
      id: p.id,
      provider: p.provider,
      auth_mode: p.auth_mode,
      preferred_model: p.preferred_model,
      fallback_model: p.fallback_model,
      key_hint: p.api_key ? `...${p.api_key.slice(-4)}` : undefined,
      is_active: p.is_active,
    }));

    return reply.send({ data: providers });
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

    const provider = providerStore.create({
      id: crypto.randomUUID(),
      ...result.data,
      is_active: true,
      createdAt: new Date().toISOString(),
    });

    return reply.status(201).send({
      id: provider.id,
      provider: provider.provider,
      auth_mode: provider.auth_mode,
      key_hint: provider.api_key ? `...${provider.api_key.slice(-4)}` : undefined,
      is_active: provider.is_active,
    });
  });

  // Update provider config
  app.put('/api/v1/llm/providers/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = request.body as Record<string, unknown>;

    const updated = providerStore.update(id, body);
    if (!updated) {
      return reply.status(404).send({ error: 'NOT_FOUND', message: `Provider ${id} not found` });
    }

    return reply.send({
      id: updated.id,
      provider: updated.provider,
      auth_mode: updated.auth_mode,
      key_hint: updated.api_key ? `...${updated.api_key.slice(-4)}` : undefined,
      is_active: updated.is_active,
      message: 'Provider updated',
    });
  });

  // Delete provider
  app.delete('/api/v1/llm/providers/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const deleted = providerStore.softDelete(id);

    if (!deleted) {
      return reply.status(404).send({ error: 'NOT_FOUND', message: `Provider ${id} not found` });
    }

    return reply.send({ id, message: 'Provider removed' });
  });

  // Test provider config
  app.post('/api/v1/llm/providers/:id/test', async (request, reply) => {
    const { id } = request.params as { id: string };
    const provider = providerStore.findById(id);

    if (!provider) {
      return reply.status(404).send({ error: 'NOT_FOUND', message: `Provider ${id} not found` });
    }

    if (!provider.api_key) {
      return reply.send({
        id,
        success: false,
        message: 'No API key configured for this provider',
      });
    }

    // Validate the API key format based on provider
    const keyPatterns: Record<string, RegExp> = {
      anthropic: /^sk-ant-/,
      openai: /^sk-/,
      perplexity: /^pplx-/,
    };
    const pattern = keyPatterns[provider.provider];
    const formatValid = !pattern || pattern.test(provider.api_key);

    return reply.send({
      id,
      success: formatValid,
      message: formatValid
        ? `${provider.provider} API key format is valid`
        : `${provider.provider} API key format appears invalid`,
    });
  });
}
