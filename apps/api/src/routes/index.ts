import { FastifyInstance } from 'fastify';
import { outcomeRoutes } from './outcomes.js';
import { experimentRoutes } from './experiments.js';
import { gateRoutes } from './gates.js';
import { signalRoutes } from './signals.js';
import { llmProviderRoutes } from './llm-providers.js';
import { learningRoutes } from './learnings.js';
import { workspaceRoutes } from './workspace.js';

export async function registerRoutes(app: FastifyInstance) {
  await app.register(outcomeRoutes);
  await app.register(experimentRoutes);
  await app.register(gateRoutes);
  await app.register(signalRoutes);
  await app.register(llmProviderRoutes);
  await app.register(learningRoutes);
  await app.register(workspaceRoutes);
}
