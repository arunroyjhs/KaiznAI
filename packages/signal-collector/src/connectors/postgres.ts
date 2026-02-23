import type {
  SignalConnector,
  ConnectorConfig,
  TimeRange,
  MetricValue,
  VariantMetricValue,
  MetricDefinition,
  ConnectionResult,
} from './base.js';

interface PostgresConnectorConfig extends ConnectorConfig {
  connection_string: string;
  query: string;
  value_column?: string;
  sample_size_column?: string;
  variant_column?: string;
}

export class PostgresConnector implements SignalConnector {
  readonly name = 'postgres';

  async testConnection(config: ConnectorConfig): Promise<ConnectionResult> {
    const pgConfig = config as PostgresConnectorConfig;
    try {
      const pg = await import('pg');
      const client = new pg.default.Client({ connectionString: pgConfig.connection_string });
      await client.connect();
      await client.query('SELECT 1');
      await client.end();
      return { success: true, message: 'Connected to PostgreSQL successfully' };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      return { success: false, message: `Failed to connect to PostgreSQL: ${message}` };
    }
  }

  async fetchMetric(
    _metric: string,
    timeRange: TimeRange,
    segment?: Record<string, string>,
    config?: ConnectorConfig,
  ): Promise<MetricValue> {
    const pgConfig = config as PostgresConnectorConfig;
    const pg = await import('pg');
    const client = new pg.default.Client({ connectionString: pgConfig.connection_string });

    try {
      await client.connect();

      let query = pgConfig.query;
      const params: (string | Date)[] = [timeRange.start, timeRange.end];

      // The query should use $1 and $2 for start/end time range
      // Additional segment filters can be appended
      if (segment) {
        const segmentClauses = Object.entries(segment).map(([key, value], idx) => {
          params.push(value);
          return `${key} = $${idx + 3}`;
        });
        query += ` AND ${segmentClauses.join(' AND ')}`;
      }

      const result = await client.query(query, params);
      const row = result.rows[0] as Record<string, unknown> | undefined;

      if (!row) {
        throw new Error('Query returned no results');
      }

      const valueCol = pgConfig.value_column ?? 'value';
      const sampleCol = pgConfig.sample_size_column ?? 'sample_size';

      return {
        value: Number(row[valueCol]),
        sample_size: row[sampleCol] ? Number(row[sampleCol]) : undefined,
        timestamp: new Date(),
      };
    } finally {
      await client.end();
    }
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

  async listMetrics(_config: ConnectorConfig): Promise<MetricDefinition[]> {
    // PostgreSQL connector uses custom SQL queries, so metrics aren't discoverable
    return [];
  }
}
