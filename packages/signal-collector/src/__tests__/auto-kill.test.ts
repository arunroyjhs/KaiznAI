import { describe, it, expect, vi } from 'vitest';
import { AutoKillSwitch, type KillSwitchConfig } from '../auto-kill.js';
import type { SignalConnector, ConnectorConfig } from '../connectors/base.js';
import type {
  SequentialTest,
  Measurement,
  MeasurementPlan,
  SignificanceResult,
} from '../statistics/sequential-test.js';

function createMockConnector(metricValue: number): SignalConnector {
  return {
    name: 'mock-connector',
    testConnection: vi.fn().mockResolvedValue({ success: true, message: 'ok' }),
    fetchMetric: vi.fn().mockResolvedValue({
      value: metricValue,
      timestamp: new Date(),
    }),
    fetchVariantMetric: vi.fn().mockResolvedValue({
      control: { value: 0, timestamp: new Date() },
      treatment: { value: 0, timestamp: new Date() },
    }),
    listMetrics: vi.fn().mockResolvedValue([]),
  };
}

function createMockSequentialTest(overrides: Partial<SignificanceResult> = {}): SequentialTest {
  const defaultResult: SignificanceResult = {
    significant: false,
    sample_size_control: 100,
    sample_size_treatment: 100,
    meets_success_threshold: false,
    exceeds_kill_threshold: false,
    estimated_delta: 0,
    confidence_interval: [-0.01, 0.01],
  };

  return {
    isSignificant: vi.fn().mockReturnValue({ ...defaultResult, ...overrides }),
  } as unknown as SequentialTest;
}

function createBasePlan(): MeasurementPlan {
  return {
    minSampleSize: 10,
    confidenceRequired: 0.95,
    successThreshold: 0.05,
    killThreshold: 0.05,
  };
}

function createBaseMeasurements(): Measurement[] {
  const now = new Date();
  return [
    { value: 10, variant: 'control', timestamp: now },
    { value: 11, variant: 'treatment', timestamp: now },
  ];
}

function createBaseConfig(constraints: KillSwitchConfig['constraints'] = []): KillSwitchConfig {
  return {
    experimentId: 'exp-123',
    outcomeId: 'outcome-456',
    killThreshold: 0.05,
    constraints,
  };
}

