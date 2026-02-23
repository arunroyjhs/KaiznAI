import { describe, it, expect } from 'vitest';
import { subProblemSchema, experimentCandidateSchema } from '../schemas.js';

// ---------------------------------------------------------------------------
// Helpers — valid data factories
// ---------------------------------------------------------------------------

function validSubProblem() {
  return {
    id: 'sp-1',
    description: 'Reduce checkout drop-off',
    metric_lever: 'conversion_rate',
    estimated_impact: 0.15,
    evidence: 'Funnel analysis shows 40% drop at payment step',
  };
}

function validExperimentCandidate() {
  return {
    title: 'Simplify payment form',
    hypothesis: 'Reducing form fields will increase checkout completion',
    mechanism: 'Less cognitive load means fewer abandonments',
    prediction: {
      signal: 'checkout_completion_rate',
      expected_delta: 0.05,
      delta_range: [0.02, 0.08] as [number, number],
      confidence: 0.75,
    },
    intervention: {
      type: 'code_change' as const,
      scope: 'checkout',
      description: 'Remove address line 2 and phone number fields',
    },
    measurement_plan: {
      duration_days: 14,
      min_sample_size: 5000,
      success_threshold: 0.03,
      kill_threshold: -0.02,
    },
    rollout_plan: {
      initial_pct: 10,
      scale_to_pct: 100,
    },
    effort_hours: 8,
    risk_level: 'low' as const,
    reversible: true,
    sub_problem_id: 'sp-1',
  };
}

// ---------------------------------------------------------------------------
// subProblemSchema
// ---------------------------------------------------------------------------

