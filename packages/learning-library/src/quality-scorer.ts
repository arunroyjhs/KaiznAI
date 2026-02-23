import type { QualityScore, LearningSearchResult } from './types.js';
import type { LearningStore } from './learning-store.js';

/**
 * Scores the quality of learnings based on how useful they've been
 * for generating future hypotheses and informing experiments.
 */
export class QualityScorer {
  constructor(private store: LearningStore) {}

  /**
   * Calculate a quality score for a learning based on:
   * - How many future hypotheses referenced it
   * - How many experiments cited it
   * - Recency (newer learnings get a slight boost)
   * - Confidence level of the original finding
   */
  async score(learning: LearningSearchResult): Promise<QualityScore> {
    const experimentCount = learning.experimentId
      ? await this.store.countByExperiment(learning.experimentId)
      : 0;

    const outcomeCount = learning.outcomeId
      ? await this.store.countByOutcome(learning.outcomeId)
      : 0;

    // Recency bonus: learnings from last 30 days get a boost
    const ageInDays = (Date.now() - learning.createdAt.getTime()) / (1000 * 60 * 60 * 24);
    const recencyBonus = ageInDays < 30 ? 0.2 : ageInDays < 90 ? 0.1 : 0;

    // Confidence weight
    const confidenceWeight = learning.confidence * 0.3;

    // Citation value
    const citationValue = Math.min(experimentCount * 0.1, 0.3);

    // Cross-outcome value (learning applied to multiple outcomes is more valuable)
    const crossOutcomeValue = outcomeCount > 1 ? 0.2 : 0;

    const score = Math.min(
      confidenceWeight + citationValue + crossOutcomeValue + recencyBonus,
      1.0,
    );

    return {
      learningId: learning.id,
      helpedFutureHypotheses: outcomeCount,
      citedInExperiments: experimentCount,
      score: Math.round(score * 100) / 100,
    };
  }

  /**
   * Score and rank a list of learnings by quality.
   */
  async rankByQuality(learnings: LearningSearchResult[]): Promise<Array<LearningSearchResult & { qualityScore: number }>> {
    const scored = await Promise.all(
      learnings.map(async (l) => {
        const q = await this.score(l);
        return { ...l, qualityScore: q.score };
      }),
    );

    return scored.sort((a, b) => b.qualityScore - a.qualityScore);
  }
}
