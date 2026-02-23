import type {
  SignalConnector,
  ConnectorConfig,
  TimeRange,
  MetricValue,
  VariantMetricValue,
  MetricDefinition,
  ConnectionResult,
} from './base.js';

interface MixpanelConfig extends ConnectorConfig {
  project_id: string;
  service_account: string;
  api_secret?: string;
}

export class MixpanelConnector implements SignalConnector {
  readonly name = 'mixpanel';

  private getBaseUrl(): string {
    return 'https://mixpanel.com/api/2.0';
  }

  private getHeaders(config: MixpanelConfig): Record<string, string> {
    const auth = Buffer.from(`${config.service_account}:`).toString('base64');
    return {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };
  }

  async testConnection(config: ConnectorConfig): Promise<ConnectionResult> {
    const mConfig = config as MixpanelConfig;
    try {
      const response = await fetch(`${this.getBaseUrl()}/events/top`, {
        method: 'GET',
        headers: this.getHeaders(mConfig),
      });

      if (response.ok) {
        return { success: true, message: 'Connected to Mixpanel successfully' };
      }

      return {
        success: false,
        message: `Mixpanel returned status ${response.status}: ${response.statusText}`,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      return { success: false, message: `Failed to connect to Mixpanel: ${message}` };
    }
  }

  async fetchMetric(
    metric: string,
    timeRange: TimeRange,
    segment?: Record<string, string>,
    config?: ConnectorConfig,
  ): Promise<MetricValue> {
    const mConfig = config as MixpanelConfig;
    const params = new URLSearchParams({
      event: JSON.stringify([metric]),
      from_date: timeRange.start.toISOString().split('T')[0]!,
      to_date: timeRange.end.toISOString().split('T')[0]!,
      type: 'general',
      unit: 'day',
    });

    if (segment) {
      params.set('where', this.buildWhereClause(segment));
    }

    const response = await fetch(
      `${this.getBaseUrl()}/events?${params.toString()}`,
      { headers: this.getHeaders(mConfig) },
    );

    if (!response.ok) {
      throw new Error(`Mixpanel API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json() as Record<string, unknown>;
    const values = this.extractValues(data);
    const total = values.reduce((sum, v) => sum + v, 0);

    return {
      value: total,
      sample_size: values.length,
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
      this.fetchMetric(metric, timeRange, { [variantKey]: 'control' }, config),
      this.fetchMetric(metric, timeRange, { [variantKey]: 'treatment' }, config),
    ]);

    return { control, treatment };
  }

  async listMetrics(config: ConnectorConfig): Promise<MetricDefinition[]> {
    const mConfig = config as MixpanelConfig;
    const response = await fetch(`${this.getBaseUrl()}/events/names`, {
      headers: this.getHeaders(mConfig),
    });

    if (!response.ok) {
      throw new Error(`Mixpanel API error: ${response.status}`);
    }

    const events = (await response.json()) as string[];
    return events.map((name) => ({
      name,
      type: 'event' as const,
    }));
  }

  private buildWhereClause(segment: Record<string, string>): string {
    return Object.entries(segment)
      .map(([key, value]) => `properties["${key}"] == "${value}"`)
      .join(' and ');
  }

  private extractValues(data: Record<string, unknown>): number[] {
    const values: number[] = [];
    if (data && typeof data === 'object') {
      const dataObj = data['data'] as Record<string, Record<string, number>> | undefined;
      if (dataObj && typeof dataObj === 'object') {
        for (const series of Object.values(dataObj)) {
          if (typeof series === 'object') {
            for (const val of Object.values(series)) {
              if (typeof val === 'number') {
                values.push(val);
              }
            }
          }
        }
      }
    }
    return values;
  }
}
