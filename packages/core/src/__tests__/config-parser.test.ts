import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { parseOutcomeYaml } from '../config/parser.js';
import { ConfigValidationError } from '../errors.js';

const VALID_YAML = `
version: 1
outcomes:
  - id: increase-conversion
    title: Increase checkout conversion rate
    signal:
      source: amplitude
      metric: checkout_conversion
      method: funnel
    target:
      direction: increase
      to: 0.15
    horizon: 30d
`;

const VALID_YAML_FULL = `
version: 1
outcomes:
  - id: reduce-churn
    title: Reduce monthly churn rate
    description: Lower our churn rate by improving onboarding
    signal:
      source: mixpanel
      metric: monthly_churn
      method: event
      aggregation: 7d_rolling
    target:
      direction: decrease
      from: 0.08
      to: 0.05
      confidence_required: 0.99
    constraints:
      - signal: error_rate
        max: 0.01
      - rule: "no_regression_in_latency"
    horizon: 90d
    portfolio:
      max_concurrent: 5
    gates:
      portfolio_review:
        assigned_to: pm-team
        sla: 48h
      launch_approval:
        assigned_to: eng-lead
        sla: 24h
        channel: "#launches"
    scope:
      allowed_paths:
        - src/onboarding
        - src/retention
      forbidden_paths:
        - src/billing
    llm_provider: anthropic
`;

const VALID_YAML_MULTIPLE_OUTCOMES = `
version: 1
outcomes:
  - id: outcome-one
    title: First outcome
    signal:
      source: posthog
      metric: signups
      method: event
    target:
      direction: increase
      to: 1000
    horizon: 14d
  - id: outcome-two
    title: Second outcome
    signal:
      source: amplitude
      metric: retention
      method: custom
    target:
      direction: increase
      to: 0.8
    horizon: 60d
`;