describe('subProblemSchema', () => {
  it('accepts a valid sub-problem', () => {
    const result = subProblemSchema.safeParse(validSubProblem());
    expect(result.success).toBe(true);
  });

  it('rejects when id is missing', () => {
    const data = { ...validSubProblem() };
    delete (data as Record<string, unknown>).id;
    const result = subProblemSchema.safeParse(data);
    expect(result.success).toBe(false);
  });

  it('rejects when description is missing', () => {
    const data = { ...validSubProblem() };
    delete (data as Record<string, unknown>).description;
    const result = subProblemSchema.safeParse(data);
    expect(result.success).toBe(false);
  });

  it('rejects when metric_lever is missing', () => {
    const data = { ...validSubProblem() };
    delete (data as Record<string, unknown>).metric_lever;
    const result = subProblemSchema.safeParse(data);
    expect(result.success).toBe(false);
  });

  it('rejects when estimated_impact is missing', () => {
    const data = { ...validSubProblem() };
    delete (data as Record<string, unknown>).estimated_impact;
    const result = subProblemSchema.safeParse(data);
    expect(result.success).toBe(false);
  });

  it('rejects when evidence is missing', () => {
    const data = { ...validSubProblem() };
    delete (data as Record<string, unknown>).evidence;
    const result = subProblemSchema.safeParse(data);
    expect(result.success).toBe(false);
  });

  it('rejects when estimated_impact is a string', () => {
    const data = { ...validSubProblem(), estimated_impact: 'high' };
    const result = subProblemSchema.safeParse(data);
    expect(result.success).toBe(false);
  });

  it('rejects when id is a number', () => {
    const data = { ...validSubProblem(), id: 42 };
    const result = subProblemSchema.safeParse(data);
    expect(result.success).toBe(false);
  });

  it('accepts numeric estimated_impact values including zero and negatives', () => {
    expect(subProblemSchema.safeParse({ ...validSubProblem(), estimated_impact: 0 }).success).toBe(true);
    expect(subProblemSchema.safeParse({ ...validSubProblem(), estimated_impact: -0.5 }).success).toBe(true);
    expect(subProblemSchema.safeParse({ ...validSubProblem(), estimated_impact: 1.0 }).success).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// experimentCandidateSchema
// ---------------------------------------------------------------------------

describe('experimentCandidateSchema', () => {
  // --- Valid data ---
  it('accepts a fully valid experiment candidate', () => {
    const result = experimentCandidateSchema.safeParse(validExperimentCandidate());
    expect(result.success).toBe(true);
  });

  it('accepts candidate with optional fields present', () => {
    const data = {
      ...validExperimentCandidate(),
      intervention: {
        ...validExperimentCandidate().intervention,
        feature_flag: 'ff_simplified_checkout',
      },
      measurement_plan: {
        ...validExperimentCandidate().measurement_plan,
        segments: ['mobile', 'desktop'],
      },
      rollout_plan: {
        ...validExperimentCandidate().rollout_plan,
        scale_trigger: 'p_value < 0.05',
      },
      affected_files: ['src/checkout/form.tsx', 'src/checkout/utils.ts'],
    };
    const result = experimentCandidateSchema.safeParse(data);
    expect(result.success).toBe(true);
  });

  it('accepts candidate without optional fields', () => {
    const data = validExperimentCandidate();
    // Ensure no optional fields are set
    delete (data as Record<string, unknown>).affected_files;
    const result = experimentCandidateSchema.safeParse(data);
    expect(result.success).toBe(true);
  });

  // --- Top-level required fields ---
  it('rejects when title is missing', () => {
    const data = { ...validExperimentCandidate() };
    delete (data as Record<string, unknown>).title;
    expect(experimentCandidateSchema.safeParse(data).success).toBe(false);
  });

  it('rejects when hypothesis is missing', () => {
    const data = { ...validExperimentCandidate() };
    delete (data as Record<string, unknown>).hypothesis;
    expect(experimentCandidateSchema.safeParse(data).success).toBe(false);
  });

  it('rejects when mechanism is missing', () => {
    const data = { ...validExperimentCandidate() };
    delete (data as Record<string, unknown>).mechanism;
    expect(experimentCandidateSchema.safeParse(data).success).toBe(false);
  });

  it('rejects when prediction is missing', () => {
    const data = { ...validExperimentCandidate() };
    delete (data as Record<string, unknown>).prediction;
    expect(experimentCandidateSchema.safeParse(data).success).toBe(false);
  });

  it('rejects when intervention is missing', () => {
    const data = { ...validExperimentCandidate() };
    delete (data as Record<string, unknown>).intervention;
    expect(experimentCandidateSchema.safeParse(data).success).toBe(false);
  });

  it('rejects when measurement_plan is missing', () => {
    const data = { ...validExperimentCandidate() };
    delete (data as Record<string, unknown>).measurement_plan;
    expect(experimentCandidateSchema.safeParse(data).success).toBe(false);
  });

  it('rejects when rollout_plan is missing', () => {
    const data = { ...validExperimentCandidate() };
    delete (data as Record<string, unknown>).rollout_plan;
    expect(experimentCandidateSchema.safeParse(data).success).toBe(false);
  });

  it('rejects when effort_hours is missing', () => {
    const data = { ...validExperimentCandidate() };
    delete (data as Record<string, unknown>).effort_hours;
    expect(experimentCandidateSchema.safeParse(data).success).toBe(false);
  });

  it('rejects when risk_level is missing', () => {
    const data = { ...validExperimentCandidate() };
    delete (data as Record<string, unknown>).risk_level;
    expect(experimentCandidateSchema.safeParse(data).success).toBe(false);
  });

  it('rejects when reversible is missing', () => {
    const data = { ...validExperimentCandidate() };
    delete (data as Record<string, unknown>).reversible;
    expect(experimentCandidateSchema.safeParse(data).success).toBe(false);
  });

  it('rejects when sub_problem_id is missing', () => {
    const data = { ...validExperimentCandidate() };
    delete (data as Record<string, unknown>).sub_problem_id;
    expect(experimentCandidateSchema.safeParse(data).success).toBe(false);
  });

  // --- Prediction validation ---
  it('rejects confidence above 1', () => {
    const data = {
      ...validExperimentCandidate(),
      prediction: { ...validExperimentCandidate().prediction, confidence: 1.5 },
    };
    expect(experimentCandidateSchema.safeParse(data).success).toBe(false);
  });

  it('rejects confidence below 0', () => {
    const data = {
      ...validExperimentCandidate(),
      prediction: { ...validExperimentCandidate().prediction, confidence: -0.1 },
    };
    expect(experimentCandidateSchema.safeParse(data).success).toBe(false);
  });

  it('accepts confidence of 0', () => {
    const data = {
      ...validExperimentCandidate(),
      prediction: { ...validExperimentCandidate().prediction, confidence: 0 },
    };
    expect(experimentCandidateSchema.safeParse(data).success).toBe(true);
  });

  it('accepts confidence of 1', () => {
    const data = {
      ...validExperimentCandidate(),
      prediction: { ...validExperimentCandidate().prediction, confidence: 1 },
    };
    expect(experimentCandidateSchema.safeParse(data).success).toBe(true);
  });

  it('rejects delta_range that is not a 2-element tuple', () => {
    const data = {
      ...validExperimentCandidate(),
      prediction: {
        ...validExperimentCandidate().prediction,
        delta_range: [0.01],
      },
    };
    expect(experimentCandidateSchema.safeParse(data).success).toBe(false);
  });

  it('rejects delta_range with 3 elements', () => {
    const data = {
      ...validExperimentCandidate(),
      prediction: {
        ...validExperimentCandidate().prediction,
        delta_range: [0.01, 0.05, 0.10],
      },
    };
    expect(experimentCandidateSchema.safeParse(data).success).toBe(false);
  });

  it('rejects prediction with missing signal', () => {
    const pred = { ...validExperimentCandidate().prediction };
    delete (pred as Record<string, unknown>).signal;
    const data = { ...validExperimentCandidate(), prediction: pred };
    expect(experimentCandidateSchema.safeParse(data).success).toBe(false);
  });

  // --- Intervention validation ---
  it('accepts intervention type code_change', () => {
    const data = {
      ...validExperimentCandidate(),
      intervention: { ...validExperimentCandidate().intervention, type: 'code_change' },
    };
    expect(experimentCandidateSchema.safeParse(data).success).toBe(true);
  });

  it('accepts intervention type config_change', () => {
    const data = {
      ...validExperimentCandidate(),
      intervention: { ...validExperimentCandidate().intervention, type: 'config_change' },
    };
    expect(experimentCandidateSchema.safeParse(data).success).toBe(true);
  });

  it('accepts intervention type copy_change', () => {
    const data = {
      ...validExperimentCandidate(),
      intervention: { ...validExperimentCandidate().intervention, type: 'copy_change' },
    };
    expect(experimentCandidateSchema.safeParse(data).success).toBe(true);
  });

  it('rejects invalid intervention type', () => {
    const data = {
      ...validExperimentCandidate(),
      intervention: { ...validExperimentCandidate().intervention, type: 'database_migration' },
    };
    expect(experimentCandidateSchema.safeParse(data).success).toBe(false);
  });

  // --- Risk level validation ---
  it('accepts risk_level low, medium, high', () => {
    for (const level of ['low', 'medium', 'high'] as const) {
      const data = { ...validExperimentCandidate(), risk_level: level };
      expect(experimentCandidateSchema.safeParse(data).success).toBe(true);
    }
  });

  it('rejects invalid risk_level', () => {
    const data = { ...validExperimentCandidate(), risk_level: 'critical' };
    expect(experimentCandidateSchema.safeParse(data).success).toBe(false);
  });

  // --- Measurement plan validation ---
  it('rejects duration_days less than 1', () => {
    const data = {
      ...validExperimentCandidate(),
      measurement_plan: {
        ...validExperimentCandidate().measurement_plan,
        duration_days: 0,
      },
    };
    expect(experimentCandidateSchema.safeParse(data).success).toBe(false);
  });

  it('rejects non-integer duration_days', () => {
    const data = {
      ...validExperimentCandidate(),
      measurement_plan: {
        ...validExperimentCandidate().measurement_plan,
        duration_days: 7.5,
      },
    };
    expect(experimentCandidateSchema.safeParse(data).success).toBe(false);
  });

  it('rejects min_sample_size less than 100', () => {
    const data = {
      ...validExperimentCandidate(),
      measurement_plan: {
        ...validExperimentCandidate().measurement_plan,
        min_sample_size: 50,
      },
    };
    expect(experimentCandidateSchema.safeParse(data).success).toBe(false);
  });

  it('accepts min_sample_size of exactly 100', () => {
    const data = {
      ...validExperimentCandidate(),
      measurement_plan: {
        ...validExperimentCandidate().measurement_plan,
        min_sample_size: 100,
      },
    };
    expect(experimentCandidateSchema.safeParse(data).success).toBe(true);
  });

  it('rejects non-integer min_sample_size', () => {
    const data = {
      ...validExperimentCandidate(),
      measurement_plan: {
        ...validExperimentCandidate().measurement_plan,
        min_sample_size: 500.5,
      },
    };
    expect(experimentCandidateSchema.safeParse(data).success).toBe(false);
  });

  // --- Rollout plan validation ---
  it('rejects initial_pct below 0', () => {
    const data = {
      ...validExperimentCandidate(),
      rollout_plan: {
        ...validExperimentCandidate().rollout_plan,
        initial_pct: -5,
      },
    };
    expect(experimentCandidateSchema.safeParse(data).success).toBe(false);
  });

  it('rejects initial_pct above 100', () => {
    const data = {
      ...validExperimentCandidate(),
      rollout_plan: {
        ...validExperimentCandidate().rollout_plan,
        initial_pct: 101,
      },
    };
    expect(experimentCandidateSchema.safeParse(data).success).toBe(false);
  });

  it('accepts initial_pct at boundaries (0 and 100)', () => {
    const base = validExperimentCandidate();

    const at0 = {
      ...base,
      rollout_plan: { ...base.rollout_plan, initial_pct: 0 },
    };
    expect(experimentCandidateSchema.safeParse(at0).success).toBe(true);

    const at100 = {
      ...base,
      rollout_plan: { ...base.rollout_plan, initial_pct: 100 },
    };
    expect(experimentCandidateSchema.safeParse(at100).success).toBe(true);
  });

  it('rejects scale_to_pct below 0', () => {
    const data = {
      ...validExperimentCandidate(),
      rollout_plan: {
        ...validExperimentCandidate().rollout_plan,
        scale_to_pct: -1,
      },
    };
    expect(experimentCandidateSchema.safeParse(data).success).toBe(false);
  });

  it('rejects scale_to_pct above 100', () => {
    const data = {
      ...validExperimentCandidate(),
      rollout_plan: {
        ...validExperimentCandidate().rollout_plan,
        scale_to_pct: 150,
      },
    };
    expect(experimentCandidateSchema.safeParse(data).success).toBe(false);
  });

  // --- Type coercion / wrong types ---
  it('rejects effort_hours as a string', () => {
    const data = { ...validExperimentCandidate(), effort_hours: 'eight' };
    expect(experimentCandidateSchema.safeParse(data).success).toBe(false);
  });

  it('rejects reversible as a string', () => {
    const data = { ...validExperimentCandidate(), reversible: 'yes' };
    expect(experimentCandidateSchema.safeParse(data).success).toBe(false);
  });

  it('rejects affected_files containing non-strings', () => {
    const data = {
      ...validExperimentCandidate(),
      affected_files: [123, 456],
    };
    expect(experimentCandidateSchema.safeParse(data).success).toBe(false);
  });

  // --- Segments optional array ---
  it('accepts segments as optional string array', () => {
    const data = {
      ...validExperimentCandidate(),
      measurement_plan: {
        ...validExperimentCandidate().measurement_plan,
        segments: ['mobile_ios', 'mobile_android'],
      },
    };
    expect(experimentCandidateSchema.safeParse(data).success).toBe(true);
  });

  it('rejects segments containing non-strings', () => {
    const data = {
      ...validExperimentCandidate(),
      measurement_plan: {
        ...validExperimentCandidate().measurement_plan,
        segments: [1, 2, 3],
      },
    };
    expect(experimentCandidateSchema.safeParse(data).success).toBe(false);
  });

  // --- Complete garbage input ---
  it('rejects a completely empty object', () => {
    expect(experimentCandidateSchema.safeParse({}).success).toBe(false);
  });

  it('rejects null', () => {
    expect(experimentCandidateSchema.safeParse(null).success).toBe(false);
  });

  it('rejects a string', () => {
    expect(experimentCandidateSchema.safeParse('not an object').success).toBe(false);
  });

  it('rejects a number', () => {
    expect(experimentCandidateSchema.safeParse(42).success).toBe(false);
  });
});
