export interface Segment {
  key: string;
  values: string[];
}

export interface FeatureFlag {
  key: string;
  description: string;
  enabled: boolean;
  rolloutPercentage: number;
  variants: string[];
  createdAt: Date;
}

export interface FeatureFlagService {
  createFlag(key: string, description: string): Promise<FeatureFlag>;
  setRolloutPercentage(key: string, percentage: number, segment?: Segment): Promise<void>;
  killFlag(key: string): Promise<void>;
  getVariantForUser(key: string, userId: string): Promise<'control' | 'treatment'>;
  getFlag(key: string): Promise<FeatureFlag | null>;
  deleteFlag(key: string): Promise<void>;
}
