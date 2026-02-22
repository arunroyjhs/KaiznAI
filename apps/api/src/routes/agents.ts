import { FastifyInstance } from 'fastify';
import { z } from 'zod';

const registerSchema = z.object({
  runtime: z.enum(['claude-code', 'cursor', 'windsurf', 'devin', 'custom-rest']),
  name: z.string().min(1),
  version: z.string().optional(),
  capabilities: z.array(z.string()).default([]),
});

const heartbeatSchema = z.object({
  status: z.enum(['idle', 'building', 'testing', 'reporting', 'error', 'disconnected']),
  currentExperimentId: z.string().uuid().optional(),
  progress: z.number().min(0).max(100).optional(),
  message: z.string().optional(),
});

const logActionSchema = z.object({
  experimentId: z.string().uuid(),
  action: z.string().min(1),
  details: z.record(z.unknown()).default({}),
  filesAffected: z.array(z.string()).optional(),
});

export async function agentRoutes(app: FastifyInstance) {
  // Register agent
  app.post('/api/v1/agents/register', async (request, reply) => {
    const result = registerSchema.safeParse(request.body);
    if (!result.success) {
      return reply.status(400).send({ error: 'VALIDATION_ERROR', details: result.error.issues });
    }
    // TODO: Wire to AgentRegistry.register()
    return reply.status(201).send({
      id: crypto.randomUUID(),
      ...result.data,
      status: 'idle',
      connectedAt: new Date().toISOString(),
    });
  });

  // Agent heartbeat
  app.post('/api/v1/agents/:id/heartbeat', async (request, reply) => {
    const { id } = request.params as { id: string };
    const result = heartbeatSchema.safeParse(request.body);
    if (!result.success) {
      return reply.status(400).send({ error: 'VALIDATION_ERROR', details: result.error.issues });
    }
    // TODO: Wire to AgentRegistry.heartbeat()
    return reply.send({ agentId: id, acknowledged: true });
  });

  // Unregister agent
  app.delete('/api/v1/agents/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    // TODO: Wire to AgentRegistry.unregister()
    return reply.send({ agentId: id, unregistered: true });
  });

  // Log agent action
  app.post('/api/v1/agents/:id/actions', async (request, reply) => {
    const { id } = request.params as { id: string };
    const result = logActionSchema.safeParse(request.body);
    if (!result.success) {
      return reply.status(400).send({ error: 'VALIDATION_ERROR', details: result.error.issues });
    }
    // TODO: Wire to AgentRegistry.logAction()
    return reply.status(201).send({
      id: crypto.randomUUID(),
      agentId: id,
      ...result.data,
      timestamp: new Date().toISOString(),
    });
  });

  // List active agents
  app.get('/api/v1/agents', async (request, reply) => {
    const { orgId } = request.query as { orgId?: string };
    // TODO: Wire to AgentRegistry.getActiveAgents()
    return reply.send({ agents: [] });
  });

  // Get audit log for experiment
  app.get('/api/v1/agents/audit/:experimentId', async (request, reply) => {
    const { experimentId } = request.params as { experimentId: string };
    // TODO: Wire to AgentRegistry.getAuditLog()
    return reply.send({ experimentId, actions: [] });
  });
}
