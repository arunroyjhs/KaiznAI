import { describe, it, expect } from 'vitest';
import { scoreCandidate, hasFileConflict, selectPortfolio } from '../scoring.js';
import type { ExperimentCandidate, ScoredCandidate } from '../schemas.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeCandidate(overrides?: Partial<ExperimentCandidate>): ExperimentCandidate {
  return {
    title: 'Test experiment',
    hypothesis: 'If we do X, metric Y will improve',
    mechanism: 'Because of Z',
    prediction: {
      signal: 'conversion_rate',
      expected_delta: 0.05,
      delta_range: [0.01, 0.10],
      confidence: 0.8,
    },
    intervention: {
      type: 'code_change',
      scope: 'checkout',
      description: 'Modify checkout flow',
    },
    measurement_plan: {
      duration_days: 14,
      min_sample_size: 1000,
      success_threshold: 0.03,
      kill_threshold: -0.02,
    },
    rollout_plan: {
      initial_pct: 10,
      scale_to_pct: 100,
    },
    effort_hours: 8,
    risk_level: 'low',
    reversible: true,
    sub_problem_id: 'sp-1',
    affected_files: [],
    ...overrides,
  };
}

function makeScoredCandidate(
  overrides?: Partial<ExperimentCandidate>,
  score?: number,
): ScoredCandidate {
  const candidate = makeCandidate(overrides);
  return { ...candidate, score: score ?? scoreCandidate(candidate).score };
}

// ---------------------------------------------------------------------------
// scoreCandidate
// ---------------------------------------------------------------------------