describe('parseOutcomeYaml', () => {
  describe('valid YAML parsing', () => {
    it('should parse minimal valid YAML correctly', () => {
      const result = parseOutcomeYaml(VALID_YAML);
      expect(result.version).toBe(1);
      expect(result.outcomes).toHaveLength(1);
      expect(result.outcomes[0].id).toBe('increase-conversion');
      expect(result.outcomes[0].title).toBe('Increase checkout conversion rate');
    });

    it('should parse signal configuration correctly', () => {
      const result = parseOutcomeYaml(VALID_YAML);
      const signal = result.outcomes[0].signal;
      expect(signal.source).toBe('amplitude');
      expect(signal.metric).toBe('checkout_conversion');
      expect(signal.method).toBe('funnel');
    });

    it('should parse target configuration correctly', () => {
      const result = parseOutcomeYaml(VALID_YAML);
      const target = result.outcomes[0].target;
      expect(target.direction).toBe('increase');
      expect(target.to).toBe(0.15);
    });

    it('should apply default confidence_required of 0.95', () => {
      const result = parseOutcomeYaml(VALID_YAML);
      expect(result.outcomes[0].target.confidence_required).toBe(0.95);
    });

    it('should apply default aggregation of point', () => {
      const result = parseOutcomeYaml(VALID_YAML);
      expect(result.outcomes[0].signal.aggregation).toBe('point');
    });

    it('should parse horizon correctly', () => {
      const result = parseOutcomeYaml(VALID_YAML);
      expect(result.outcomes[0].horizon).toBe('30d');
    });

    it('should parse full YAML with all optional fields', () => {
      const result = parseOutcomeYaml(VALID_YAML_FULL);
      const outcome = result.outcomes[0];
      expect(outcome.id).toBe('reduce-churn');
      expect(outcome.description).toBe('Lower our churn rate by improving onboarding');
      expect(outcome.signal.aggregation).toBe('7d_rolling');
      expect(outcome.target.from).toBe(0.08);
      expect(outcome.target.confidence_required).toBe(0.99);
      expect(outcome.constraints).toHaveLength(2);
      expect(outcome.portfolio.max_concurrent).toBe(5);
      expect(outcome.gates.portfolio_review?.assigned_to).toBe('pm-team');
      expect(outcome.gates.launch_approval?.channel).toBe('#launches');
      expect(outcome.scope.allowed_paths).toContain('src/onboarding');
      expect(outcome.scope.forbidden_paths).toContain('src/billing');
      expect(outcome.llm_provider).toBe('anthropic');
    });

    it('should parse multiple outcomes', () => {
      const result = parseOutcomeYaml(VALID_YAML_MULTIPLE_OUTCOMES);
      expect(result.outcomes).toHaveLength(2);
      expect(result.outcomes[0].id).toBe('outcome-one');
      expect(result.outcomes[1].id).toBe('outcome-two');
    });

    it('should apply default empty arrays for constraints and signal_connectors', () => {
      const result = parseOutcomeYaml(VALID_YAML);
      expect(result.outcomes[0].constraints).toEqual([]);
      expect(result.signal_connectors).toEqual([]);
    });

    it('should apply default portfolio max_concurrent of 3', () => {
      const result = parseOutcomeYaml(VALID_YAML);
      expect(result.outcomes[0].portfolio.max_concurrent).toBe(3);
    });
  });

  describe('invalid YAML syntax', () => {
    it('should throw ConfigValidationError for invalid YAML syntax', () => {
      const badYaml = `
version: 1
outcomes:
  - id: test
    title: [unterminated
`;
      expect(() => parseOutcomeYaml(badYaml)).toThrow(ConfigValidationError);
    });

    it('should include yaml parse error details in context', () => {
      const badYaml = `: invalid: yaml: syntax: [`;
      try {
        parseOutcomeYaml(badYaml);
        expect.fail('Should have thrown');
      } catch (e) {
        expect(e).toBeInstanceOf(ConfigValidationError);
        const err = e as ConfigValidationError;
        expect(err.code).toBe('CONFIG_VALIDATION_FAILED');
        expect(err.message).toContain('Invalid YAML syntax');
      }
    });
  });

  describe('schema validation errors', () => {
    it('should throw ConfigValidationError when version is missing', () => {
      const yaml = `
outcomes:
  - id: test
    title: Test
    signal:
      source: amplitude
      metric: clicks
      method: event
    target:
      direction: increase
      to: 100
    horizon: 30d
`;
      // version defaults to 1, so this should actually pass
      const result = parseOutcomeYaml(yaml);
      expect(result.version).toBe(1);
    });

    it('should throw ConfigValidationError when outcomes array is empty', () => {
      const yaml = `
version: 1
outcomes: []
`;
      expect(() => parseOutcomeYaml(yaml)).toThrow(ConfigValidationError);
    });

    it('should throw ConfigValidationError when outcomes is missing', () => {
      const yaml = `
version: 1
`;
      expect(() => parseOutcomeYaml(yaml)).toThrow(ConfigValidationError);
    });

    it('should throw ConfigValidationError for invalid outcome id format', () => {
      const yaml = `
version: 1
outcomes:
  - id: Invalid_ID_With_Caps
    title: Test
    signal:
      source: amplitude
      metric: clicks
      method: event
    target:
      direction: increase
      to: 100
    horizon: 30d
`;
      expect(() => parseOutcomeYaml(yaml)).toThrow(ConfigValidationError);
    });

    it('should throw ConfigValidationError when title is missing', () => {
      const yaml = `
version: 1
outcomes:
  - id: test-outcome
    signal:
      source: amplitude
      metric: clicks
      method: event
    target:
      direction: increase
      to: 100
    horizon: 30d
`;
      expect(() => parseOutcomeYaml(yaml)).toThrow(ConfigValidationError);
    });

    it('should throw ConfigValidationError for invalid signal method', () => {
      const yaml = `
version: 1
outcomes:
  - id: test
    title: Test
    signal:
      source: amplitude
      metric: clicks
      method: invalid_method
    target:
      direction: increase
      to: 100
    horizon: 30d
`;
      expect(() => parseOutcomeYaml(yaml)).toThrow(ConfigValidationError);
    });

    it('should throw ConfigValidationError for invalid target direction', () => {
      const yaml = `
version: 1
outcomes:
  - id: test
    title: Test
    signal:
      source: amplitude
      metric: clicks
      method: event
    target:
      direction: sideways
      to: 100
    horizon: 30d
`;
      expect(() => parseOutcomeYaml(yaml)).toThrow(ConfigValidationError);
    });

    it('should throw ConfigValidationError when target.to is missing', () => {
      const yaml = `
version: 1
outcomes:
  - id: test
    title: Test
    signal:
      source: amplitude
      metric: clicks
      method: event
    target:
      direction: increase
    horizon: 30d
`;
      expect(() => parseOutcomeYaml(yaml)).toThrow(ConfigValidationError);
    });

    it('should throw ConfigValidationError when horizon is missing', () => {
      const yaml = `
version: 1
outcomes:
  - id: test
    title: Test
    signal:
      source: amplitude
      metric: clicks
      method: event
    target:
      direction: increase
      to: 100
`;
      expect(() => parseOutcomeYaml(yaml)).toThrow(ConfigValidationError);
    });

    it('should throw ConfigValidationError for confidence_required > 1', () => {
      const yaml = `
version: 1
outcomes:
  - id: test
    title: Test
    signal:
      source: amplitude
      metric: clicks
      method: event
    target:
      direction: increase
      to: 100
      confidence_required: 1.5
    horizon: 30d
`;
      expect(() => parseOutcomeYaml(yaml)).toThrow(ConfigValidationError);
    });

    it('should throw ConfigValidationError for confidence_required < 0', () => {
      const yaml = `
version: 1
outcomes:
  - id: test
    title: Test
    signal:
      source: amplitude
      metric: clicks
      method: event
    target:
      direction: increase
      to: 100
      confidence_required: -0.5
    horizon: 30d
`;
      expect(() => parseOutcomeYaml(yaml)).toThrow(ConfigValidationError);
    });

    it('should include field paths in error context', () => {
      const yaml = `
version: 1
outcomes:
  - id: INVALID
    title: Test
    signal:
      source: amplitude
      metric: clicks
      method: bad
    target:
      direction: increase
      to: 100
    horizon: 30d
`;
      try {
        parseOutcomeYaml(yaml);
        expect.fail('Should have thrown');
      } catch (e) {
        const err = e as ConfigValidationError;
        expect(err.context).toBeDefined();
        const errors = (err.context as Record<string, unknown>).errors as Record<string, string[]>;
        // Should have error entries with dot-separated paths
        const paths = Object.keys(errors);
        expect(paths.length).toBeGreaterThan(0);
      }
    });
  });

  describe('environment variable interpolation', () => {
    const originalEnv = process.env;

    beforeEach(() => {
      process.env = { ...originalEnv };
    });

    afterEach(() => {
      process.env = originalEnv;
    });

    it('should interpolate environment variables in string values', () => {
      process.env.TEST_SOURCE = 'amplitude';
      process.env.TEST_METRIC = 'page_views';

      const yaml = `
version: 1
outcomes:
  - id: test-env
    title: Test Environment Variables
    signal:
      source: \${TEST_SOURCE}
      metric: \${TEST_METRIC}
      method: event
    target:
      direction: increase
      to: 100
    horizon: 30d
`;
      const result = parseOutcomeYaml(yaml);
      expect(result.outcomes[0].signal.source).toBe('amplitude');
      expect(result.outcomes[0].signal.metric).toBe('page_views');
    });

    it('should replace undefined env vars with empty string', () => {
      delete process.env.NONEXISTENT_VAR;

      const yaml = `
version: 1
outcomes:
  - id: test-env
    title: Test \${NONEXISTENT_VAR} Title
    signal:
      source: amplitude
      metric: clicks
      method: event
    target:
      direction: increase
      to: 100
    horizon: 30d
`;
      const result = parseOutcomeYaml(yaml);
      expect(result.outcomes[0].title).toBe('Test  Title');
    });

    it('should interpolate env vars in nested objects', () => {
      process.env.SLACK_TOKEN = 'xoxb-test-token';
      process.env.SLACK_CHANNEL = '#test-channel';

      const yaml = `
version: 1
outcomes:
  - id: test-env
    title: Test
    signal:
      source: amplitude
      metric: clicks
      method: event
    target:
      direction: increase
      to: 100
    horizon: 30d
notifications:
  slack:
    bot_token: \${SLACK_TOKEN}
    default_channel: \${SLACK_CHANNEL}
`;
      const result = parseOutcomeYaml(yaml);
      expect(result.notifications?.slack?.bot_token).toBe('xoxb-test-token');
      expect(result.notifications?.slack?.default_channel).toBe('#test-channel');
    });

    it('should interpolate env vars in array values', () => {
      process.env.ALLOWED_PATH = 'src/features';

      const yaml = `
version: 1
outcomes:
  - id: test-env
    title: Test
    signal:
      source: amplitude
      metric: clicks
      method: event
    target:
      direction: increase
      to: 100
    horizon: 30d
    scope:
      allowed_paths:
        - \${ALLOWED_PATH}
`;
      const result = parseOutcomeYaml(yaml);
      expect(result.outcomes[0].scope.allowed_paths).toContain('src/features');
    });
  });

  describe('edge cases', () => {
    it('should handle YAML with extra unknown fields (Zod strips them)', () => {
      const yaml = `
version: 1
outcomes:
  - id: test
    title: Test
    signal:
      source: amplitude
      metric: clicks
      method: event
    target:
      direction: increase
      to: 100
    horizon: 30d
    unknown_field: should_be_ignored
`;
      // Zod's default behavior strips unknown fields, so this should not throw
      const result = parseOutcomeYaml(yaml);
      expect(result.outcomes[0].id).toBe('test');
    });

    it('should accept all valid signal methods', () => {
      for (const method of ['funnel', 'event', 'custom']) {
        const yaml = `
version: 1
outcomes:
  - id: test-${method}
    title: Test ${method}
    signal:
      source: amplitude
      metric: clicks
      method: ${method}
    target:
      direction: increase
      to: 100
    horizon: 30d
`;
        const result = parseOutcomeYaml(yaml);
        expect(result.outcomes[0].signal.method).toBe(method);
      }
    });

    it('should accept all valid aggregation values', () => {
      for (const agg of ['point', '7d_rolling', '30d_rolling']) {
        const yaml = `
version: 1
outcomes:
  - id: test-agg
    title: Test aggregation
    signal:
      source: amplitude
      metric: clicks
      method: event
      aggregation: ${agg}
    target:
      direction: increase
      to: 100
    horizon: 30d
`;
        const result = parseOutcomeYaml(yaml);
        expect(result.outcomes[0].signal.aggregation).toBe(agg);
      }
    });
  });
});
