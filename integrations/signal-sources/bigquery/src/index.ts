import type {
  SignalConnector,
  ConnectorConfig,
  TimeRange,
  MetricValue,
  VariantMetricValue,
  MetricDefinition,
  ConnectionResult,
} from '@outcome-runtime/signal-collector/connectors/base.js';

interface BigQueryConfig extends ConnectorConfig {
  project_id: string;
  dataset: string;
  table: string;
  metric_column: string;
  date_column?: string;
  variant_column?: string;
  service_account_json: string;
}

interface ServiceAccountCredentials {
  client_email: string;
  private_key: string;
  token_uri: string;
}

export class BigQueryConnector implements SignalConnector {
  readonly name = 'bigquery';

  private getBaseUrl(projectId: string): string {
    return `https://bigquery.googleapis.com/bigquery/v2/projects/${projectId}`;
  }

  private parseServiceAccount(config: BigQueryConfig): ServiceAccountCredentials {
    try {
      return JSON.parse(config.service_account_json) as ServiceAccountCredentials;
    } catch {
      throw new Error('Invalid service account JSON');
    }
  }

  private async getAccessToken(credentials: ServiceAccountCredentials): Promise<string> {
    const now = Math.floor(Date.now() / 1000);
    const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
    const payload = Buffer.from(
      JSON.stringify({
        iss: credentials.client_email,
        scope: 'https://www.googleapis.com/auth/bigquery.readonly',
        aud: credentials.token_uri || 'https://oauth2.googleapis.com/token',
        iat: now,
        exp: now + 3600,
      }),
    ).toString('base64url');

    const crypto = await import('node:crypto');
    const sign = crypto.createSign('RSA-SHA256');
    sign.update(`${header}.${payload}`);
    const signature = sign.sign(credentials.private_key, 'base64url');

    const jwt = `${header}.${payload}.${signature}`;

    const tokenUrl = credentials.token_uri || 'https://oauth2.googleapis.com/token';
    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion: jwt,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to obtain access token: ${response.status} ${response.statusText}`);
    }

    const tokenData = (await response.json()) as { access_token: string };
    return tokenData.access_token;
  }

  private async getHeaders(config: BigQueryConfig): Promise<Record<string, string>> {
    const credentials = this.parseServiceAccount(config);
    const token = await this.getAccessToken(credentials);
    return {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };
  }

  async testConnection(config: ConnectorConfig): Promise<ConnectionResult> {
    const bConfig = config as BigQueryConfig;
    try {
      const headers = await this.getHeaders(bConfig);

      const response = await fetch(`${this.getBaseUrl(bConfig.project_id)}/queries`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          query: 'SELECT 1',
          useLegacySql: false,
          maxResults: 1,
        }),
      });

      if (response.ok) {
        return { success: true, message: 'Connected to BigQuery successfully' };
      }

      return {
        success: false,
        message: `BigQuery returned status ${response.status}: ${response.statusText}`,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      return { success: false, message: `Failed to connect to BigQuery: ${message}` };
    }
  }

  async fetchMetric(
    metric: string,
    timeRange: TimeRange,
    segment?: Record<string, string>,
    config?: ConnectorConfig,
  ): Promise<MetricValue> {
    const bConfig = config as BigQueryConfig;
    const headers = await this.getHeaders(bConfig);

    const dateColumn = bConfig.date_column || 'created_at';
    const metricColumn = bConfig.metric_column || metric;
    const table = `\`${bConfig.project_id}.${bConfig.dataset}.${bConfig.table}\``;

    let whereClause = `WHERE ${dateColumn} >= @start_date AND ${dateColumn} <= @end_date`;

    const queryParams: Array<{
      name: string;
      parameterType: { type: string };
      parameterValue: { value: string };
    }> = [
      {
        name: 'start_date',
        parameterType: { type: 'TIMESTAMP' },
        parameterValue: { value: timeRange.start.toISOString() },
      },
      {
        name: 'end_date',
        parameterType: { type: 'TIMESTAMP' },
        parameterValue: { value: timeRange.end.toISOString() },
      },
    ];

    if (segment) {
      for (const [key, value] of Object.entries(segment)) {
        whereClause += ` AND ${key} = @seg_${key}`;
        queryParams.push({
          name: `seg_${key}`,
          parameterType: { type: 'STRING' },
          parameterValue: { value },
        });
      }
    }

    const sql = `SELECT SUM(${metricColumn}) AS metric_value, COUNT(*) AS sample_size FROM ${table} ${whereClause}`;

    const response = await fetch(`${this.getBaseUrl(bConfig.project_id)}/queries`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        query: sql,
        useLegacySql: false,
        parameterMode: 'NAMED',
        queryParameters: queryParams,
      }),
    });

    if (!response.ok) {
      throw new Error(`BigQuery API error: ${response.status} ${response.statusText}`);
    }

    const data = (await response.json()) as {
      rows?: Array<{ f: Array<{ v: string | null }> }>;
    };

    const row = data.rows?.[0];
    const value = row?.f?.[0]?.v ? parseFloat(row.f[0].v) : 0;
    const sampleSize = row?.f?.[1]?.v ? parseInt(row.f[1].v, 10) : 0;

    return {
      value,
      sample_size: sampleSize,
      timestamp: new Date(),
    };
  }

  async fetchVariantMetric(
    metric: string,
    variantKey: string,
    timeRange: TimeRange,
    config?: ConnectorConfig,
  ): Promise<VariantMetricValue> {
    const bConfig = config as BigQueryConfig;
    const variantColumn = bConfig.variant_column || variantKey;

    const [control, treatment] = await Promise.all([
      this.fetchMetric(
        metric,
        timeRange,
        { [variantColumn]: 'control' },
        config,
      ),
      this.fetchMetric(
        metric,
        timeRange,
        { [variantColumn]: 'treatment' },
        config,
      ),
    ]);

    return { control, treatment };
  }

  async listMetrics(_config: ConnectorConfig): Promise<MetricDefinition[]> {
    // BigQuery uses custom SQL queries, so metrics are not discoverable.
    return [];
  }
}
