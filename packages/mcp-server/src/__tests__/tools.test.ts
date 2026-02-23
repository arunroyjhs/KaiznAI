import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  getActiveOutcomesTool,
  getActiveOutcomesInputSchema,
  getExperimentBriefTool,
  getExperimentBriefInputSchema,
  reportExperimentBuiltTool,
  reportExperimentBuiltInputSchema,
  queryLearningsTool,
  queryLearningsInputSchema,
  requestHumanGateTool,
  requestHumanGateInputSchema,
} from '../tools/index.js';

import { handleGetExperimentBrief } from '../tools/get-experiment-brief.js';
import { handleReportExperimentBuilt } from '../tools/report-experiment-built.js';
import { handleQueryLearnings } from '../tools/query-learnings.js';
import { handleRequestHumanGate } from '../tools/request-human-gate.js';

// ─── Mock global.fetch ──────────────────────────────────────────────────────
const mockFetch = vi.fn();

beforeEach(() => {
  vi.stubGlobal('fetch', mockFetch);
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ═══════════════════════════════════════════════════════════════════════════
// Tool Definition Tests
// ═══════════════════════════════════════════════════════════════════════════

describe('Tool Definitions', () => {
  const allTools = [
    getActiveOutcomesTool,
    getExperimentBriefTool,
    reportExperimentBuiltTool,
    queryLearningsTool,
    requestHumanGateTool,
  ];

  it('exports exactly 5 tools', () => {
    expect(allTools).toHaveLength(5);
  });

  it('all tools have unique names', () => {
    const names = allTools.map((t) => t.name);
    expect(new Set(names).size).toBe(5);
  });

  it('all tools have non-empty descriptions', () => {
    for (const tool of allTools) {
      expect(tool.description).toBeTruthy();
      expect(typeof tool.description).toBe('string');
    }
  });

  it('all tools have object-type input schemas', () => {
    for (const tool of allTools) {
      expect(tool.inputSchema.type).toBe('object');
    }
  });

  describe('get_active_outcomes tool', () => {
    it('has the correct name', () => {
      expect(getActiveOutcomesTool.name).toBe('get_active_outcomes');
    });

    it('has workspace_id as an optional property', () => {
      expect(getActiveOutcomesTool.inputSchema.properties.workspace_id).toBeDefined();
      expect(getActiveOutcomesTool.inputSchema.properties.workspace_id.type).toBe('string');
    });

    it('does not list any required fields', () => {
      expect(getActiveOutcomesTool.inputSchema).not.toHaveProperty('required');
    });
  });

  describe('get_experiment_brief tool', () => {
    it('has the correct name', () => {
      expect(getExperimentBriefTool.name).toBe('get_experiment_brief');
    });

    it('requires experiment_id', () => {
      expect(getExperimentBriefTool.inputSchema.required).toContain('experiment_id');
    });

    it('defines experiment_id as a string property', () => {
      expect(getExperimentBriefTool.inputSchema.properties.experiment_id.type).toBe('string');
    });
  });

  describe('report_experiment_built tool', () => {
    it('has the correct name', () => {
      expect(reportExperimentBuiltTool.name).toBe('report_experiment_built');
    });

    it('requires experiment_id, implementation_summary, and files_changed', () => {
      const required = reportExperimentBuiltTool.inputSchema.required;
      expect(required).toContain('experiment_id');
      expect(required).toContain('implementation_summary');
      expect(required).toContain('files_changed');
    });

    it('defines files_changed as an array of strings', () => {
      const prop = reportExperimentBuiltTool.inputSchema.properties.files_changed;
      expect(prop.type).toBe('array');
      expect(prop.items).toEqual({ type: 'string' });
    });

    it('has optional feature_flag_key and agent_notes properties', () => {
      expect(reportExperimentBuiltTool.inputSchema.properties.feature_flag_key).toBeDefined();
      expect(reportExperimentBuiltTool.inputSchema.properties.agent_notes).toBeDefined();
    });
  });

  describe('query_learnings tool', () => {
    it('has the correct name', () => {
      expect(queryLearningsTool.name).toBe('query_learnings');
    });

    it('defines query and limit properties', () => {
      expect(queryLearningsTool.inputSchema.properties.query).toBeDefined();
      expect(queryLearningsTool.inputSchema.properties.limit).toBeDefined();
    });

    it('defines limit as number type', () => {
      expect(queryLearningsTool.inputSchema.properties.limit.type).toBe('number');
    });
  });

  describe('request_human_gate tool', () => {
    it('has the correct name', () => {
      expect(requestHumanGateTool.name).toBe('request_human_gate');
    });

    it('requires experiment_id, gate_type, and question', () => {
      const required = requestHumanGateTool.inputSchema.required;
      expect(required).toContain('experiment_id');
      expect(required).toContain('gate_type');
      expect(required).toContain('question');
    });

    it('defines context as an object property', () => {
      expect(requestHumanGateTool.inputSchema.properties.context.type).toBe('object');
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Input Schema Validation Tests
// ═══════════════════════════════════════════════════════════════════════════

describe('Input Schema Validation', () => {
  describe('getActiveOutcomesInputSchema', () => {
    it('accepts empty object', () => {
      const result = getActiveOutcomesInputSchema.safeParse({});
      expect(result.success).toBe(true);
    });

    it('accepts valid workspace_id', () => {
      const result = getActiveOutcomesInputSchema.safeParse({ workspace_id: 'ws-1' });
      expect(result.success).toBe(true);
    });

    it('rejects numeric workspace_id', () => {
      const result = getActiveOutcomesInputSchema.safeParse({ workspace_id: 42 });
      expect(result.success).toBe(false);
    });
  });

  describe('getExperimentBriefInputSchema', () => {
    it('accepts valid experiment_id', () => {
      const result = getExperimentBriefInputSchema.safeParse({ experiment_id: 'exp-123' });
      expect(result.success).toBe(true);
    });

    it('rejects missing experiment_id', () => {
      const result = getExperimentBriefInputSchema.safeParse({});
      expect(result.success).toBe(false);
    });

    it('rejects numeric experiment_id', () => {
      const result = getExperimentBriefInputSchema.safeParse({ experiment_id: 123 });
      expect(result.success).toBe(false);
    });
  });

  describe('reportExperimentBuiltInputSchema', () => {
    const validInput = {
      experiment_id: 'exp-1',
      implementation_summary: 'Built the feature',
      files_changed: ['src/index.ts'],
    };

    it('accepts valid input with required fields', () => {
      const result = reportExperimentBuiltInputSchema.safeParse(validInput);
      expect(result.success).toBe(true);
    });

    it('accepts valid input with optional fields', () => {
      const result = reportExperimentBuiltInputSchema.safeParse({
        ...validInput,
        feature_flag_key: 'flag-1',
        agent_notes: 'Some notes',
      });
      expect(result.success).toBe(true);
    });

    it('rejects missing experiment_id', () => {
      const { experiment_id, ...rest } = validInput;
      const result = reportExperimentBuiltInputSchema.safeParse(rest);
      expect(result.success).toBe(false);
    });

    it('rejects missing implementation_summary', () => {
      const { implementation_summary, ...rest } = validInput;
      const result = reportExperimentBuiltInputSchema.safeParse(rest);
      expect(result.success).toBe(false);
    });

    it('rejects missing files_changed', () => {
      const { files_changed, ...rest } = validInput;
      const result = reportExperimentBuiltInputSchema.safeParse(rest);
      expect(result.success).toBe(false);
    });

    it('rejects non-array files_changed', () => {
      const result = reportExperimentBuiltInputSchema.safeParse({
        ...validInput,
        files_changed: 'single-file.ts',
      });
      expect(result.success).toBe(false);
    });

    it('accepts empty files_changed array', () => {
      const result = reportExperimentBuiltInputSchema.safeParse({
        ...validInput,
        files_changed: [],
      });
      expect(result.success).toBe(true);
    });
  });

  describe('queryLearningsInputSchema', () => {
    it('accepts empty object (query is optional)', () => {
      const result = queryLearningsInputSchema.safeParse({});
      expect(result.success).toBe(true);
    });

    it('defaults limit to 10 when not provided', () => {
      const result = queryLearningsInputSchema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.limit).toBe(10);
      }
    });

    it('accepts valid query and limit', () => {
      const result = queryLearningsInputSchema.safeParse({ query: 'conversion', limit: 5 });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.query).toBe('conversion');
        expect(result.data.limit).toBe(5);
      }
    });

    it('rejects non-number limit', () => {
      const result = queryLearningsInputSchema.safeParse({ query: 'test', limit: 'ten' });
      expect(result.success).toBe(false);
    });
  });

  describe('requestHumanGateInputSchema', () => {
    const validInput = {
      experiment_id: 'exp-1',
      gate_type: 'portfolio_review' as const,
      question: 'Should we proceed?',
    };

    it('accepts valid input with required fields', () => {
      const result = requestHumanGateInputSchema.safeParse(validInput);
      expect(result.success).toBe(true);
    });

    it('accepts valid input with context', () => {
      const result = requestHumanGateInputSchema.safeParse({
        ...validInput,
        context: { risk: 'low', impact: 'high' },
      });
      expect(result.success).toBe(true);
    });

    it('accepts all valid gate_type values', () => {
      const validGateTypes = [
        'portfolio_review',
        'launch_approval',
        'analysis_review',
        'scale_approval',
        'ship_approval',
      ];

      for (const gateType of validGateTypes) {
        const result = requestHumanGateInputSchema.safeParse({
          ...validInput,
          gate_type: gateType,
        });
        expect(result.success).toBe(true);
      }
    });

    it('rejects invalid gate_type', () => {
      const result = requestHumanGateInputSchema.safeParse({
        ...validInput,
        gate_type: 'invalid_type',
      });
      expect(result.success).toBe(false);
    });

    it('rejects missing experiment_id', () => {
      const { experiment_id, ...rest } = validInput;
      const result = requestHumanGateInputSchema.safeParse(rest);
      expect(result.success).toBe(false);
    });

    it('rejects missing gate_type', () => {
      const { gate_type, ...rest } = validInput;
      const result = requestHumanGateInputSchema.safeParse(rest);
      expect(result.success).toBe(false);
    });

    it('rejects missing question', () => {
      const { question, ...rest } = validInput;
      const result = requestHumanGateInputSchema.safeParse(rest);
      expect(result.success).toBe(false);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Handler Function Tests
// ═══════════════════════════════════════════════════════════════════════════

describe('Handler Functions', () => {
  const apiBaseUrl = 'http://localhost:3001';
  const apiKey = 'test-key';

  describe('handleGetExperimentBrief', () => {
    it('constructs the correct URL with experiment_id', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ brief: {} }),
      });

      await handleGetExperimentBrief({ experiment_id: 'exp-abc' }, apiBaseUrl, apiKey);

      const calledUrl = mockFetch.mock.calls[0][0];
      expect(calledUrl).toContain('/api/v1/experiments/exp-abc/brief');
    });

    it('sends proper authorization header', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      });

      await handleGetExperimentBrief({ experiment_id: 'exp-1' }, apiBaseUrl, apiKey);

      const fetchOptions = mockFetch.mock.calls[0][1];
      expect(fetchOptions.headers.Authorization).toBe('Bearer test-key');
    });

    it('returns JSON stringified response', async () => {
      const mockData = { brief: { hypothesis: 'test' } };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockData,
      });

      const result = await handleGetExperimentBrief({ experiment_id: 'exp-1' }, apiBaseUrl, apiKey);
      expect(result).toBe(JSON.stringify(mockData, null, 2));
    });

    it('throws on non-ok response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        statusText: 'Not Found',
      });

      await expect(
        handleGetExperimentBrief({ experiment_id: 'exp-missing' }, apiBaseUrl, apiKey),
      ).rejects.toThrow('Failed to fetch experiment brief: Not Found');
    });
  });

  describe('handleReportExperimentBuilt', () => {
    const validInput = {
      experiment_id: 'exp-1',
      implementation_summary: 'Built the feature',
      files_changed: ['src/index.ts', 'src/utils.ts'],
    };

    it('sends a POST request to the correct URL', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: 'awaiting_launch_gate' }),
      });

      await handleReportExperimentBuilt(validInput, apiBaseUrl, apiKey);

      const calledUrl = mockFetch.mock.calls[0][0];
      const fetchOptions = mockFetch.mock.calls[0][1];
      expect(calledUrl).toContain('/api/v1/experiments/exp-1/built');
      expect(fetchOptions.method).toBe('POST');
    });

    it('sends the correct JSON body', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      });

      await handleReportExperimentBuilt(validInput, apiBaseUrl, apiKey);

      const fetchOptions = mockFetch.mock.calls[0][1];
      const body = JSON.parse(fetchOptions.body);
      expect(body.implementation_summary).toBe('Built the feature');
      expect(body.files_changed).toEqual(['src/index.ts', 'src/utils.ts']);
    });

    it('includes optional fields when provided', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      });

      await handleReportExperimentBuilt(
        { ...validInput, feature_flag_key: 'my-flag', agent_notes: 'Note' },
        apiBaseUrl,
        apiKey,
      );

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.feature_flag_key).toBe('my-flag');
      expect(body.agent_notes).toBe('Note');
    });

    it('throws on non-ok response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        statusText: 'Bad Request',
      });

      await expect(
        handleReportExperimentBuilt(validInput, apiBaseUrl, apiKey),
      ).rejects.toThrow('Failed to report build: Bad Request');
    });
  });

  describe('handleQueryLearnings', () => {
    it('constructs URL with query param when provided', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [] }),
      });

      await handleQueryLearnings({ query: 'conversion rate', limit: 10 }, apiBaseUrl, apiKey);

      const calledUrl = mockFetch.mock.calls[0][0];
      expect(calledUrl).toContain('/api/v1/learnings');
      expect(calledUrl).toContain('q=conversion');
      expect(calledUrl).toContain('limit=10');
    });

    it('omits query param when query is undefined', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [] }),
      });

      await handleQueryLearnings({ limit: 5 }, apiBaseUrl, apiKey);

      const calledUrl = mockFetch.mock.calls[0][0];
      expect(calledUrl).not.toContain('q=');
      expect(calledUrl).toContain('limit=5');
    });

    it('sets custom limit in URL', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [] }),
      });

      await handleQueryLearnings({ query: 'test', limit: 25 }, apiBaseUrl, apiKey);

      const calledUrl = mockFetch.mock.calls[0][0];
      expect(calledUrl).toContain('limit=25');
    });

    it('throws on non-ok response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        statusText: 'Service Unavailable',
      });

      await expect(
        handleQueryLearnings({ limit: 10 }, apiBaseUrl, apiKey),
      ).rejects.toThrow('Failed to query learnings: Service Unavailable');
    });
  });

  describe('handleRequestHumanGate', () => {
    const validInput = {
      experiment_id: 'exp-1',
      gate_type: 'launch_approval' as const,
      question: 'Ready to launch?',
    };

    it('sends a POST request to /api/v1/gates', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 'gate-1' }),
      });

      await handleRequestHumanGate(validInput, apiBaseUrl, apiKey);

      const calledUrl = mockFetch.mock.calls[0][0];
      const fetchOptions = mockFetch.mock.calls[0][1];
      expect(calledUrl).toContain('/api/v1/gates');
      expect(fetchOptions.method).toBe('POST');
    });

    it('sends the correct JSON body with default empty context', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      });

      await handleRequestHumanGate(validInput, apiBaseUrl, apiKey);

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.experiment_id).toBe('exp-1');
      expect(body.gate_type).toBe('launch_approval');
      expect(body.question).toBe('Ready to launch?');
      expect(body.context).toEqual({});
    });

    it('includes context when provided', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      });

      await handleRequestHumanGate(
        { ...validInput, context: { risk: 'low' } },
        apiBaseUrl,
        apiKey,
      );

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.context).toEqual({ risk: 'low' });
    });

    it('throws on non-ok response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        statusText: 'Forbidden',
      });

      await expect(
        handleRequestHumanGate(validInput, apiBaseUrl, apiKey),
      ).rejects.toThrow('Failed to create gate: Forbidden');
    });
  });
});
