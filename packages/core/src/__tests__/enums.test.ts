import { describe, it, expect } from 'vitest';
import {
  OutcomeStatus,
  ExperimentStatus,
  GateType,
  GateStatus,
  LLMPurpose,
  SignalDirection,
  LearningType,
  AuthMode,
  ProviderSlug,
} from '../types/enums.js';

describe('OutcomeStatus', () => {
  it('should have exactly 5 values', () => {
    expect(Object.keys(OutcomeStatus)).toHaveLength(5);
  });

  it('should have correct DRAFT value', () => {
    expect(OutcomeStatus.DRAFT).toBe('draft');
  });

  it('should have correct ACTIVE value', () => {
    expect(OutcomeStatus.ACTIVE).toBe('active');
  });

  it('should have correct ACHIEVED value', () => {
    expect(OutcomeStatus.ACHIEVED).toBe('achieved');
  });

  it('should have correct ABANDONED value', () => {
    expect(OutcomeStatus.ABANDONED).toBe('abandoned');
  });

  it('should have correct EXPIRED value', () => {
    expect(OutcomeStatus.EXPIRED).toBe('expired');
  });

  it('should contain all expected keys', () => {
    expect(Object.keys(OutcomeStatus)).toEqual(
      expect.arrayContaining(['DRAFT', 'ACTIVE', 'ACHIEVED', 'ABANDONED', 'EXPIRED']),
    );
  });

  it('should contain all expected values', () => {
    expect(Object.values(OutcomeStatus)).toEqual(
      expect.arrayContaining(['draft', 'active', 'achieved', 'abandoned', 'expired']),
    );
  });
});

describe('ExperimentStatus', () => {
  it('should have exactly 12 values', () => {
    expect(Object.keys(ExperimentStatus)).toHaveLength(12);
  });

  it('should have correct HYPOTHESIS value', () => {
    expect(ExperimentStatus.HYPOTHESIS).toBe('hypothesis');
  });

  it('should have correct AWAITING_PORTFOLIO_GATE value', () => {
    expect(ExperimentStatus.AWAITING_PORTFOLIO_GATE).toBe('awaiting_portfolio_gate');
  });

  it('should have correct BUILDING value', () => {
    expect(ExperimentStatus.BUILDING).toBe('building');
  });

  it('should have correct AWAITING_LAUNCH_GATE value', () => {
    expect(ExperimentStatus.AWAITING_LAUNCH_GATE).toBe('awaiting_launch_gate');
  });

  it('should have correct RUNNING value', () => {
    expect(ExperimentStatus.RUNNING).toBe('running');
  });

  it('should have correct MEASURING value', () => {
    expect(ExperimentStatus.MEASURING).toBe('measuring');
  });

  it('should have correct AWAITING_ANALYSIS_GATE value', () => {
    expect(ExperimentStatus.AWAITING_ANALYSIS_GATE).toBe('awaiting_analysis_gate');
  });

  it('should have correct SCALING value', () => {
    expect(ExperimentStatus.SCALING).toBe('scaling');
  });

  it('should have correct AWAITING_SCALE_GATE value', () => {
    expect(ExperimentStatus.AWAITING_SCALE_GATE).toBe('awaiting_scale_gate');
  });

  it('should have correct KILLED value', () => {
    expect(ExperimentStatus.KILLED).toBe('killed');
  });

  it('should have correct SHIPPED value', () => {
    expect(ExperimentStatus.SHIPPED).toBe('shipped');
  });

  it('should have correct FAILED_BUILD value', () => {
    expect(ExperimentStatus.FAILED_BUILD).toBe('failed_build');
  });

  it('should contain all expected keys', () => {
    const expectedKeys = [
      'HYPOTHESIS', 'AWAITING_PORTFOLIO_GATE', 'BUILDING', 'AWAITING_LAUNCH_GATE',
      'RUNNING', 'MEASURING', 'AWAITING_ANALYSIS_GATE', 'SCALING',
      'AWAITING_SCALE_GATE', 'KILLED', 'SHIPPED', 'FAILED_BUILD',
    ];
    expect(Object.keys(ExperimentStatus)).toEqual(expect.arrayContaining(expectedKeys));
  });
});

describe('GateType', () => {
  it('should have exactly 5 values', () => {
    expect(Object.keys(GateType)).toHaveLength(5);
  });

  it('should have correct PORTFOLIO_REVIEW value', () => {
    expect(GateType.PORTFOLIO_REVIEW).toBe('portfolio_review');
  });

  it('should have correct LAUNCH_APPROVAL value', () => {
    expect(GateType.LAUNCH_APPROVAL).toBe('launch_approval');
  });

  it('should have correct ANALYSIS_REVIEW value', () => {
    expect(GateType.ANALYSIS_REVIEW).toBe('analysis_review');
  });

  it('should have correct SCALE_APPROVAL value', () => {
    expect(GateType.SCALE_APPROVAL).toBe('scale_approval');
  });

  it('should have correct SHIP_APPROVAL value', () => {
    expect(GateType.SHIP_APPROVAL).toBe('ship_approval');
  });
});

