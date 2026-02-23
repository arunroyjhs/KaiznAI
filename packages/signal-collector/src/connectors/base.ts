export interface ConnectorConfig {
  [key: string]: string | number | boolean | undefined;
}

export interface TimeRange {
  start: Date;
  end: Date;
}

export interface MetricValue {
  value: number;
  sample_size?: number;
  timestamp: Date;
}

export interface VariantMetricValue {
  control: MetricValue;
  treatment: MetricValue;
}

export interface MetricDefinition {
  name: string;
  type: 'event' | 'funnel' | 'custom';
  description?: string;
}

export interface ConnectionResult {
  success: boolean;
  message: string;
}

export interface SignalConnector {
  name: string;

  testConnection(config: ConnectorConfig): Promise<ConnectionResult>;

  fetchMetric(
    metric: string,
    timeRange: TimeRange,
    segment?: Record<string, string>,
    config?: ConnectorConfig,
  ): Promise<MetricValue>;

  fetchVariantMetric(
    metric: string,
    variantKey: string,
    timeRange: TimeRange,
    config?: ConnectorConfig,
  ): Promise<VariantMetricValue>;

  listMetrics(config: ConnectorConfig): Promise<MetricDefinition[]>;
}
