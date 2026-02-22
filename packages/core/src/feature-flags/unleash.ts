import type { FeatureFlagService, FeatureFlag, Segment } from './interface.js';

interface UnleashConfig {
  apiUrl: string;
  apiToken: string;
  projectId?: string;
}

export class UnleashFlagService implements FeatureFlagService {
  constructor(private config: UnleashConfig) {}

  async createFlag(key: string, description: string): Promise<FeatureFlag> {
    const projectId = this.config.projectId ?? 'default';

    const response = await fetch(
      `${this.config.apiUrl}/api/admin/projects/${projectId}/features`,
      {
        method: 'POST',
        headers: this.headers(),
        body: JSON.stringify({
          name: key,
          description,
          type: 'experiment',
        }),
      },
    );

    if (!response.ok) {
      throw new Error(`Unleash createFlag failed: ${response.statusText}`);
    }

    // Add variants for A/B testing
    await fetch(
      `${this.config.apiUrl}/api/admin/projects/${projectId}/features/${key}/variants`,
      {
        method: 'PUT',
        headers: this.headers(),
        body: JSON.stringify([
          { name: 'control', weight: 500, stickiness: 'userId' },
          { name: 'treatment', weight: 500, stickiness: 'userId' },
        ]),
      },
    );

    return {
      key,
      description,
      enabled: false,
      rolloutPercentage: 50,
      variants: ['control', 'treatment'],
      createdAt: new Date(),
    };
  }

  async setRolloutPercentage(key: string, percentage: number, _segment?: Segment): Promise<void> {
    const projectId = this.config.projectId ?? 'default';

    // Update variants with new weights
    const treatmentWeight = Math.round(percentage * 10);
    const controlWeight = 1000 - treatmentWeight;

    await fetch(
      `${this.config.apiUrl}/api/admin/projects/${projectId}/features/${key}/variants`,
      {
        method: 'PUT',
        headers: this.headers(),
        body: JSON.stringify([
          { name: 'control', weight: controlWeight, stickiness: 'userId' },
          { name: 'treatment', weight: treatmentWeight, stickiness: 'userId' },
        ]),
      },
    );

    // Enable the toggle with gradual rollout
    const environments = await this.getEnvironments(projectId);
    for (const env of environments) {
      await fetch(
        `${this.config.apiUrl}/api/admin/projects/${projectId}/features/${key}/environments/${env}/strategies`,
        {
          method: 'POST',
          headers: this.headers(),
          body: JSON.stringify({
            name: 'flexibleRollout',
            parameters: {
              rollout: String(percentage),
              stickiness: 'userId',
            },
          }),
        },
      );
    }
  }

  async killFlag(key: string): Promise<void> {
    const projectId = this.config.projectId ?? 'default';
    const environments = await this.getEnvironments(projectId);

    for (const env of environments) {
      await fetch(
        `${this.config.apiUrl}/api/admin/projects/${projectId}/features/${key}/environments/${env}/off`,
        {
          method: 'POST',
          headers: this.headers(),
        },
      );
    }
  }

  async getVariantForUser(key: string, userId: string): Promise<'control' | 'treatment'> {
    const response = await fetch(
      `${this.config.apiUrl}/api/client/features/${key}`,
      {
        headers: {
          ...this.headers(),
          'Unleash-AppName': 'outcome-runtime',
          'Unleash-InstanceId': userId,
        },
      },
    );

    if (!response.ok) return 'control';

    const data = await response.json();
    const variant = data.variant?.name;
    return variant === 'treatment' ? 'treatment' : 'control';
  }

  async getFlag(key: string): Promise<FeatureFlag | null> {
    const projectId = this.config.projectId ?? 'default';

    const response = await fetch(
      `${this.config.apiUrl}/api/admin/projects/${projectId}/features/${key}`,
      { headers: this.headers() },
    );

    if (response.status === 404) return null;
    if (!response.ok) {
      throw new Error(`Unleash getFlag failed: ${response.statusText}`);
    }

    const data = await response.json();
    return {
      key: data.name,
      description: data.description ?? '',
      enabled: data.enabled ?? false,
      rolloutPercentage: 0,
      variants: (data.variants ?? []).map((v: { name: string }) => v.name),
      createdAt: new Date(data.createdAt ?? Date.now()),
    };
  }

  async deleteFlag(key: string): Promise<void> {
    const projectId = this.config.projectId ?? 'default';

    const response = await fetch(
      `${this.config.apiUrl}/api/admin/projects/${projectId}/features/${key}`,
      { method: 'DELETE', headers: this.headers() },
    );

    if (!response.ok && response.status !== 404) {
      throw new Error(`Unleash deleteFlag failed: ${response.statusText}`);
    }
  }

  private headers(): Record<string, string> {
    return {
      Authorization: `*:*.${this.config.apiToken}`,
      'Content-Type': 'application/json',
    };
  }

  private async getEnvironments(projectId: string): Promise<string[]> {
    const response = await fetch(
      `${this.config.apiUrl}/api/admin/projects/${projectId}`,
      { headers: this.headers() },
    );

    if (!response.ok) return ['development'];

    const data = await response.json();
    return (data.environments ?? []).map((e: { environment: string }) => e.environment);
  }
}
