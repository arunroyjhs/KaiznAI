export const OutcomeStatus = {
  DRAFT: 'draft',
  ACTIVE: 'active',
  ACHIEVED: 'achieved',
  ABANDONED: 'abandoned',
  EXPIRED: 'expired',
} as const;
export type OutcomeStatus = (typeof OutcomeStatus)[keyof typeof OutcomeStatus];

export const ExperimentStatus = {
  HYPOTHESIS: 'hypothesis',
  AWAITING_PORTFOLIO_GATE: 'awaiting_portfolio_gate',
  BUILDING: 'building',
  AWAITING_LAUNCH_GATE: 'awaiting_launch_gate',
  RUNNING: 'running',
  MEASURING: 'measuring',
  AWAITING_ANALYSIS_GATE: 'awaiting_analysis_gate',
  SCALING: 'scaling',
  AWAITING_SCALE_GATE: 'awaiting_scale_gate',
  KILLED: 'killed',
  SHIPPED: 'shipped',
  FAILED_BUILD: 'failed_build',
} as const;
export type ExperimentStatus = (typeof ExperimentStatus)[keyof typeof ExperimentStatus];

export const GateType = {
  PORTFOLIO_REVIEW: 'portfolio_review',
  LAUNCH_APPROVAL: 'launch_approval',
  ANALYSIS_REVIEW: 'analysis_review',
  SCALE_APPROVAL: 'scale_approval',
  SHIP_APPROVAL: 'ship_approval',
} as const;
export type GateType = (typeof GateType)[keyof typeof GateType];

export const GateStatus = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  APPROVED_WITH_CONDITIONS: 'approved_with_conditions',
  DELEGATED: 'delegated',
  TIMED_OUT: 'timed_out',
} as const;
export type GateStatus = (typeof GateStatus)[keyof typeof GateStatus];

export const LLMPurpose = {
  HYPOTHESIS_GENERATION: 'hypothesis_generation',
  HYPOTHESIS_SCORING: 'hypothesis_scoring',
  ANALYSIS: 'analysis',
  VIBE_CHECK: 'vibe_check',
  CONTEXT_SUMMARIZATION: 'context_summarization',
  DECISION_SYNTHESIS: 'decision_synthesis',
} as const;
export type LLMPurpose = (typeof LLMPurpose)[keyof typeof LLMPurpose];

export const SignalDirection = {
  INCREASE: 'increase',
  DECREASE: 'decrease',
} as const;
export type SignalDirection = (typeof SignalDirection)[keyof typeof SignalDirection];

export const LearningType = {
  CONFIRMED_HYPOTHESIS: 'confirmed_hypothesis',
  REFUTED_HYPOTHESIS: 'refuted_hypothesis',
  UNEXPECTED_EFFECT: 'unexpected_effect',
  SEGMENT_INSIGHT: 'segment_insight',
  CONSTRAINT_DISCOVERED: 'constraint_discovered',
  METHODOLOGY_LEARNING: 'methodology_learning',
} as const;
export type LearningType = (typeof LearningType)[keyof typeof LearningType];

export const AuthMode = {
  API_KEY: 'api_key',
  OAUTH_ACCOUNT: 'oauth_account',
} as const;
export type AuthMode = (typeof AuthMode)[keyof typeof AuthMode];

export const ProviderSlug = {
  ANTHROPIC: 'anthropic',
  OPENAI: 'openai',
  PERPLEXITY: 'perplexity',
} as const;
export type ProviderSlug = (typeof ProviderSlug)[keyof typeof ProviderSlug];