describe('scoreCandidate', () => {
  it('computes the correct score for a default low-risk reversible candidate', () => {
    const candidate = makeCandidate({
      prediction: {
        signal: 'conversion_rate',
        expected_delta: 0.05,
        delta_range: [0.01, 0.10],
        confidence: 0.8,
      },
      risk_level: 'low',
      effort_hours: 8,
      reversible: true,
    });

    const result = scoreCandidate(candidate);

    // expectedImpact = |0.05| * 0.8 = 0.04
    // riskMultiplier = 1.0 (low)
    // speedBonus = 1 / Math.log(8 + 2) = 1 / Math.log(10)
    // learningValue = 1.0 (reversible)
    const expectedImpact = Math.abs(0.05) * 0.8;
    const riskMultiplier = 1.0;
    const speedBonus = 1 / Math.log(10);
    const learningValue = 1.0;

    const expectedScore =
      expectedImpact * 0.35 +
      riskMultiplier * 0.25 +
      speedBonus * 0.2 +
      learningValue * 0.2;

    expect(result.score).toBeCloseTo(expectedScore, 10);
  });

  it('applies medium risk multiplier (0.8)', () => {
    const candidate = makeCandidate({ risk_level: 'medium' });
    const result = scoreCandidate(candidate);

    const expectedImpact =
      Math.abs(candidate.prediction.expected_delta) * candidate.prediction.confidence;
    const riskMultiplier = 0.8;
    const speedBonus = 1 / Math.log(candidate.effort_hours + 2);
    const learningValue = 1.0;

    const expectedScore =
      expectedImpact * 0.35 +
      riskMultiplier * 0.25 +
      speedBonus * 0.2 +
      learningValue * 0.2;

    expect(result.score).toBeCloseTo(expectedScore, 10);
  });

  it('applies high risk multiplier (0.5)', () => {
    const candidate = makeCandidate({ risk_level: 'high' });
    const result = scoreCandidate(candidate);

    const riskMultiplier = 0.5;
    const expectedImpact =
      Math.abs(candidate.prediction.expected_delta) * candidate.prediction.confidence;
    const speedBonus = 1 / Math.log(candidate.effort_hours + 2);
    const learningValue = 1.0;

    const expectedScore =
      expectedImpact * 0.35 +
      riskMultiplier * 0.25 +
      speedBonus * 0.2 +
      learningValue * 0.2;

    expect(result.score).toBeCloseTo(expectedScore, 10);
  });

  it('uses 0.7 learning value for non-reversible candidates', () => {
    const candidate = makeCandidate({ reversible: false });
    const result = scoreCandidate(candidate);

    const expectedImpact =
      Math.abs(candidate.prediction.expected_delta) * candidate.prediction.confidence;
    const riskMultiplier = 1.0;
    const speedBonus = 1 / Math.log(candidate.effort_hours + 2);
    const learningValue = 0.7;

    const expectedScore =
      expectedImpact * 0.35 +
      riskMultiplier * 0.25 +
      speedBonus * 0.2 +
      learningValue * 0.2;

    expect(result.score).toBeCloseTo(expectedScore, 10);
  });

  it('higher effort_hours produce a lower speed bonus', () => {
    const lowEffort = scoreCandidate(makeCandidate({ effort_hours: 2 }));
    const highEffort = scoreCandidate(makeCandidate({ effort_hours: 100 }));

    expect(lowEffort.score).toBeGreaterThan(highEffort.score);
  });

  it('higher expected_delta yields a higher score', () => {
    const lowDelta = scoreCandidate(
      makeCandidate({
        prediction: {
          signal: 'ctr',
          expected_delta: 0.01,
          delta_range: [0, 0.02],
          confidence: 0.8,
        },
      }),
    );
    const highDelta = scoreCandidate(
      makeCandidate({
        prediction: {
          signal: 'ctr',
          expected_delta: 0.20,
          delta_range: [0.10, 0.30],
          confidence: 0.8,
        },
      }),
    );

    expect(highDelta.score).toBeGreaterThan(lowDelta.score);
  });

  it('negative expected_delta uses absolute value', () => {
    const positiveCandidate = makeCandidate({
      prediction: {
        signal: 'bounce_rate',
        expected_delta: 0.10,
        delta_range: [0.05, 0.15],
        confidence: 0.9,
      },
    });
    const negativeCandidate = makeCandidate({
      prediction: {
        signal: 'bounce_rate',
        expected_delta: -0.10,
        delta_range: [-0.15, -0.05],
        confidence: 0.9,
      },
    });

    const positiveResult = scoreCandidate(positiveCandidate);
    const negativeResult = scoreCandidate(negativeCandidate);

    expect(positiveResult.score).toBeCloseTo(negativeResult.score, 10);
  });

  it('higher confidence increases the score', () => {
    const lowConf = scoreCandidate(
      makeCandidate({
        prediction: {
          signal: 'ctr',
          expected_delta: 0.05,
          delta_range: [0.01, 0.09],
          confidence: 0.3,
        },
      }),
    );
    const highConf = scoreCandidate(
      makeCandidate({
        prediction: {
          signal: 'ctr',
          expected_delta: 0.05,
          delta_range: [0.01, 0.09],
          confidence: 0.95,
        },
      }),
    );

    expect(highConf.score).toBeGreaterThan(lowConf.score);
  });

  it('preserves all original candidate fields in the result', () => {
    const candidate = makeCandidate({ title: 'Special Title', hypothesis: 'My hypothesis' });
    const result = scoreCandidate(candidate);

    expect(result.title).toBe('Special Title');
    expect(result.hypothesis).toBe('My hypothesis');
    expect(result.risk_level).toBe(candidate.risk_level);
    expect(result.effort_hours).toBe(candidate.effort_hours);
    expect(result.reversible).toBe(candidate.reversible);
  });

  it('score is always a finite positive number', () => {
    const candidates: ExperimentCandidate[] = [
      makeCandidate({ risk_level: 'low', effort_hours: 1, reversible: true }),
      makeCandidate({ risk_level: 'high', effort_hours: 1000, reversible: false }),
      makeCandidate({
        prediction: {
          signal: 's',
          expected_delta: 0,
          delta_range: [0, 0],
          confidence: 0,
        },
        effort_hours: 0,
      }),
    ];

    for (const c of candidates) {
      const result = scoreCandidate(c);
      expect(Number.isFinite(result.score)).toBe(true);
      expect(result.score).toBeGreaterThanOrEqual(0);
    }
  });

  it('verifies exact formula with known values', () => {
    // Use very specific values to verify the exact formula
    const candidate = makeCandidate({
      prediction: {
        signal: 'metric',
        expected_delta: 0.10,
        delta_range: [0.05, 0.15],
        confidence: 1.0,
      },
      risk_level: 'medium',
      effort_hours: 5,
      reversible: false,
    });

    const result = scoreCandidate(candidate);

    // expectedImpact = |0.10| * 1.0 = 0.10
    // riskMultiplier = 0.8
    // speedBonus = 1 / Math.log(5 + 2) = 1 / Math.log(7)
    // learningValue = 0.7

    const expected =
      0.10 * 0.35 +
      0.8 * 0.25 +
      (1 / Math.log(7)) * 0.2 +
      0.7 * 0.2;

    expect(result.score).toBeCloseTo(expected, 10);
  });
});