describe('AutoKillSwitch', () => {
  describe('no kill conditions', () => {
    it('returns shouldKill=false when everything is fine', async () => {
      const mockSequentialTest = createMockSequentialTest({
        exceeds_kill_threshold: false,
        estimated_delta: 0.01,
      });
      const onKill = vi.fn().mockResolvedValue(undefined);
      const connectors = new Map<string, SignalConnector>();

      const killSwitch = new AutoKillSwitch(connectors, mockSequentialTest, onKill);

      const result = await killSwitch.check(
        createBaseConfig(),
        createBaseMeasurements(),
        createBasePlan(),
      );

      expect(result.shouldKill).toBe(false);
      expect(result.reason).toBeUndefined();
      expect(result.details).toBeUndefined();
      expect(onKill).not.toHaveBeenCalled();
    });
  });

  describe('kill threshold exceeded', () => {
    it('returns shouldKill=true when kill threshold is exceeded', async () => {
      const mockSequentialTest = createMockSequentialTest({
        exceeds_kill_threshold: true,
        estimated_delta: -0.10,
      });
      const onKill = vi.fn().mockResolvedValue(undefined);
      const connectors = new Map<string, SignalConnector>();

      const killSwitch = new AutoKillSwitch(connectors, mockSequentialTest, onKill);

      const result = await killSwitch.check(
        createBaseConfig(),
        createBaseMeasurements(),
        createBasePlan(),
      );

      expect(result.shouldKill).toBe(true);
      expect(result.reason).toBeDefined();
      expect(result.reason).toContain('kill threshold');
      expect(result.details).toBeDefined();
      expect(result.details!.type).toBe('kill_threshold');
      expect(result.details!.signal).toBe('primary');
      expect(result.details!.currentValue).toBe(-0.10);
    });

    it('calls onKill callback when kill threshold is exceeded', async () => {
      const mockSequentialTest = createMockSequentialTest({
        exceeds_kill_threshold: true,
        estimated_delta: -0.10,
      });
      const onKill = vi.fn().mockResolvedValue(undefined);
      const connectors = new Map<string, SignalConnector>();

      const killSwitch = new AutoKillSwitch(connectors, mockSequentialTest, onKill);

      await killSwitch.check(
        createBaseConfig(),
        createBaseMeasurements(),
        createBasePlan(),
      );

      expect(onKill).toHaveBeenCalledTimes(1);
      expect(onKill).toHaveBeenCalledWith('exp-123', expect.stringContaining('kill threshold'));
    });
  });

  describe('constraint violations', () => {
    it('returns shouldKill=true on constraint min violation', async () => {
      const mockConnector = createMockConnector(0.5); // value is 0.5, min is 1.0
      const mockSequentialTest = createMockSequentialTest();
      const onKill = vi.fn().mockResolvedValue(undefined);
      const connectors = new Map<string, SignalConnector>([
        ['analytics', mockConnector],
      ]);

      const config = createBaseConfig([
        {
          signal: 'error_rate',
          source: 'analytics',
          metric: 'error_rate',
          min: 1.0,
          connectorConfig: { apiKey: 'test' },
        },
      ]);

      const killSwitch = new AutoKillSwitch(connectors, mockSequentialTest, onKill);
      const result = await killSwitch.check(
        config,
        createBaseMeasurements(),
        createBasePlan(),
      );

      expect(result.shouldKill).toBe(true);
      expect(result.details).toBeDefined();
      expect(result.details!.type).toBe('constraint_violation');
      expect(result.details!.signal).toBe('error_rate');
      expect(result.details!.currentValue).toBe(0.5);
      expect(result.details!.limit).toBe(1.0);
    });

    it('returns shouldKill=true on constraint max violation', async () => {
      const mockConnector = createMockConnector(15.0); // value is 15, max is 10
      const mockSequentialTest = createMockSequentialTest();
      const onKill = vi.fn().mockResolvedValue(undefined);
      const connectors = new Map<string, SignalConnector>([
        ['analytics', mockConnector],
      ]);

      const config = createBaseConfig([
        {
          signal: 'latency_p99',
          source: 'analytics',
          metric: 'latency_p99',
          max: 10.0,
          connectorConfig: { apiKey: 'test' },
        },
      ]);

      const killSwitch = new AutoKillSwitch(connectors, mockSequentialTest, onKill);
      const result = await killSwitch.check(
        config,
        createBaseMeasurements(),
        createBasePlan(),
      );

      expect(result.shouldKill).toBe(true);
      expect(result.details).toBeDefined();
      expect(result.details!.type).toBe('constraint_violation');
      expect(result.details!.signal).toBe('latency_p99');
      expect(result.details!.currentValue).toBe(15.0);
      expect(result.details!.limit).toBe(10.0);
    });

    it('calls onKill callback on constraint violation', async () => {
      const mockConnector = createMockConnector(15.0);
      const mockSequentialTest = createMockSequentialTest();
      const onKill = vi.fn().mockResolvedValue(undefined);
      const connectors = new Map<string, SignalConnector>([
        ['analytics', mockConnector],
      ]);

      const config = createBaseConfig([
        {
          signal: 'latency_p99',
          source: 'analytics',
          metric: 'latency_p99',
          max: 10.0,
          connectorConfig: { apiKey: 'test' },
        },
      ]);

      const killSwitch = new AutoKillSwitch(connectors, mockSequentialTest, onKill);
      await killSwitch.check(config, createBaseMeasurements(), createBasePlan());

      expect(onKill).toHaveBeenCalledTimes(1);
      expect(onKill).toHaveBeenCalledWith('exp-123', expect.stringContaining('Constraint violated'));
    });

    it('does not kill when constraint values are within range', async () => {
      const mockConnector = createMockConnector(5.0); // within [1, 10]
      const mockSequentialTest = createMockSequentialTest();
      const onKill = vi.fn().mockResolvedValue(undefined);
      const connectors = new Map<string, SignalConnector>([
        ['analytics', mockConnector],
      ]);

      const config = createBaseConfig([
        {
          signal: 'throughput',
          source: 'analytics',
          metric: 'throughput',
          min: 1.0,
          max: 10.0,
          connectorConfig: { apiKey: 'test' },
        },
      ]);

      const killSwitch = new AutoKillSwitch(connectors, mockSequentialTest, onKill);
      const result = await killSwitch.check(
        config,
        createBaseMeasurements(),
        createBasePlan(),
      );

      expect(result.shouldKill).toBe(false);
      expect(onKill).not.toHaveBeenCalled();
    });
  });

  describe('connector errors', () => {
    it('handles connector errors gracefully and does not kill', async () => {
      const mockConnector: SignalConnector = {
        name: 'failing-connector',
        testConnection: vi.fn().mockResolvedValue({ success: true, message: 'ok' }),
        fetchMetric: vi.fn().mockRejectedValue(new Error('Connection timeout')),
        fetchVariantMetric: vi.fn().mockRejectedValue(new Error('Connection timeout')),
        listMetrics: vi.fn().mockResolvedValue([]),
      };
      const mockSequentialTest = createMockSequentialTest();
      const onKill = vi.fn().mockResolvedValue(undefined);
      const connectors = new Map<string, SignalConnector>([
        ['analytics', mockConnector],
      ]);

      const config = createBaseConfig([
        {
          signal: 'error_rate',
          source: 'analytics',
          metric: 'error_rate',
          max: 5.0,
          connectorConfig: { apiKey: 'test' },
        },
      ]);

      const killSwitch = new AutoKillSwitch(connectors, mockSequentialTest, onKill);
      const result = await killSwitch.check(
        config,
        createBaseMeasurements(),
        createBasePlan(),
      );

      expect(result.shouldKill).toBe(false);
      expect(onKill).not.toHaveBeenCalled();
    });

    it('skips constraints whose connector source is not found', async () => {
      const mockSequentialTest = createMockSequentialTest();
      const onKill = vi.fn().mockResolvedValue(undefined);
      const connectors = new Map<string, SignalConnector>();
      // No connectors registered at all

      const config = createBaseConfig([
        {
          signal: 'error_rate',
          source: 'nonexistent-source',
          metric: 'error_rate',
          max: 5.0,
          connectorConfig: { apiKey: 'test' },
        },
      ]);

      const killSwitch = new AutoKillSwitch(connectors, mockSequentialTest, onKill);
      const result = await killSwitch.check(
        config,
        createBaseMeasurements(),
        createBasePlan(),
      );

      expect(result.shouldKill).toBe(false);
      expect(onKill).not.toHaveBeenCalled();
    });
  });
});
