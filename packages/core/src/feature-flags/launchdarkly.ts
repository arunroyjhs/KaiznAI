import type { FeatureFlagService, FeatureFlag, Segment } from './interface.js';

interface LaunchDarklyConfig {
  sdkKey: string;
  apiKey: string;
  projectKey: string;
  environmentKey: string;
}

export class LaunchDarklyFlagService implements FeatureFlagService {
  private baseUrl = 'https://app.launchdarkly.com/api/v2';

  constructor(private config: LaunchDarklyConfig) {}

  async createFlag(key: string, description: string): Promise<FeatureFlag> {
    const response = await fetch(
      `${this.baseUrl}/flags/${this.config.projectKey}`,
      {
        method: 'POST',
        headers: this.headers(),
        body: JSON.stringify({
          key,
          name: key,
          description,
          variations: [
            { value: 'control', name: 'Control' },
            { value: 'treatment', name: 'Treatment' },
          ],
          defaults: {
            onVariation: 1,
            offVariation: 0,
          },
        }),
      },
    );

    if (!response.ok) {
      throw new Error(`LaunchDarkly createFlag failed: ${response.statusText}`);
    }

    const data = await response.json();
    return this.toFeatureFlag(data);
  }

  async setRolloutPercentage(key: string, percentage: number, segment?: Segment): Promise<void> {
    const instructions = [];

    if (segment) {
      instructions.push({
        kind: 'addRule',
        clauses: [
          {
            attribute: segment.key,
            op: 'in',
            values: segment.values,
          },
        ],
        rolloutWeights: {
          control: Math.round((100 - percentage) * 1000),
          treatment: Math.round(percentage * 1000),
        },
      });
    } else {
      instructions.push({
        kind: 'updateFallthroughVariationOrRollout',
        rolloutWeights: {
          control: Math.round((100 - percentage) * 1000),
          treatment: Math.round(percentage * 1000),
        },
      });
    }

    const response = await fetch(
      `${this.baseUrl}/flags/${this.config.projectKey}/${key}`,
      {
        method: 'PATCH',
        headers: {
          ...this.headers(),
          'Content-Type': 'application/json; domain-model=launchdarkly.semanticpatch',
        },
        body: JSON.stringify({
          environmentKey: this.config.environmentKey,
          instructions,
        }),
      },
    );

    if (!response.ok) {
      throw new Error(`LaunchDarkly setRolloutPercentage failed: ${response.statusText}`);
    }
  }

  async killFlag(key: string): Promise<void> {
    const response = await fetch(
      `${this.baseUrl}/flags/${this.config.projectKey}/${key}`,
      {
        method: 'PATCH',
        headers: {
          ...this.headers(),
          'Content-Type': 'application/json; domain-model=launchdarkly.semanticpatch',
        },
        body: JSON.stringify({
          environmentKey: this.config.environmentKey,
          instructions: [{ kind: 'turnFlagOff' }],
        }),
      },
    );

    if (!response.ok) {
      throw new Error(`LaunchDarkly killFlag failed: ${response.statusText}`);
    }
  }

  async getVariantForUser(key: string, userId: string): Promise<'control' | 'treatment'> {
    // Server-side evaluation requires the LaunchDarkly SDK
    // For API-based evaluation, use the evaluation endpoint
    const response = await fetch(
      `${this.baseUrl}/flags/${this.config.projectKey}/${key}/eval/${this.config.environmentKey}/users/${userId}`,
      {
        headers: this.headers(),
      },
    );

    if (!response.ok) {
      return 'control'; // Default to control on error
    }

    const data = await response.json();
    return data.value === 'treatment' ? 'treatment' : 'control';
  }

  async getFlag(key: string): Promise<FeatureFlag | null> {
    const response = await fetch(
      `${this.baseUrl}/flags/${this.config.projectKey}/${key}`,
      { headers: this.headers() },
    );

    if (response.status === 404) return null;
    if (!response.ok) {
      throw new Error(`LaunchDarkly getFlag failed: ${response.statusText}`);
    }

    const data = await response.json();
    return this.toFeatureFlag(data);
  }

  async deleteFlag(key: string): Promise<void> {
    const response = await fetch(
      `${this.baseUrl}/flags/${this.config.projectKey}/${key}`,
      { method: 'DELETE', headers: this.headers() },
    );

    if (!response.ok && response.status !== 404) {
      throw new Error(`LaunchDarkly deleteFlag failed: ${response.statusText}`);
    }
  }

  private headers(): Record<string, string> {
    return {
      Authorization: this.config.apiKey,
      'Content-Type': 'application/json',
    };
  }

  private toFeatureFlag(data: Record<string, unknown>): FeatureFlag {
    const environments = data.environments as Record<string, Record<string, unknown>> | undefined;
    const env = environments?.[this.config.environmentKey];

    return {
      key: data.key as string,
      description: (data.description as string) ?? '',
      enabled: (env?.on as boolean) ?? false,
      rolloutPercentage: 0,
      variants: ['control', 'treatment'],
      createdAt: new Date((data.creationDate as number) ?? Date.now()),
    };
  }
}