// ---------------------------------------------------------------------------
// hasFileConflict
// ---------------------------------------------------------------------------

describe('hasFileConflict', () => {
  it('returns true when candidates share at least one affected file', () => {
    const a = makeCandidate({ affected_files: ['src/a.ts', 'src/b.ts'] });
    const b = makeCandidate({ affected_files: ['src/b.ts', 'src/c.ts'] });

    expect(hasFileConflict(a, b)).toBe(true);
  });

  it('returns false when candidates have no overlapping files', () => {
    const a = makeCandidate({ affected_files: ['src/a.ts'] });
    const b = makeCandidate({ affected_files: ['src/b.ts'] });

    expect(hasFileConflict(a, b)).toBe(false);
  });

  it('returns false when first candidate has no affected_files', () => {
    const a = makeCandidate({ affected_files: undefined });
    const b = makeCandidate({ affected_files: ['src/a.ts'] });

    expect(hasFileConflict(a, b)).toBe(false);
  });

  it('returns false when second candidate has no affected_files', () => {
    const a = makeCandidate({ affected_files: ['src/a.ts'] });
    const b = makeCandidate({ affected_files: undefined });

    expect(hasFileConflict(a, b)).toBe(false);
  });

  it('returns false when both candidates have no affected_files', () => {
    const a = makeCandidate({ affected_files: undefined });
    const b = makeCandidate({ affected_files: undefined });

    expect(hasFileConflict(a, b)).toBe(false);
  });

  it('returns false when both have empty affected_files arrays', () => {
    const a = makeCandidate({ affected_files: [] });
    const b = makeCandidate({ affected_files: [] });

    expect(hasFileConflict(a, b)).toBe(false);
  });

  it('returns true when candidates share all affected files', () => {
    const files = ['src/a.ts', 'src/b.ts', 'src/c.ts'];
    const a = makeCandidate({ affected_files: files });
    const b = makeCandidate({ affected_files: files });

    expect(hasFileConflict(a, b)).toBe(true);
  });

  it('is commutative (order of arguments does not matter)', () => {
    const a = makeCandidate({ affected_files: ['src/shared.ts', 'src/a.ts'] });
    const b = makeCandidate({ affected_files: ['src/shared.ts', 'src/b.ts'] });

    expect(hasFileConflict(a, b)).toBe(hasFileConflict(b, a));
  });
});

// ---------------------------------------------------------------------------
// selectPortfolio
// ---------------------------------------------------------------------------

