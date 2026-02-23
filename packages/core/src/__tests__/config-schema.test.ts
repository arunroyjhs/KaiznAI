import { describe, it, expect } from 'vitest';
import { outcomeYamlSchema } from '../config/schema.js';

function validOutcomeData() {
  return {
    version: 1,
    outcomes: [
      {
        id: 'test-outcome',
        title: 'Test Outcome',
        signal: {
          source: 'amplitude',
          metric: 'conversion_rate',
          method: 'funnel' as const,
        },
        target: {
          direction: 'increase' as const,
          to: 0.15,
        },
        horizon: '30d',
      },
    ],
  };
}

describe('outcomeYamlSchema', () => {
  describe('valid data', () => {
    it('should accept minimal valid configuration', () => {
      const result = outcomeYamlSchema.safeParse(validOutcomeData());
      expect(result.success).toBe(true);
    });

    it('should return parsed data on success', () => {
      const result = outcomeYamlSchema.safeParse(validOutcomeData());
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.version).toBe(1);
        expect(result.data.outcomes).toHaveLength(1);
        expect(result.data.outcomes[0].id).toBe('test-outcome');
      }
    });

    it('should accept full configuration with all optional fields', () => {
      const data = {
        version: 1,
        outcomes: [
          {
            id: 'full-outcome',
            title: 'Full Outcome',
            description: 'A full outcome with all fields',
            signal: {
              source: 'mixpanel',
              metric: 'retention',
              method: 'event' as const,
              funnel_steps: ['step1', 'step2', 'step3'],
              segment: { country: 'US', plan: 'pro' },
              aggregation: '7d_rolling' as const,
            },
            target: {
              direction: 'decrease' as const,
              from: 0.1,
              to: 0.05,
              confidence_required: 0.99,
            },
            constraints: [
              { signal: 'error_rate', max: 0.01 },
              { rule: 'no_regression_in_latency' },
            ],
            horizon: '90d',
            portfolio: { max_concurrent: 5 },
            gates: {
              portfolio_review: { assigned_to: 'pm-team', sla: '48h' },
              launch_approval: { assigned_to: 'eng-lead', sla: '24h', channel: '#launches' },
              analysis_review: { assigned_to: 'data-team', sla: '72h' },
              scale_approval: { assigned_to: 'vp-eng', sla: '96h' },
              ship_approval: { assigned_to: 'cto', sla: '24h' },
            },
            scope: {
              allowed_paths: ['src/feature-a', 'src/feature-b'],
              forbidden_paths: ['src/legacy'],
            },
            llm_provider: 'anthropic',
          },
        ],
        llm: {
          default_provider: 'anthropic',
          hypothesis_model: 'claude-3-opus',
          analysis_model: 'claude-3-sonnet',
        },
        signal_connectors: [
          {
            name: 'amplitude',
            type: 'amplitude',
            config: { api_key: 'test-key', project_id: '12345' },
          },
        ],
        feature_flags: {
          provider: 'launchdarkly',
          config: { sdk_key: 'test-sdk-key' },
        },
        notifications: {
          slack: {
            bot_token: 'xoxb-test',
            default_channel: '#experiments',
          },
          email: {
            smtp_host: 'smtp.example.com',
            smtp_port: 587,
            from: 'experiments@example.com',
          },
        },
      };
      const result = outcomeYamlSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('should accept multiple outcomes', () => {
      const data = {
        version: 1,
        outcomes: [
          {
            id: 'outcome-a',
            title: 'Outcome A',
            signal: { source: 's', metric: 'm', method: 'event' as const },
            target: { direction: 'increase' as const, to: 10 },
            horizon: '7d',
          },
          {
            id: 'outcome-b',
            title: 'Outcome B',
            signal: { source: 's', metric: 'm', method: 'custom' as const },
            target: { direction: 'decrease' as const, to: 5 },
            horizon: '14d',
          },
        ],
      };
      const result = outcomeYamlSchema.safeParse(data);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.outcomes).toHaveLength(2);
      }
    });
  });

  describe('defaults', () => {
    it('should default version to 1', () => {
      const data = {
        outcomes: [
          {
            id: 'test',
            title: 'Test',
            signal: { source: 's', metric: 'm', method: 'event' as const },
            target: { direction: 'increase' as const, to: 10 },
            horizon: '7d',
          },
        ],
      };
      const result = outcomeYamlSchema.safeParse(data);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.version).toBe(1);
      }
    });

    it('should default confidence_required to 0.95', () => {
      const result = outcomeYamlSchema.safeParse(validOutcomeData());
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.outcomes[0].target.confidence_required).toBe(0.95);
      }
    });

    it('should default aggregation to point', () => {
      const result = outcomeYamlSchema.safeParse(validOutcomeData());
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.outcomes[0].signal.aggregation).toBe('point');
      }
    });

    it('should default constraints to empty array', () => {
      const result = outcomeYamlSchema.safeParse(validOutcomeData());
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.outcomes[0].constraints).toEqual([]);
      }
    });

    it('should default signal_connectors to empty array', () => {
      const result = outcomeYamlSchema.safeParse(validOutcomeData());
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.signal_connectors).toEqual([]);
      }
    });

    it('should default portfolio max_concurrent to 3', () => {
      const result = outcomeYamlSchema.safeParse(validOutcomeData());
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.outcomes[0].portfolio.max_concurrent).toBe(3);
      }
    });

    it('should default scope allowed_paths and forbidden_paths to empty arrays', () => {
      const result = outcomeYamlSchema.safeParse(validOutcomeData());
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.outcomes[0].scope.allowed_paths).toEqual([]);
        expect(result.data.outcomes[0].scope.forbidden_paths).toEqual([]);
      }
    });

    it('should default gates to empty object', () => {
      const result = outcomeYamlSchema.safeParse(validOutcomeData());
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.outcomes[0].gates).toEqual({});
      }
    });
  });

  describe('outcome id validation', () => {
    it('should accept lowercase alphanumeric id with hyphens', () => {
      const data = validOutcomeData();
      data.outcomes[0].id = 'valid-outcome-id-123';
      const result = outcomeYamlSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('should reject id with uppercase letters', () => {
      const data = validOutcomeData();
      data.outcomes[0].id = 'Invalid-ID';
      const result = outcomeYamlSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('should reject id with underscores', () => {
      const data = validOutcomeData();
      data.outcomes[0].id = 'invalid_id';
      const result = outcomeYamlSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('should reject id with spaces', () => {
      const data = validOutcomeData();
      data.outcomes[0].id = 'invalid id';
      const result = outcomeYamlSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('should reject id with special characters', () => {
      const data = validOutcomeData();
      data.outcomes[0].id = 'invalid@id!';
      const result = outcomeYamlSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('should accept single character id', () => {
      const data = validOutcomeData();
      data.outcomes[0].id = 'a';
      const result = outcomeYamlSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('should accept numeric-only id', () => {
      const data = validOutcomeData();
      data.outcomes[0].id = '123';
      const result = outcomeYamlSchema.safeParse(data);
      expect(result.success).toBe(true);
    });
  });

  describe('signal validation', () => {
    it('should accept method funnel', () => {
      const data = validOutcomeData();
      data.outcomes[0].signal.method = 'funnel';
      const result = outcomeYamlSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('should accept method event', () => {
      const data = validOutcomeData();
      data.outcomes[0].signal.method = 'event';
      const result = outcomeYamlSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('should accept method custom', () => {
      const data = validOutcomeData();
      data.outcomes[0].signal.method = 'custom';
      const result = outcomeYamlSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('should reject invalid method', () => {
      const data = validOutcomeData();
      (data.outcomes[0].signal as any).method = 'invalid';
      const result = outcomeYamlSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('should require source', () => {
      const data = validOutcomeData();
      delete (data.outcomes[0].signal as any).source;
      const result = outcomeYamlSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('should require metric', () => {
      const data = validOutcomeData();
      delete (data.outcomes[0].signal as any).metric;
      const result = outcomeYamlSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('should accept valid aggregation values', () => {
      for (const agg of ['point', '7d_rolling', '30d_rolling']) {
        const data = validOutcomeData();
        (data.outcomes[0].signal as any).aggregation = agg;
        const result = outcomeYamlSchema.safeParse(data);
        expect(result.success).toBe(true);
      }
    });

    it('should reject invalid aggregation', () => {
      const data = validOutcomeData();
      (data.outcomes[0].signal as any).aggregation = 'daily';
      const result = outcomeYamlSchema.safeParse(data);
      expect(result.success).toBe(false);
    });
  });

  describe('target validation', () => {
    it('should accept direction increase', () => {
      const data = validOutcomeData();
      data.outcomes[0].target.direction = 'increase';
      const result = outcomeYamlSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('should accept direction decrease', () => {
      const data = validOutcomeData();
      data.outcomes[0].target.direction = 'decrease';
      const result = outcomeYamlSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('should reject invalid direction', () => {
      const data = validOutcomeData();
      (data.outcomes[0].target as any).direction = 'sideways';
      const result = outcomeYamlSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('should require to value', () => {
      const data = validOutcomeData();
      delete (data.outcomes[0].target as any).to;
      const result = outcomeYamlSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('should accept optional from value', () => {
      const data = validOutcomeData();
      (data.outcomes[0].target as any).from = 0.1;
      const result = outcomeYamlSchema.safeParse(data);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.outcomes[0].target.from).toBe(0.1);
      }
    });

    it('should reject confidence_required greater than 1', () => {
      const data = validOutcomeData();
      (data.outcomes[0].target as any).confidence_required = 1.5;
      const result = outcomeYamlSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('should reject confidence_required less than 0', () => {
      const data = validOutcomeData();
      (data.outcomes[0].target as any).confidence_required = -0.1;
      const result = outcomeYamlSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('should accept confidence_required of exactly 0', () => {
      const data = validOutcomeData();
      (data.outcomes[0].target as any).confidence_required = 0;
      const result = outcomeYamlSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('should accept confidence_required of exactly 1', () => {
      const data = validOutcomeData();
      (data.outcomes[0].target as any).confidence_required = 1;
      const result = outcomeYamlSchema.safeParse(data);
      expect(result.success).toBe(true);
    });
  });

  describe('constraint validation', () => {
    it('should accept constraint with signal and max', () => {
      const data = validOutcomeData();
      (data as any).outcomes[0].constraints = [{ signal: 'error_rate', max: 0.01 }];
      const result = outcomeYamlSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('should accept constraint with signal and min', () => {
      const data = validOutcomeData();
      (data as any).outcomes[0].constraints = [{ signal: 'uptime', min: 0.99 }];
      const result = outcomeYamlSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('should accept constraint with rule', () => {
      const data = validOutcomeData();
      (data as any).outcomes[0].constraints = [{ rule: 'no_regression' }];
      const result = outcomeYamlSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('should reject constraint with neither signal nor rule', () => {
      const data = validOutcomeData();
      (data as any).outcomes[0].constraints = [{ max: 0.01 }];
      const result = outcomeYamlSchema.safeParse(data);
      expect(result.success).toBe(false);
    });
  });

  describe('outcomes array validation', () => {
    it('should require at least one outcome', () => {
      const data = { version: 1, outcomes: [] };
      const result = outcomeYamlSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('should require outcomes to be an array', () => {
      const data = { version: 1, outcomes: 'not-an-array' };
      const result = outcomeYamlSchema.safeParse(data);
      expect(result.success).toBe(false);
    });
  });

  describe('title validation', () => {
    it('should require non-empty title', () => {
      const data = validOutcomeData();
      data.outcomes[0].title = '';
      const result = outcomeYamlSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('should accept any non-empty string title', () => {
      const data = validOutcomeData();
      data.outcomes[0].title = 'A';
      const result = outcomeYamlSchema.safeParse(data);
      expect(result.success).toBe(true);
    });
  });

  describe('portfolio validation', () => {
    it('should reject max_concurrent less than 1', () => {
      const data = validOutcomeData();
      (data as any).outcomes[0].portfolio = { max_concurrent: 0 };
      const result = outcomeYamlSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('should reject non-integer max_concurrent', () => {
      const data = validOutcomeData();
      (data as any).outcomes[0].portfolio = { max_concurrent: 2.5 };
      const result = outcomeYamlSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('should accept valid max_concurrent', () => {
      const data = validOutcomeData();
      (data as any).outcomes[0].portfolio = { max_concurrent: 10 };
      const result = outcomeYamlSchema.safeParse(data);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.outcomes[0].portfolio.max_concurrent).toBe(10);
      }
    });
  });

  describe('gate config validation', () => {
    it('should require assigned_to in gate config', () => {
      const data = validOutcomeData();
      (data as any).outcomes[0].gates = {
        portfolio_review: { sla: '24h' },
      };
      const result = outcomeYamlSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('should require sla in gate config', () => {
      const data = validOutcomeData();
      (data as any).outcomes[0].gates = {
        portfolio_review: { assigned_to: 'pm' },
      };
      const result = outcomeYamlSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('should accept gate config with optional channel', () => {
      const data = validOutcomeData();
      (data as any).outcomes[0].gates = {
        portfolio_review: {
          assigned_to: 'pm',
          sla: '48h',
          channel: '#reviews',
        },
      };
      const result = outcomeYamlSchema.safeParse(data);
      expect(result.success).toBe(true);
    });
  });

  describe('error reporting', () => {
    it('should report issues with path information', () => {
      const data = {
        version: 1,
        outcomes: [
          {
            id: 'INVALID',
            title: '',
            signal: { source: 's', metric: 'm', method: 'bad' },
            target: { direction: 'up', to: 'not-a-number' },
            horizon: '30d',
          },
        ],
      };
      const result = outcomeYamlSchema.safeParse(data);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.length).toBeGreaterThan(0);
        // Each issue should have a path
        for (const issue of result.error.issues) {
          expect(issue.path).toBeDefined();
        }
      }
    });
  });
});
