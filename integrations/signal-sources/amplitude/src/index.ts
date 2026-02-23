import type {
  SignalConnector,
  ConnectorConfig,
  TimeRange,
  MetricValue,
  VariantMetricValue,
  MetricDefinition,
  ConnectionResult,
} from '@outcome-runtime/signal-collector/connectors/base.js';

interface AmplitudeConfig extends ConnectorConfig {
  api_key: string;
  secret_key: string;
}

export class AmplitudeConnector implements SignalConnector {
  readonly name = 'amplitude';

  private getBaseUrl(): string {
    return 'https://amplitude.com/api/2';
  }

  private getTaxonomyUrl(): string {
    return 'https://amplitude.com/api/2/taxonomy/event';
  }

  private getHeaders(config: AmplitudeConfig): Record<string, string> {
    const auth = Buffer.from(`${config.api_key}:${config.secret_key}`).toString('base64');
    return {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };
  }

  async testConnection(config: ConnectorConfig): Promise<ConnectionResult> {
    const aConfig = config as AmplitudeConfig;
    try {
      const params = new URLSearchParams({
        start: this.formatDate(new Date()),
        end: this.formatDate(new Date()),
      });

      const response = await fetch(
        `${this.getBaseUrl()}/events/segmentation?${params.toString()}`,
        {
          method: 'GET',
          headers: this.getHeaders(aConfig),
        },
      );

      if (response.ok || response.status === 400) {
        // 400 is acceptable here — it means credentials are valid but query params may be incomplete
        return { success: true, message: 'Connected to Amplitude successfully' };
      }

      return {
        success: false,
        message: `Amplitude returned status ${response.status}: ${response.statusText}`,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      return { success: false, message: `Failed to connect to Amplitude: ${message}` };
    }
  }

  async fetchMetric(
    metric: string,
    timeRange: TimeRange,
    segment?: Record<string, string>,
    config?: ConnectorConfig,
  ): Promise<MetricValue> {
    const aConfig = config as AmplitudeConfig;

    const eventPayload: Record<string, unknown> = {
      event_type: metric,
    };

    if (segment) {
      eventPayload.filters = Object.entries(segment).map(([key, value]) => ({
        subprop_type: 'user',
        subprop_key: key,
        subprop_op: 'is',
        subprop_value: [value],
      }));
    }

    const params = new URLSearchParams({
      e: JSON.stringify(eventPayload),
      start: this.formatDate(timeRange.start),
      end: this.formatDate(timeRange.end),
      m: 'totals',
    });

    const response = await fetch(
      `${this.getBaseUrl()}/events/segmentation?${params.toString()}`,
      { headers: this.getHeaders(aConfig) },
    );

    if (!response.ok) {
      throw new Error(`Amplitude API error: ${response.status} ${response.statusText}`);
    }

    const data = (await response.json()) as Record<string, unknown>;
    const total = this.extractTotal(data);

    return {
      value: total,
      sample_size: undefined,
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
    const aConfig = config as AmplitudeConfig;

    const response = await fetch(this.getTaxonomyUrl(), {
      headers: this.getHeaders(aConfig),
    });

    if (!response.ok) {
      throw new Error(`Amplitude API error: ${response.status}`);
    }

    const body = (await response.json()) as {
      data: Array<{ event_type: string; description?: string }>;
    };

    return body.data.map((event) => ({
      name: event.event_type,
      type: 'event' as const,
      description: event.description,
    }));
  }

  private formatDate(date: Date): string {
    return date.toISOString().split('T')[0]!;
  }

  private extractTotal(data: Record<string, unknown>): number {
    try {
      const result = data['data'] as { series?: number[][] } | undefined;
      if (result?.series) {
        return result.series.flat().reduce((sum, v) => sum + v, 0);
      }
    } catch {
      // fall through
    }
    return 0;
  }
}
