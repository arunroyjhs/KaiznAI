import type { SignalConnector, ConnectorConfig } from './connectors/base.js';
import type { SequentialTest, Measurement, MeasurementPlan, SignificanceResult } from './statistics/sequential-test.js';

export interface KillSwitchConfig {
  experimentId: string;
  outcomeId: string;
  killThreshold: number;
  constraints: Array<{
    signal: string;
    source: string;
    metric: string;
    min?: number;
    max?: number;
    connectorConfig: ConnectorConfig;
  }>;
}

export interface KillSwitchResult {
  shouldKill: boolean;
  reason?: string;
  details?: {
    type: 'kill_threshold' | 'constraint_violation';
    signal: string;
    currentValue: number;
    limit: number;
  };
}

/**
 * Auto kill-switch that monitors experiments and triggers automatic
 * rollback when kill thresholds or constraints are violated.
 */
export class AutoKillSwitch {
  constructor(
    private connectors: Map<string, SignalConnector>,
    private sequentialTest: SequentialTest,
    private onKill: (experimentId: string, reason: string) => Promise<void>,
  ) {}

  /**
   * Check if an experiment should be automatically killed.
   */
  async check(
    config: KillSwitchConfig,
    measurements: Measurement[],
    plan: MeasurementPlan,
  ): Promise<KillSwitchResult> {
    // Check 1: Kill threshold on primary signal
    const sigResult = await this.sequentialTest.isSignificant(measurements, plan);

    if (sigResult.exceeds_kill_threshold) {
      const result: KillSwitchResult = {
        shouldKill: true,
        reason: `Primary signal exceeded kill threshold. Delta: ${sigResult.estimated_delta.toFixed(4)}, Kill threshold: ${config.killThreshold}`,
        details: {
          type: 'kill_threshold',
          signal: 'primary',
          currentValue: sigResult.estimated_delta,
          limit: config.killThreshold,
        },
      };

      await this.onKill(config.experimentId, result.reason!);
      return result;
    }

    // Check 2: Constraint violations
    for (const constraint of config.constraints) {
      const connector = this.connectors.get(constraint.source);
      if (!connector) continue;

      try {
        const now = new Date();
        const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

        const metricValue = await connector.fetchMetric(
          constraint.metric,
          { start: oneDayAgo, end: now },
          undefined,
          constraint.connectorConfig,
        );

        if (constraint.min !== undefined && metricValue.value < constraint.min) {
          const result: KillSwitchResult = {
            shouldKill: true,
            reason: `Constraint violated: ${constraint.signal} = ${metricValue.value} (min: ${constraint.min})`,
            details: {
              type: 'constraint_violation',
              signal: constraint.signal,
              currentValue: metricValue.value,
              limit: constraint.min,
            },
          };

          await this.onKill(config.experimentId, result.reason!);
          return result;
        }

        if (constraint.max !== undefined && metricValue.value > constraint.max) {
          const result: KillSwitchResult = {
            shouldKill: true,
            reason: `Constraint violated: ${constraint.signal} = ${metricValue.value} (max: ${constraint.max})`,
            details: {
              type: 'constraint_violation',
              signal: constraint.signal,
              currentValue: metricValue.value,
              limit: constraint.max,
            },
          };

          await this.onKill(config.experimentId, result.reason!);
          return result;
        }
      } catch {
        // Signal fetch errors pause but don't kill — per error handling standards
        continue;
      }
    }

    return { shouldKill: false };
  }
}
