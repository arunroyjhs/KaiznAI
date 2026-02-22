import { FastifyInstance } from 'fastify';
import { z } from 'zod';

const testConnectorSchema = z.object({
  type: z.string(),
  config: z.record(z.string()),
});

const ingestSchema = z.object({
  outcome_id: z.string().uuid(),
  experiment_id: z.string().uuid().optional(),
  signal_name: z.string(),
  variant: z.enum(['control', 'treatment']).optional(),
  value: z.number(),
  sample_size: z.number().int().optional(),
  segment: z.record(z.string()).optional(),
  source: z.string(),
});

export async function signalRoutes(app: FastifyInstance) {
  // Webhook for signal ingestion
  app.post('/api/v1/signals/ingest', async (request, reply) => {
    const result = ingestSchema.safeParse(request.body);
    if (!result.success) {
      return reply.status(400).send({
        error: 'VALIDATION_ERROR',
        message: 'Invalid signal data',
        details: result.error.issues,
      });
    }

    // TODO: Store in signal_measurements table
    return reply.status(201).send({
      message: 'Signal ingested',
      timestamp: new Date().toISOString(),
    });
  });

  // List available connectors
  app.get('/api/v1/signals/connectors', async (_request, reply) => {
    return reply.send({
      connectors: [
        { name: 'mixpanel', type: 'mixpanel', description: 'Mixpanel analytics connector' },
        { name: 'postgres', type: 'postgres', description: 'PostgreSQL custom SQL connector' },
        { name: 'amplitude', type: 'amplitude', description: 'Amplitude analytics connector (coming soon)' },
        { name: 'ga4', type: 'ga4', description: 'Google Analytics 4 connector (coming soon)' },
        { name: 'datadog', type: 'datadog', description: 'Datadog metrics connector (coming soon)' },
        { name: 'bigquery', type: 'bigquery', description: 'BigQuery connector (coming soon)' },
        { name: 'webhook', type: 'webhook', description: 'Generic webhook connector' },
      ],
    });
  });

  // Test a connector config
  app.post('/api/v1/signals/connectors/test', async (request, reply) => {
    const result = testConnectorSchema.safeParse(request.body);
    if (!result.success) {
      return reply.status(400).send({
        error: 'VALIDATION_ERROR',
        message: 'Invalid connector config',
        details: result.error.issues,
      });
    }

    // TODO: Instantiate connector and test connection
    return reply.send({
      success: true,
      message: `Connector ${result.data.type} test placeholder`,
    });
  });
}