describe('selectPortfolio', () => {
  it('selects candidates sorted by score descending', () => {
    const candidates: ScoredCandidate[] = [
      makeScoredCandidate({ title: 'Low', affected_files: ['a.ts'] }, 0.3),
      makeScoredCandidate({ title: 'High', affected_files: ['b.ts'] }, 0.9),
      makeScoredCandidate({ title: 'Medium', affected_files: ['c.ts'] }, 0.6),
    ];

    const result = selectPortfolio(candidates, 3);

    expect(result[0].title).toBe('High');
    expect(result[1].title).toBe('Medium');
    expect(result[2].title).toBe('Low');
  });

  it('limits selection to maxConcurrent', () => {
    const candidates: ScoredCandidate[] = [
      makeScoredCandidate({ title: 'A', affected_files: ['1.ts'] }, 0.9),
      makeScoredCandidate({ title: 'B', affected_files: ['2.ts'] }, 0.8),
      makeScoredCandidate({ title: 'C', affected_files: ['3.ts'] }, 0.7),
      makeScoredCandidate({ title: 'D', affected_files: ['4.ts'] }, 0.6),
    ];

    const result = selectPortfolio(candidates, 2);

    expect(result).toHaveLength(2);
    expect(result[0].title).toBe('A');
    expect(result[1].title).toBe('B');
  });

  it('skips candidates that conflict with already-selected ones', () => {
    const candidates: ScoredCandidate[] = [
      makeScoredCandidate({ title: 'Best', affected_files: ['shared.ts', 'a.ts'] }, 0.9),
      makeScoredCandidate({ title: 'Second (conflicts)', affected_files: ['shared.ts', 'b.ts'] }, 0.8),
      makeScoredCandidate({ title: 'Third (no conflict)', affected_files: ['c.ts'] }, 0.7),
    ];

    const result = selectPortfolio(candidates, 2);

    expect(result).toHaveLength(2);
    expect(result[0].title).toBe('Best');
    // 'Second' is skipped due to conflict with 'Best' on shared.ts
    expect(result[1].title).toBe('Third (no conflict)');
  });

  it('returns empty array when given empty candidates', () => {
    const result = selectPortfolio([], 3);
    expect(result).toEqual([]);
  });

  it('returns empty array when maxConcurrent is 0', () => {
    const candidates: ScoredCandidate[] = [
      makeScoredCandidate({ title: 'A' }, 0.9),
    ];

    const result = selectPortfolio(candidates, 0);
    expect(result).toEqual([]);
  });

  it('handles candidates without affected_files (no conflicts)', () => {
    const candidates: ScoredCandidate[] = [
      makeScoredCandidate({ title: 'A', affected_files: undefined }, 0.9),
      makeScoredCandidate({ title: 'B', affected_files: undefined }, 0.8),
      makeScoredCandidate({ title: 'C', affected_files: undefined }, 0.7),
    ];

    const result = selectPortfolio(candidates, 3);

    // No conflicts possible, so all 3 should be selected
    expect(result).toHaveLength(3);
  });

  it('does not mutate the original candidates array', () => {
    const candidates: ScoredCandidate[] = [
      makeScoredCandidate({ title: 'C' }, 0.3),
      makeScoredCandidate({ title: 'A' }, 0.9),
      makeScoredCandidate({ title: 'B' }, 0.6),
    ];

    const originalOrder = candidates.map((c) => c.title);
    selectPortfolio(candidates, 3);

    expect(candidates.map((c) => c.title)).toEqual(originalOrder);
  });

  it('selects the max number of non-conflicting candidates from a larger set', () => {
    // Build a scenario: 5 candidates, but many conflicts
    const candidates: ScoredCandidate[] = [
      makeScoredCandidate({ title: 'A', affected_files: ['f1.ts'] }, 1.0),
      makeScoredCandidate({ title: 'B', affected_files: ['f1.ts', 'f2.ts'] }, 0.9), // conflicts with A
      makeScoredCandidate({ title: 'C', affected_files: ['f2.ts', 'f3.ts'] }, 0.8), // conflicts with B
      makeScoredCandidate({ title: 'D', affected_files: ['f4.ts'] }, 0.7),          // no conflicts
      makeScoredCandidate({ title: 'E', affected_files: ['f4.ts'] }, 0.6),          // conflicts with D
    ];

    const result = selectPortfolio(candidates, 3);

    // A (score=1.0) selected.
    // B (0.9) skipped — conflicts with A on f1.ts
    // C (0.8) selected — no conflict with A
    // D (0.7) selected — no conflict with A or C
    expect(result).toHaveLength(3);
    expect(result.map((c) => c.title)).toEqual(['A', 'C', 'D']);
  });

  it('returns fewer than maxConcurrent when all remaining conflict', () => {
    const candidates: ScoredCandidate[] = [
      makeScoredCandidate({ title: 'A', affected_files: ['shared.ts'] }, 0.9),
      makeScoredCandidate({ title: 'B', affected_files: ['shared.ts'] }, 0.8),
      makeScoredCandidate({ title: 'C', affected_files: ['shared.ts'] }, 0.7),
    ];

    const result = selectPortfolio(candidates, 3);

    // Only A can be selected; B and C conflict with it
    expect(result).toHaveLength(1);
    expect(result[0].title).toBe('A');
  });
});
