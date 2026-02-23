import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { agentRegistry } from '../services.js';

const registerSchema = z.object({
  runtime: z.enum(['claude-code', 'cursor', 'windsurf', 'devin', 'custom-rest']),
  name: z.string().min(1),
  version: z.string().optional(),
  capabilities: z.array(z.string()).default([]),
  orgId: z.string().uuid(),
  workspaceId: z.string().uuid(),
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
  orgId: z.string().uuid().optional(),
});

export async function agentRoutes(app: FastifyInstance) {
  // Register agent
  app.post('/api/v1/agents/register', async (request, reply) => {
    const result = registerSchema.safeParse(request.body);
    if (!result.success) {
      return reply.status(400).send({ error: 'VALIDATION_ERROR', details: result.error.issues });
    }

    const agent = await agentRegistry.register(
      result.data.runtime,
      result.data.name,
      result.data.orgId,
      result.data.workspaceId,
      result.data.capabilities,
      result.data.version,
    );

    return reply.status(201).send(agent);
  });

  // Agent heartbeat
  app.post('/api/v1/agents/:id/heartbeat', async (request, reply) => {
    const { id } = request.params as { id: string };
    const result = heartbeatSchema.safeParse(request.body);
    if (!result.success) {
      return reply.status(400).send({ error: 'VALIDATION_ERROR', details: result.error.issues });
    }

    await agentRegistry.heartbeat({
      agentId: id,
      status: result.data.status,
      currentExperimentId: result.data.currentExperimentId,
    });

    return reply.send({ agentId: id, acknowledged: true });
  });

  // Unregister agent
  app.delete('/api/v1/agents/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    await agentRegistry.unregister(id);
    return reply.send({ agentId: id, unregistered: true });
  });

  // Log agent action
  app.post('/api/v1/agents/:id/actions', async (request, reply) => {
    const { id } = request.params as { id: string };
    const result = logActionSchema.safeParse(request.body);
    if (!result.success) {
      return reply.status(400).send({ error: 'VALIDATION_ERROR', details: result.error.issues });
    }

    const action = await agentRegistry.logAction(
      id,
      result.data.experimentId,
      result.data.action,
      result.data.details,
      result.data.orgId ?? '',
      result.data.filesAffected,
    );

    return reply.status(201).send(action);
  });

  // List active agents
  app.get('/api/v1/agents', async (request, reply) => {
    const { orgId } = request.query as { orgId?: string };
    const agents = await agentRegistry.getActiveAgents(orgId ?? '');
    return reply.send({ agents });
  });

  // Get audit log for experiment
  app.get('/api/v1/agents/audit/:experimentId', async (request, reply) => {
    const { experimentId } = request.params as { experimentId: string };
    const actions = await agentRegistry.getAuditLog(experimentId);
    return reply.send({ experimentId, actions });
  });
}
