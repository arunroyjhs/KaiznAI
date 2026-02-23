import type { OutcomeStatus, ExperimentStatus, GateType, GateStatus, SignalDirection, LearningType, ProviderSlug, AuthMode } from './enums.js';

export interface PrimarySignal {
  source: string;
  metric: string;
  method: 'funnel' | 'event' | 'custom';
  funnel_steps?: string[];
  segment?: Record<string, string>;
  aggregation: 'point' | '7d_rolling' | '30d_rolling';
  current_value?: number;
  unit?: string;
  connector_config?: Record<string, unknown>;
}

export interface Target {
  direction: SignalDirection;
  from?: number;
  to: number;
  confidence_required: number;
}

export interface Constraint {
  signal?: string;
  min?: number;
  max?: number;
  rule?: string;
  source?: string;
  metric?: string;
}

export interface GateConfig {
  assigned_to: string;
  sla: string;
  channel?: string;
}

export interface ScopeConfig {
  allowed_paths: string[];
  forbidden_paths: string[];
}

export interface Prediction {
  signal: string;
  expected_delta: number;
  delta_range: [number, number];
  confidence: number;
}

export interface Intervention {
  type: 'code_change' | 'config_change' | 'copy_change';
  scope: string;
  description: string;
  feature_flag?: string;
}

export interface MeasurementPlan {
  duration_days: number;
  min_sample_size: number;
  success_threshold: number;
  kill_threshold: number;
  segments?: string[];
  confidence_required?: number;
}

export interface RolloutPlan {
  initial_pct: number;
  scale_to_pct: number;
  scale_trigger?: string;
  segments?: string[];
}

export interface ExperimentResult {
  delta: number;
  ci_lower: number;
  ci_upper: number;
  p_value: number;
  sample_size: number;
  significant: boolean;
  conclusion?: string;
}

export interface Outcome {
  id: string;
  slug: string;
  title: string;
  description?: string;
  status: OutcomeStatus;
  primarySignal: PrimarySignal;
  secondarySignals: PrimarySignal[];
  target: Target;
  constraints: Constraint[];
  maxConcurrentExperiments: number;
  horizon: string;
  deadline?: Date;
  owner: string;
  teamMembers: string[];
  orgId: string;
  workspaceId?: string;
  createdAt: Date;
  updatedAt: Date;
  activatedAt?: Date;
  achievedAt?: Date;
}

export interface Experiment {
  id: string;
  outcomeId: string;
  title: string;
  hypothesis: string;
  mechanism: string;
  prediction: Prediction;
  intervention: Intervention;
  measurementPlan: MeasurementPlan;
  rolloutPlan: RolloutPlan;
  baselineValue?: number;
  baselineCapturedAt?: Date;
  generatedBy: 'ai' | 'human' | 'hybrid';
  agentId?: string;
  agentRuntime?: string;
  featureFlagKey?: string;
  status: ExperimentStatus;
  currentResult?: ExperimentResult;
  finalResult?: ExperimentResult;
  learnings?: string;
  orgId: string;
  createdAt: Date;
  updatedAt: Date;
  launchedAt?: Date;
  concludedAt?: Date;
}

export interface HumanGate {
  id: string;
  experimentId: string;
  outcomeId: string;
  gateType: GateType;
  contextPackage: Record<string, unknown>;
  question: string;
  signalSnapshot?: Record<string, unknown>;
  options?: Record<string, unknown>;
  assignedTo: string;
  escalationChain: string[];
  slaHours: number;
  status: GateStatus;
  conditions: string[];
  responseNote?: string;
  decidedBy?: string;
  notificationSentAt?: Date;
  reminderSentAt?: Date;
  createdAt: Date;
  respondedAt?: Date;
  orgId: string;
}

export interface Learning {
  id: string;
  experimentId?: string;
  outcomeId?: string;
  finding: string;
  findingType: LearningType;
  signalEvidence?: Record<string, unknown>;
  confidence: number;
  appliesTo: string[];
  embedding?: number[];
  orgId: string;
  createdAt: Date;
}

export interface Org {
  id: string;
  name: string;
  slug: string;
  plan: 'free' | 'pro' | 'enterprise';
  createdAt: Date;
}

export interface Workspace {
  id: string;
  orgId: string;
  name: string;
  outcomeYamlPath?: string;
  createdAt: Date;
}

export interface LLMProviderConfig {
  id: string;
  orgId: string;
  provider: ProviderSlug;
  authMode: AuthMode;
  encryptedApiKey?: string;
  keyHint?: string;
  oauthAccessToken?: string;
  oauthRefreshToken?: string;
  oauthExpiresAt?: Date;
  oauthScopes?: string[];
  accountEmail?: string;
  preferredModel?: string;
  fallbackModel?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
