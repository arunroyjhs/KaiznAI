import Fastify from 'fastify';
import cors from '@fastify/cors';
import { registerRoutes } from './routes/index.js';

const app = Fastify({ logger: true });

await app.register(cors, { origin: true });

// Health check
app.get('/health', async () => ({
  status: 'ok',
  service: 'outcome-runtime-api',
  timestamp: new Date().toISOString(),
}));

// Register all API routes
await registerRoutes(app);

const port = parseInt(process.env.PORT ?? '3001', 10);
const host = process.env.HOST ?? '0.0.0.0';

try {
  await app.listen({ port, host });
  app.log.info(`Outcome Runtime API running at http://${host}:${port}`);
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
