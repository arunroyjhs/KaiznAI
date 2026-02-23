import type { SignalConnector, ConnectorConfig, MetricValue } from './connectors/base.js';
import { SequentialTest, type Measurement, type MeasurementPlan, type SignificanceResult } from './statistics/sequential-test.js';

export interface MonitorConfig {
  connector: SignalConnector;
  connectorConfig: ConnectorConfig;
  metric: string;
  pollIntervalMs: number;
  segment?: Record<string, string>;
}

export interface ConstraintCheck {
  signal: string;
  connector: SignalConnector;
  connectorConfig: ConnectorConfig;
  metric: string;
  min?: number;
  max?: number;
}

export interface ConstraintResult {
  signal: string;
  value: number;
  violated: boolean;
  violation_type?: 'below_min' | 'above_max';
  limit?: number;
}

/**
 * Monitors signal metrics and checks constraints for running experiments.
 */
export class SignalMonitor {
  private sequentialTest: SequentialTest;

  constructor() {
    this.sequentialTest = new SequentialTest();
  }

  /**
   * Fetch the current metric value from a connector.
   */
  async fetchCurrentValue(config: MonitorConfig): Promise<MetricValue> {
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    return config.connector.fetchMetric(
      config.metric,
      { start: sevenDaysAgo, end: now },
      config.segment,
      config.connectorConfig,
    );
  }

  /**
   * Run statistical significance test on collected measurements.
   */
  testSignificance(measurements: Measurement[], plan: MeasurementPlan): SignificanceResult {
    return this.sequentialTest.isSignificant(measurements, plan);
  }

  /**
   * Check all constraints for an experiment.
   * Returns which constraints are violated.
   */
  async checkConstraints(constraints: ConstraintCheck[]): Promise<ConstraintResult[]> {
    const results = await Promise.all(
      constraints.map(async (constraint) => {
        const now = new Date();
        const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

        try {
          const value = await constraint.connector.fetchMetric(
            constraint.metric,
            { start: oneHourAgo, end: now },
            undefined,
            constraint.connectorConfig,
          );

          let violated = false;
          let violationType: 'below_min' | 'above_max' | undefined;
          let limit: number | undefined;

          if (constraint.min !== undefined && value.value < constraint.min) {
            violated = true;
            violationType = 'below_min';
            limit = constraint.min;
          }
          if (constraint.max !== undefined && value.value > constraint.max) {
            violated = true;
            violationType = 'above_max';
            limit = constraint.max;
          }

          return {
            signal: constraint.signal,
            value: value.value,
            violated,
            violation_type: violationType,
            limit,
          };
        } catch {
          // Signal errors never crash experiments — they pause and alert
          return {
            signal: constraint.signal,
            value: 0,
            violated: false,
          };
        }
      }),
    );

    return results;
  }
}
