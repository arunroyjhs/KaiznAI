import { describe, it, expect, vi } from 'vitest';
import { SignalMonitor, type MonitorConfig, type ConstraintCheck } from '../monitor.js';
import type { SignalConnector, ConnectorConfig, MetricValue } from '../connectors/base.js';
import type { Measurement, MeasurementPlan } from '../statistics/sequential-test.js';

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

function createFailingConnector(): SignalConnector {
  return {
    name: 'failing-connector',
    testConnection: vi.fn().mockResolvedValue({ success: false, message: 'error' }),
    fetchMetric: vi.fn().mockRejectedValue(new Error('Connection failed')),
    fetchVariantMetric: vi.fn().mockRejectedValue(new Error('Connection failed')),
    listMetrics: vi.fn().mockResolvedValue([]),
  };
}

describe('SignalMonitor', () => {
  describe('fetchCurrentValue', () => {
    it('delegates to connector.fetchMetric with a 7-day window', async () => {
      const mockConnector = createMockConnector(42);
      const monitor = new SignalMonitor();

      const config: MonitorConfig = {
        connector: mockConnector,
        connectorConfig: { apiKey: 'test-key' },
        metric: 'conversion_rate',
        pollIntervalMs: 60000,
      };

      const result = await monitor.fetchCurrentValue(config);

      expect(result.value).toBe(42);
      expect(mockConnector.fetchMetric).toHaveBeenCalledTimes(1);

      const callArgs = (mockConnector.fetchMetric as ReturnType<typeof vi.fn>).mock.calls[0];
      const metric = callArgs[0];
      const timeRange = callArgs[1];
      const segment = callArgs[2];
      const connectorConfig = callArgs[3];

      expect(metric).toBe('conversion_rate');
      expect(connectorConfig).toEqual({ apiKey: 'test-key' });
      expect(segment).toBeUndefined();

      // Verify the time range is approximately 7 days
      const diffMs = timeRange.end.getTime() - timeRange.start.getTime();
      const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
      expect(diffMs).toBeCloseTo(sevenDaysMs, -3); // within ~1 second tolerance
    });

    it('passes segment to connector.fetchMetric when provided', async () => {
      const mockConnector = createMockConnector(42);
      const monitor = new SignalMonitor();

      const config: MonitorConfig = {
        connector: mockConnector,
        connectorConfig: { apiKey: 'test-key' },
        metric: 'conversion_rate',
        pollIntervalMs: 60000,
        segment: { country: 'US' },
      };

      await monitor.fetchCurrentValue(config);

      const callArgs = (mockConnector.fetchMetric as ReturnType<typeof vi.fn>).mock.calls[0];
      const segment = callArgs[2];
      expect(segment).toEqual({ country: 'US' });
    });
  });

  describe('testSignificance', () => {
    it('delegates to the internal SequentialTest', () => {
      const monitor = new SignalMonitor();
      const now = new Date();

      const measurements: Measurement[] = [
        ...Array.from({ length: 50 }, () => ({
          value: 10,
          variant: 'control' as const,
          timestamp: now,
        })),
        ...Array.from({ length: 50 }, () => ({
          value: 15,
          variant: 'treatment' as const,
          timestamp: now,
        })),
      ];

      const plan: MeasurementPlan = {
        minSampleSize: 10,
        confidenceRequired: 0.95,
        successThreshold: 0.05,
        killThreshold: 0.05,
      };

      const result = monitor.testSignificance(measurements, plan);

      expect(result.sample_size_control).toBe(50);
      expect(result.sample_size_treatment).toBe(50);
      expect(result.estimated_delta).toBeCloseTo(5, 10);
    });

    it('returns insufficient_sample for small data sets', () => {
      const monitor = new SignalMonitor();
      const now = new Date();

      const measurements: Measurement[] = [
        { value: 10, variant: 'control', timestamp: now },
        { value: 15, variant: 'treatment', timestamp: now },
      ];

      const plan: MeasurementPlan = {
        minSampleSize: 100,
        confidenceRequired: 0.95,
        successThreshold: 0.05,
        killThreshold: 0.05,
      };

      const result = monitor.testSignificance(measurements, plan);

      expect(result.significant).toBe(false);
      expect(result.reason).toBe('insufficient_sample');
    });
  });

  describe('checkConstraints', () => {
    it('returns no violations when values are in range', async () => {
      const monitor = new SignalMonitor();
      const mockConnector = createMockConnector(5.0);

      const constraints: ConstraintCheck[] = [
        {
          signal: 'error_rate',
          connector: mockConnector,
          connectorConfig: { apiKey: 'test' },
          metric: 'error_rate',
          min: 0,
          max: 10,
        },
      ];

      const results = await monitor.checkConstraints(constraints);

      expect(results).toHaveLength(1);
      expect(results[0].signal).toBe('error_rate');
      expect(results[0].value).toBe(5.0);
      expect(results[0].violated).toBe(false);
      expect(results[0].violation_type).toBeUndefined();
      expect(results[0].limit).toBeUndefined();
    });

    it('detects below_min violation', async () => {
      const monitor = new SignalMonitor();
      const mockConnector = createMockConnector(0.5);

      const constraints: ConstraintCheck[] = [
        {
          signal: 'throughput',
          connector: mockConnector,
          connectorConfig: { apiKey: 'test' },
          metric: 'throughput',
          min: 1.0,
        },
      ];

      const results = await monitor.checkConstraints(constraints);

      expect(results).toHaveLength(1);
      expect(results[0].signal).toBe('throughput');
      expect(results[0].value).toBe(0.5);
      expect(results[0].violated).toBe(true);
      expect(results[0].violation_type).toBe('below_min');
      expect(results[0].limit).toBe(1.0);
    });

    it('detects above_max violation', async () => {
      const monitor = new SignalMonitor();
      const mockConnector = createMockConnector(150);

      const constraints: ConstraintCheck[] = [
        {
          signal: 'latency_ms',
          connector: mockConnector,
          connectorConfig: { apiKey: 'test' },
          metric: 'latency_ms',
          max: 100,
        },
      ];

      const results = await monitor.checkConstraints(constraints);

      expect(results).toHaveLength(1);
      expect(results[0].signal).toBe('latency_ms');
      expect(results[0].value).toBe(150);
      expect(results[0].violated).toBe(true);
      expect(results[0].violation_type).toBe('above_max');
      expect(results[0].limit).toBe(100);
    });

    it('handles connector errors gracefully and returns violated=false', async () => {
      const monitor = new SignalMonitor();
      const failingConnector = createFailingConnector();

      const constraints: ConstraintCheck[] = [
        {
          signal: 'error_rate',
          connector: failingConnector,
          connectorConfig: { apiKey: 'test' },
          metric: 'error_rate',
          max: 5.0,
        },
      ];

      const results = await monitor.checkConstraints(constraints);

      expect(results).toHaveLength(1);
      expect(results[0].signal).toBe('error_rate');
      expect(results[0].violated).toBe(false);
      expect(results[0].value).toBe(0);
    });

    it('handles multiple constraints at once', async () => {
      const monitor = new SignalMonitor();
      const goodConnector = createMockConnector(5.0);
      const badConnector = createMockConnector(200);

      const constraints: ConstraintCheck[] = [
        {
          signal: 'error_rate',
          connector: goodConnector,
          connectorConfig: { apiKey: 'test' },
          metric: 'error_rate',
          max: 10,
        },
        {
          signal: 'latency_ms',
          connector: badConnector,
          connectorConfig: { apiKey: 'test' },
          metric: 'latency_ms',
          max: 100,
        },
      ];

      const results = await monitor.checkConstraints(constraints);

      expect(results).toHaveLength(2);
      expect(results[0].violated).toBe(false);
      expect(results[1].violated).toBe(true);
      expect(results[1].violation_type).toBe('above_max');
    });

    it('calls connector.fetchMetric with correct parameters', async () => {
      const monitor = new SignalMonitor();
      const mockConnector = createMockConnector(5.0);

      const constraints: ConstraintCheck[] = [
        {
          signal: 'cpu_usage',
          connector: mockConnector,
          connectorConfig: { apiKey: 'test-key', region: 'us-east' },
          metric: 'cpu_usage_percent',
          max: 80,
        },
      ];

      await monitor.checkConstraints(constraints);

      expect(mockConnector.fetchMetric).toHaveBeenCalledTimes(1);

      const callArgs = (mockConnector.fetchMetric as ReturnType<typeof vi.fn>).mock.calls[0];
      const metric = callArgs[0];
      const timeRange = callArgs[1];
      const segment = callArgs[2];
      const connectorConfig = callArgs[3];

      expect(metric).toBe('cpu_usage_percent');
      expect(segment).toBeUndefined();
      expect(connectorConfig).toEqual({ apiKey: 'test-key', region: 'us-east' });

      // Verify 1-hour time window
      const diffMs = timeRange.end.getTime() - timeRange.start.getTime();
      const oneHourMs = 60 * 60 * 1000;
      expect(diffMs).toBeCloseTo(oneHourMs, -3);
    });
  });
});
