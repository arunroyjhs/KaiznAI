import type { ExperimentCandidate, ScoredCandidate } from './schemas.js';

const RISK_MULTIPLIER: Record<string, number> = {
  low: 1.0,
  medium: 0.8,
  high: 0.5,
};

/**
 * Score an experiment candidate using the weighted formula:
 * - Expected impact: 35%
 * - Risk adjustment: 25%
 * - Speed bonus: 20%
 * - Learning value: 20%
 */
export function scoreCandidate(candidate: ExperimentCandidate): ScoredCandidate {
  const expectedImpact =
    Math.abs(candidate.prediction.expected_delta) * candidate.prediction.confidence;
  const riskMultiplier = RISK_MULTIPLIER[candidate.risk_level] ?? 0.5;
  const speedBonus = 1 / Math.log(candidate.effort_hours + 2);
  const learningValue = candidate.reversible ? 1.0 : 0.7;

  const score =
    expectedImpact * 0.35 +
    riskMultiplier * 0.25 +
    speedBonus * 0.2 +
    learningValue * 0.2;

  return { ...candidate, score };
}

/**
 * Check if two candidates have conflicting file paths.
 */
export function hasFileConflict(a: ExperimentCandidate, b: ExperimentCandidate): boolean {
  if (!a.affected_files || !b.affected_files) return false;
  return a.affected_files.some((file) => b.affected_files?.includes(file));
}

/**
 * Select a diverse, non-conflicting portfolio from scored candidates.
 */
export function selectPortfolio(
  candidates: ScoredCandidate[],
  maxConcurrent: number,
): ScoredCandidate[] {
  const sorted = [...candidates].sort((a, b) => b.score - a.score);
  const selected: ScoredCandidate[] = [];

  for (const candidate of sorted) {
    if (selected.length >= maxConcurrent) break;

    const hasConflict = selected.some((s) => hasFileConflict(s, candidate));
    if (!hasConflict) {
      selected.push(candidate);
    }
  }

  return selected;
}