describe('GateStatus', () => {
  it('should have exactly 6 values', () => {
    expect(Object.keys(GateStatus)).toHaveLength(6);
  });

  it('should have correct PENDING value', () => {
    expect(GateStatus.PENDING).toBe('pending');
  });

  it('should have correct APPROVED value', () => {
    expect(GateStatus.APPROVED).toBe('approved');
  });

  it('should have correct REJECTED value', () => {
    expect(GateStatus.REJECTED).toBe('rejected');
  });

  it('should have correct APPROVED_WITH_CONDITIONS value', () => {
    expect(GateStatus.APPROVED_WITH_CONDITIONS).toBe('approved_with_conditions');
  });

  it('should have correct DELEGATED value', () => {
    expect(GateStatus.DELEGATED).toBe('delegated');
  });

  it('should have correct TIMED_OUT value', () => {
    expect(GateStatus.TIMED_OUT).toBe('timed_out');
  });
});

describe('LLMPurpose', () => {
  it('should have exactly 6 values', () => {
    expect(Object.keys(LLMPurpose)).toHaveLength(6);
  });

  it('should have correct HYPOTHESIS_GENERATION value', () => {
    expect(LLMPurpose.HYPOTHESIS_GENERATION).toBe('hypothesis_generation');
  });

  it('should have correct HYPOTHESIS_SCORING value', () => {
    expect(LLMPurpose.HYPOTHESIS_SCORING).toBe('hypothesis_scoring');
  });

  it('should have correct ANALYSIS value', () => {
    expect(LLMPurpose.ANALYSIS).toBe('analysis');
  });

  it('should have correct VIBE_CHECK value', () => {
    expect(LLMPurpose.VIBE_CHECK).toBe('vibe_check');
  });

  it('should have correct CONTEXT_SUMMARIZATION value', () => {
    expect(LLMPurpose.CONTEXT_SUMMARIZATION).toBe('context_summarization');
  });

  it('should have correct DECISION_SYNTHESIS value', () => {
    expect(LLMPurpose.DECISION_SYNTHESIS).toBe('decision_synthesis');
  });
});

describe('SignalDirection', () => {
  it('should have exactly 2 values', () => {
    expect(Object.keys(SignalDirection)).toHaveLength(2);
  });

  it('should have correct INCREASE value', () => {
    expect(SignalDirection.INCREASE).toBe('increase');
  });

  it('should have correct DECREASE value', () => {
    expect(SignalDirection.DECREASE).toBe('decrease');
  });
});

describe('LearningType', () => {
  it('should have exactly 6 values', () => {
    expect(Object.keys(LearningType)).toHaveLength(6);
  });

  it('should have correct CONFIRMED_HYPOTHESIS value', () => {
    expect(LearningType.CONFIRMED_HYPOTHESIS).toBe('confirmed_hypothesis');
  });

  it('should have correct REFUTED_HYPOTHESIS value', () => {
    expect(LearningType.REFUTED_HYPOTHESIS).toBe('refuted_hypothesis');
  });

  it('should have correct UNEXPECTED_EFFECT value', () => {
    expect(LearningType.UNEXPECTED_EFFECT).toBe('unexpected_effect');
  });

  it('should have correct SEGMENT_INSIGHT value', () => {
    expect(LearningType.SEGMENT_INSIGHT).toBe('segment_insight');
  });

  it('should have correct CONSTRAINT_DISCOVERED value', () => {
    expect(LearningType.CONSTRAINT_DISCOVERED).toBe('constraint_discovered');
  });

  it('should have correct METHODOLOGY_LEARNING value', () => {
    expect(LearningType.METHODOLOGY_LEARNING).toBe('methodology_learning');
  });
});

describe('AuthMode', () => {
  it('should have exactly 2 values', () => {
    expect(Object.keys(AuthMode)).toHaveLength(2);
  });

  it('should have correct API_KEY value', () => {
    expect(AuthMode.API_KEY).toBe('api_key');
  });

  it('should have correct OAUTH_ACCOUNT value', () => {
    expect(AuthMode.OAUTH_ACCOUNT).toBe('oauth_account');
  });
});

describe('ProviderSlug', () => {
  it('should have exactly 3 values', () => {
    expect(Object.keys(ProviderSlug)).toHaveLength(3);
  });

  it('should have correct ANTHROPIC value', () => {
    expect(ProviderSlug.ANTHROPIC).toBe('anthropic');
  });

  it('should have correct OPENAI value', () => {
    expect(ProviderSlug.OPENAI).toBe('openai');
  });

  it('should have correct PERPLEXITY value', () => {
    expect(ProviderSlug.PERPLEXITY).toBe('perplexity');
  });
});
