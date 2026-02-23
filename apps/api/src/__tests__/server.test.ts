import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import Fastify, { type FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import { registerRoutes } from '../routes/index.js';

// ─── Test App Builder ───────────────────────────────────────────────────────
async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({ logger: false });
  await app.register(cors, { origin: true });

  // Health check (mirrors server.ts)
  app.get('/health', async () => ({
    status: 'ok',
    service: 'outcome-runtime-api',
    timestamp: new Date().toISOString(),
  }));

  await registerRoutes(app);
  await app.ready();
  return app;
}

// ═══════════════════════════════════════════════════════════════════════════
// API Server Tests
// ═══════════════════════════════════════════════════════════════════════════

describe('API Server', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp();
  });

  afterAll(async () => {
    await app.close();
  });

  // ─── Health Check ───────────────────────────────────────────────────────
  describe('GET /health', () => {
    it('returns 200 with status ok', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/health',
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.status).toBe('ok');
      expect(body.service).toBe('outcome-runtime-api');
      expect(body.timestamp).toBeDefined();
    });

    it('returns a valid ISO timestamp', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/health',
      });

      const body = response.json();
      const parsed = new Date(body.timestamp);
      expect(parsed.toISOString()).toBe(body.timestamp);
    });
  });

  // ─── Outcomes ─────────────────────────────────────────────────────────
  describe('GET /api/v1/outcomes', () => {
    it('returns 200 with data array and pagination', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/outcomes',
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.data).toEqual([]);
      expect(body.pagination).toBeDefined();
      expect(body.pagination.page).toBe(1);
      expect(body.pagination.limit).toBe(20);
      expect(body.pagination.total).toBe(0);
    });

    it('respects page and limit query parameters', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/outcomes?page=2&limit=10',
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.pagination.page).toBe(2);
      expect(body.pagination.limit).toBe(10);
    });
  });

  describe('POST /api/v1/outcomes', () => {
    const validOutcome = {
      slug: 'test-outcome',
      title: 'Test Outcome',
      primarySignal: {
        source: 'postgres',
        metric: 'conversion_rate',
        method: 'event',
      },
      target: {
        direction: 'increase',
        to: 0.1,
      },
      horizon: '4w',
      owner: 'test@test.com',
      orgId: '550e8400-e29b-41d4-a716-446655440000',
    };

    it('returns 201 with valid outcome data', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/outcomes',
        payload: validOutcome,
      });

      expect(response.statusCode).toBe(201);
      const body = response.json();
      expect(body.id).toBeDefined();
      expect(body.slug).toBe('test-outcome');
      expect(body.title).toBe('Test Outcome');
      expect(body.status).toBe('draft');
      expect(body.createdAt).toBeDefined();
      expect(body.updatedAt).toBeDefined();
    });

    it('returns 400 with invalid body (missing required fields)', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/outcomes',
        payload: { slug: 'test' },
      });

      expect(response.statusCode).toBe(400);
      const body = response.json();
      expect(body.error).toBe('VALIDATION_ERROR');
      expect(body.message).toBeDefined();
      expect(body.details).toBeDefined();
    });

    it('returns 400 with invalid slug format', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/outcomes',
        payload: { ...validOutcome, slug: 'Invalid Slug!' },
      });

      expect(response.statusCode).toBe(400);
    });

    it('returns 400 with empty title', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/outcomes',
        payload: { ...validOutcome, title: '' },
      });

      expect(response.statusCode).toBe(400);
    });

    it('returns 400 with invalid orgId (non-UUID)', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/outcomes',
        payload: { ...validOutcome, orgId: 'not-a-uuid' },
      });

      expect(response.statusCode).toBe(400);
    });

    it('returns 400 with invalid method value', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/outcomes',
        payload: {
          ...validOutcome,
          primarySignal: { ...validOutcome.primarySignal, method: 'invalid' },
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it('returns 400 with invalid direction value', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/outcomes',
        payload: {
          ...validOutcome,
          target: { ...validOutcome.target, direction: 'sideways' },
        },
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('GET /api/v1/outcomes/:id', () => {
    it('returns 200 with outcome detail', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/outcomes/test-id-123',
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.id).toBe('test-id-123');
    });
  });

  describe('POST /api/v1/outcomes/:id/activate', () => {
    it('returns 200 with activation confirmation', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/outcomes/outcome-1/activate',
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.id).toBe('outcome-1');
      expect(body.status).toBe('active');
      expect(body.message).toContain('activated');
    });
  });

  describe('GET /api/v1/outcomes/:id/experiments', () => {
    it('returns 200 with experiments list', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/outcomes/outcome-1/experiments',
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.outcomeId).toBe('outcome-1');
      expect(body.data).toEqual([]);
    });
  });

  describe('GET /api/v1/outcomes/:id/signals', () => {
    it('returns 200 with signals data', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/outcomes/outcome-1/signals',
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.outcomeId).toBe('outcome-1');
      expect(body.data).toEqual([]);
    });
  });

  // ─── Experiments ──────────────────────────────────────────────────────
  describe('GET /api/v1/experiments/:id', () => {
    it('returns 200 with experiment detail', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/experiments/exp-123',
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.id).toBe('exp-123');
    });
  });

  describe('GET /api/v1/experiments/:id/brief', () => {
    it('returns 200 with experiment brief', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/experiments/exp-123/brief',
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.id).toBe('exp-123');
      expect(body.brief).toBeDefined();
      expect(body.brief.experiment_id).toBe('exp-123');
    });
  });

  describe('POST /api/v1/experiments/:id/built', () => {
    const validBuiltBody = {
      implementation_summary: 'Built the feature',
      files_changed: ['src/index.ts'],
    };

    it('returns 200 with valid built report', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/experiments/exp-123/built',
        payload: validBuiltBody,
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.id).toBe('exp-123');
      expect(body.status).toBe('awaiting_launch_gate');
      expect(body.message).toContain('Build reported');
    });

    it('returns 400 with missing implementation_summary', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/experiments/exp-123/built',
        payload: { files_changed: ['src/index.ts'] },
      });

      expect(response.statusCode).toBe(400);
      const body = response.json();
      expect(body.error).toBe('VALIDATION_ERROR');
    });

    it('returns 400 with empty implementation_summary', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/experiments/exp-123/built',
        payload: { implementation_summary: '', files_changed: [] },
      });

      expect(response.statusCode).toBe(400);
    });

    it('returns 400 with missing files_changed', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/experiments/exp-123/built',
        payload: { implementation_summary: 'test' },
      });

      expect(response.statusCode).toBe(400);
    });

    it('accepts optional feature_flag_key and agent_notes', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/experiments/exp-123/built',
        payload: {
          ...validBuiltBody,
          feature_flag_key: 'my-flag',
          agent_notes: 'Some notes',
        },
      });

      expect(response.statusCode).toBe(200);
    });
  });

  // ─── Gates ────────────────────────────────────────────────────────────
  describe('GET /api/v1/gates/pending', () => {
    it('returns 200 with pending gates list', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/gates/pending',
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.data).toEqual([]);
    });
  });

  describe('GET /api/v1/gates/:id', () => {
    it('returns 200 with gate detail', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/gates/gate-456',
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.id).toBe('gate-456');
    });
  });

  describe('POST /api/v1/gates/:id/respond', () => {
    const validRespondBody = {
      status: 'approved',
      decided_by: 'user@test.com',
    };

    it('returns 200 with valid response (approved)', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/gates/gate-456/respond',
        payload: validRespondBody,
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.id).toBe('gate-456');
      expect(body.status).toBe('approved');
      expect(body.message).toContain('approved');
    });

    it('returns 200 with rejected status', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/gates/gate-456/respond',
        payload: { status: 'rejected', decided_by: 'user@test.com' },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.status).toBe('rejected');
    });

    it('returns 200 with approved_with_conditions status', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/gates/gate-456/respond',
        payload: {
          status: 'approved_with_conditions',
          decided_by: 'admin@test.com',
          conditions: ['Fix error handling'],
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.status).toBe('approved_with_conditions');
    });

    it('returns 400 with invalid status value', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/gates/gate-456/respond',
        payload: { status: 'maybe', decided_by: 'user@test.com' },
      });

      expect(response.statusCode).toBe(400);
      const body = response.json();
      expect(body.error).toBe('VALIDATION_ERROR');
    });

    it('returns 400 with missing decided_by', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/gates/gate-456/respond',
        payload: { status: 'approved' },
      });

      expect(response.statusCode).toBe(400);
    });

    it('returns 400 with empty body', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/gates/gate-456/respond',
        payload: {},
      });

      expect(response.statusCode).toBe(400);
    });
  });

  // ─── Signals ──────────────────────────────────────────────────────────
  describe('POST /api/v1/signals/ingest', () => {
    const validSignal = {
      outcome_id: '550e8400-e29b-41d4-a716-446655440000',
      signal_name: 'conversion',
      value: 0.05,
      source: 'webhook',
    };

    it('returns 201 with valid signal data', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/signals/ingest',
        payload: validSignal,
      });

      expect(response.statusCode).toBe(201);
      const body = response.json();
      expect(body.message).toBe('Signal ingested');
      expect(body.timestamp).toBeDefined();
    });

    it('returns 400 with invalid outcome_id (non-UUID)', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/signals/ingest',
        payload: { ...validSignal, outcome_id: 'not-a-uuid' },
      });

      expect(response.statusCode).toBe(400);
      const body = response.json();
      expect(body.error).toBe('VALIDATION_ERROR');
    });

    it('returns 400 with missing signal_name', async () => {
      const { signal_name, ...rest } = validSignal;
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/signals/ingest',
        payload: rest,
      });

      expect(response.statusCode).toBe(400);
    });

    it('returns 400 with missing value', async () => {
      const { value, ...rest } = validSignal;
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/signals/ingest',
        payload: rest,
      });

      expect(response.statusCode).toBe(400);
    });

    it('returns 400 with missing source', async () => {
      const { source, ...rest } = validSignal;
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/signals/ingest',
        payload: rest,
      });

      expect(response.statusCode).toBe(400);
    });

    it('returns 400 with non-numeric value', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/signals/ingest',
        payload: { ...validSignal, value: 'high' },
      });

      expect(response.statusCode).toBe(400);
    });

    it('returns 400 with empty body', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/signals/ingest',
        payload: {},
      });

      expect(response.statusCode).toBe(400);
    });

    it('accepts optional experiment_id and variant', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/signals/ingest',
        payload: {
          ...validSignal,
          experiment_id: '660e8400-e29b-41d4-a716-446655440000',
          variant: 'treatment',
        },
      });

      expect(response.statusCode).toBe(201);
    });

    it('returns 400 with invalid variant value', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/signals/ingest',
        payload: { ...validSignal, variant: 'invalid_variant' },
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('GET /api/v1/signals/connectors', () => {
    it('returns 200 with connector list', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/signals/connectors',
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.connectors).toBeDefined();
      expect(Array.isArray(body.connectors)).toBe(true);
      expect(body.connectors.length).toBeGreaterThan(0);
    });

    it('includes expected connector types', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/signals/connectors',
      });

      const body = response.json();
      const types = body.connectors.map((c: { type: string }) => c.type);
      expect(types).toContain('mixpanel');
      expect(types).toContain('postgres');
      expect(types).toContain('webhook');
    });

    it('each connector has name, type, and description', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/signals/connectors',
      });

      const body = response.json();
      for (const connector of body.connectors) {
        expect(connector.name).toBeDefined();
        expect(connector.type).toBeDefined();
        expect(connector.description).toBeDefined();
      }
    });
  });

  describe('POST /api/v1/signals/connectors/test', () => {
    const validConnectorTest = {
      type: 'postgres',
      config: { connection_string: 'postgresql://localhost:5432/test' },
    };

    it('returns 200 with valid connector test config', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/signals/connectors/test',
        payload: validConnectorTest,
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.success).toBe(true);
      expect(body.message).toContain('postgres');
    });

    it('returns 400 with missing type', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/signals/connectors/test',
        payload: { config: { key: 'value' } },
      });

      expect(response.statusCode).toBe(400);
    });

    it('returns 400 with missing config', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/signals/connectors/test',
        payload: { type: 'postgres' },
      });

      expect(response.statusCode).toBe(400);
    });

    it('returns 400 with empty body', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/signals/connectors/test',
        payload: {},
      });

      expect(response.statusCode).toBe(400);
    });
  });
});
