import type {
  SignalConnector,
  ConnectorConfig,
  TimeRange,
  MetricValue,
  VariantMetricValue,
  MetricDefinition,
  ConnectionResult,
} from '@outcome-runtime/signal-collector/connectors/base.js';

interface GA4Config extends ConnectorConfig {
  property_id: string;
  service_account_json: string;
}

interface ServiceAccountCredentials {
  client_email: string;
  private_key: string;
  token_uri: string;
}

export class GA4Connector implements SignalConnector {
  readonly name = 'ga4';

  private getDataApiUrl(propertyId: string): string {
    return `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`;
  }

  private getMetadataUrl(propertyId: string): string {
    return `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}/metadata`;
  }

  private parseServiceAccount(config: GA4Config): ServiceAccountCredentials {
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
        scope: 'https://www.googleapis.com/auth/analytics.readonly',
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

  private async getHeaders(config: GA4Config): Promise<Record<string, string>> {
    const credentials = this.parseServiceAccount(config);
    const token = await this.getAccessToken(credentials);
    return {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };
  }

  async testConnection(config: ConnectorConfig): Promise<ConnectionResult> {
    const gConfig = config as GA4Config;
    try {
      const headers = await this.getHeaders(gConfig);
      const today = new Date().toISOString().split('T')[0]!;

      const response = await fetch(this.getDataApiUrl(gConfig.property_id), {
        method: 'POST',
        headers,
        body: JSON.stringify({
          dateRanges: [{ startDate: today, endDate: today }],
          metrics: [{ name: 'activeUsers' }],
          limit: 1,
        }),
      });

      if (response.ok) {
        return { success: true, message: 'Connected to Google Analytics 4 successfully' };
      }

      return {
        success: false,
        message: `GA4 returned status ${response.status}: ${response.statusText}`,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      return { success: false, message: `Failed to connect to GA4: ${message}` };
    }
  }

  async fetchMetric(
    metric: string,
    timeRange: TimeRange,
    segment?: Record<string, string>,
    config?: ConnectorConfig,
  ): Promise<MetricValue> {
    const gConfig = config as GA4Config;
    const headers = await this.getHeaders(gConfig);

    const body: Record<string, unknown> = {
      dateRanges: [
        {
          startDate: timeRange.start.toISOString().split('T')[0]!,
          endDate: timeRange.end.toISOString().split('T')[0]!,
        },
      ],
      metrics: [{ name: metric }],
    };

    if (segment) {
      body.dimensionFilter = this.buildDimensionFilter(segment);
    }

    const response = await fetch(this.getDataApiUrl(gConfig.property_id), {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(`GA4 API error: ${response.status} ${response.statusText}`);
    }

    const data = (await response.json()) as {
      rows?: Array<{ metricValues: Array<{ value: string }> }>;
      rowCount?: number;
    };

    const value = this.extractMetricValue(data);

    return {
      value,
      sample_size: data.rowCount,
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
    const gConfig = config as GA4Config;
    const headers = await this.getHeaders(gConfig);

    const response = await fetch(this.getMetadataUrl(gConfig.property_id), {
      headers,
    });

    if (!response.ok) {
      throw new Error(`GA4 API error: ${response.status}`);
    }

    const data = (await response.json()) as {
      metrics: Array<{
        apiName: string;
        uiName: string;
        description?: string;
        type?: string;
      }>;
    };

    return data.metrics.map((m) => ({
      name: m.apiName,
      type: 'custom' as const,
      description: m.description || m.uiName,
    }));
  }

  private buildDimensionFilter(
    segment: Record<string, string>,
  ): Record<string, unknown> {
    const filters = Object.entries(segment).map(([key, value]) => ({
      filter: {
        fieldName: key,
        stringFilter: {
          matchType: 'EXACT',
          value,
        },
      },
    }));

    if (filters.length === 1) {
      return filters[0]!;
    }

    return {
      andGroup: { expressions: filters },
    };
  }

  private extractMetricValue(data: {
    rows?: Array<{ metricValues: Array<{ value: string }> }>;
  }): number {
    if (data.rows && data.rows.length > 0) {
      const firstRow = data.rows[0]!;
      if (firstRow.metricValues && firstRow.metricValues.length > 0) {
        return parseFloat(firstRow.metricValues[0]!.value) || 0;
      }
    }
    return 0;
  }
}
