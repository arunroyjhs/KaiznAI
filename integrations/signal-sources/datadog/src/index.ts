import type {
  SignalConnector,
  ConnectorConfig,
  TimeRange,
  MetricValue,
  VariantMetricValue,
  MetricDefinition,
  ConnectionResult,
} from '@outcome-runtime/signal-collector/connectors/base.js';

interface DatadogConfig extends ConnectorConfig {
  api_key: string;
  app_key: string;
  site?: string; // e.g. 'datadoghq.com', 'datadoghq.eu', 'us5.datadoghq.com'
}

export class DatadogConnector implements SignalConnector {
  readonly name = 'datadog';

  private getBaseUrl(config: DatadogConfig): string {
    const site = config.site || 'datadoghq.com';
    return `https://api.${site}`;
  }

  private getHeaders(config: DatadogConfig): Record<string, string> {
    return {
      'DD-API-KEY': config.api_key,
      'DD-APPLICATION-KEY': config.app_key,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };
  }

  async testConnection(config: ConnectorConfig): Promise<ConnectionResult> {
    const dConfig = config as DatadogConfig;
    try {
      const response = await fetch(`${this.getBaseUrl(dConfig)}/api/v1/validate`, {
        method: 'GET',
        headers: this.getHeaders(dConfig),
      });

      if (response.ok) {
        return { success: true, message: 'Connected to Datadog successfully' };
      }

      return {
        success: false,
        message: `Datadog returned status ${response.status}: ${response.statusText}`,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      return { success: false, message: `Failed to connect to Datadog: ${message}` };
    }
  }

  async fetchMetric(
    metric: string,
    timeRange: TimeRange,
    segment?: Record<string, string>,
    config?: ConnectorConfig,
  ): Promise<MetricValue> {
    const dConfig = config as DatadogConfig;

    let query = `avg:${metric}{*}`;
    if (segment) {
      const tags = Object.entries(segment)
        .map(([key, value]) => `${key}:${value}`)
        .join(',');
      query = `avg:${metric}{${tags}}`;
    }

    const params = new URLSearchParams({
      from: String(Math.floor(timeRange.start.getTime() / 1000)),
      to: String(Math.floor(timeRange.end.getTime() / 1000)),
      query,
    });

    const response = await fetch(
      `${this.getBaseUrl(dConfig)}/api/v2/query/timeseries?${params.toString()}`,
      {
        method: 'GET',
        headers: this.getHeaders(dConfig),
      },
    );

    if (!response.ok) {
      throw new Error(`Datadog API error: ${response.status} ${response.statusText}`);
    }

    const data = (await response.json()) as Record<string, unknown>;
    const { total, count } = this.extractTimeseries(data);

    return {
      value: total,
      sample_size: count,
      timestamp: new Date(),
    };
  }

  async fetchVariantMetric(
    metric: string,
    variantKey: string,
    timeRange: TimeRange,
    config?: ConnectorConfig,
  ): Promise<VariantMetricValue> {
    const [control, treatment] = await Promise.all([
      this.fetchMetric(
        metric,
        timeRange,
        { [variantKey]: 'control' },
        config,
      ),
      this.fetchMetric(
        metric,
        timeRange,
        { [variantKey]: 'treatment' },
        config,
      ),
    ]);

    return { control, treatment };
  }

  async listMetrics(config: ConnectorConfig): Promise<MetricDefinition[]> {
    const dConfig = config as DatadogConfig;

    const response = await fetch(
      `${this.getBaseUrl(dConfig)}/api/v1/metrics?from=${Math.floor(Date.now() / 1000) - 86400}`,
      { headers: this.getHeaders(dConfig) },
    );

    if (!response.ok) {
      throw new Error(`Datadog API error: ${response.status}`);
    }

    const data = (await response.json()) as { metrics: string[] };

    return data.metrics.map((name) => ({
      name,
      type: 'custom' as const,
    }));
  }

  private extractTimeseries(data: Record<string, unknown>): {
    total: number;
    count: number;
  } {
    let total = 0;
    let count = 0;

    try {
      const series = data['data'] as {
        attributes?: {
          series?: Array<{
            values?: number[];
          }>;
        };
      } | undefined;

      if (series?.attributes?.series) {
        for (const s of series.attributes.series) {
          if (s.values) {
            for (const val of s.values) {
              if (typeof val === 'number' && !isNaN(val)) {
                total += val;
                count++;
              }
            }
          }
        }
      }
    } catch {
      // fall through with defaults
    }

    return { total, count };
  }
}
