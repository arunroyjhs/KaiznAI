import type { LLMGateway } from '@outcome-runtime/llm-gateway';
import type { Outcome } from '@outcome-runtime/core';
import type { LearningLibrary } from '@outcome-runtime/learning-library';
import { z } from 'zod';
import { subProblemSchema, experimentCandidateSchema, type ExperimentCandidate, type ScoredCandidate } from './schemas.js';
import {
  DECOMPOSITION_SYSTEM_PROMPT,
  HYPOTHESIS_GENERATION_SYSTEM_PROMPT,
  buildDecompositionPrompt,
  buildHypothesisPrompt,
} from './prompts.js';
import { scoreCandidate, selectPortfolio } from './scoring.js';

export class HypothesisEngine {
  constructor(
    private llmGateway: LLMGateway,
    private learningLibrary?: LearningLibrary,
  ) {}

  /**
   * Generate a portfolio of experiment hypotheses for a given outcome.
   * Returns scored and filtered candidates ready for human gate review.
   */
  async generatePortfolio(outcome: Outcome): Promise<ScoredCandidate[]> {
    // Step 0: Gather past learnings (cross-outcome) for context
    const pastLearnings = await this.fetchPastLearnings(outcome);

    // Step 1: Decompose the metric into sub-problems
    const subProblems = await this.decompose(outcome, pastLearnings);

    // Step 2: Generate candidates for each sub-problem (parallel)
    const candidateArrays = await Promise.all(
      subProblems.map((sp) => this.generateCandidates(sp, outcome, pastLearnings)),
    );
    const allCandidates = candidateArrays.flat();

    // Step 3: Score all candidates
    const scored = allCandidates.map(scoreCandidate);

    // Step 4: Select diverse, non-conflicting portfolio
    return selectPortfolio(scored, outcome.maxConcurrentExperiments);
  }

  /**
   * Fetch relevant past learnings from the Learning Library.
   * Queries both outcome-specific and cross-outcome learnings.
   */
  private async fetchPastLearnings(outcome: Outcome): Promise<string[]> {
    if (!this.learningLibrary) return [];

    try {
      // Fetch learnings relevant to this specific outcome
      const outcomeLearnings = await this.learningLibrary.getRelevantLearnings(
        outcome.id,
        outcome.orgId,
        5,
      );

      // Also fetch cross-outcome learnings by semantic similarity to the metric
      const crossOutcomeLearnings = await this.learningLibrary.whatWeKnowAbout(
        `${outcome.title} ${outcome.primarySignal.metric}`,
        outcome.orgId,
        5,
      );

      // Deduplicate by ID, combine, and format as strings
      const seen = new Set<string>();
      const combined: string[] = [];

      for (const learning of [...outcomeLearnings, ...crossOutcomeLearnings]) {
        if (seen.has(learning.id)) continue;
        seen.add(learning.id);

        const confidence = Math.round(learning.confidence * 100);
        const type = learning.findingType.replace(/_/g, ' ');
        combined.push(
          `[${type}, ${confidence}% confidence] ${learning.finding}`,
        );
      }

      return combined;
    } catch {
      // Learning fetch is non-critical — proceed without learnings
      return [];
    }
  }

  private async decompose(outcome: Outcome, pastLearnings: string[]) {
    const prompt = buildDecompositionPrompt(
      outcome.title,
      outcome.description ?? '',
      outcome.primarySignal.metric,
      outcome.target.from,
      outcome.target.to,
      outcome.target.direction,
      outcome.constraints,
      pastLearnings,
    );

    const response = await this.llmGateway.complete(
      {
        purpose: 'hypothesis_generation',
        system: DECOMPOSITION_SYSTEM_PROMPT,
        messages: [{ role: 'user', content: prompt }],
        response_format: 'json_object',
      },
      outcome.orgId,
    );

    const parsed = z
      .object({ sub_problems: z.array(subProblemSchema) })
      .parse(JSON.parse(response.content));

    return parsed.sub_problems;
  }

  private async generateCandidates(
    subProblem: { id: string; description: string; metric_lever: string },
    outcome: Outcome,
    pastLearnings: string[],
  ): Promise<ExperimentCandidate[]> {
    const scope = {
      allowed_paths: [] as string[],
      forbidden_paths: [] as string[],
    };

    const prompt = buildHypothesisPrompt(
      subProblem,
      outcome.title,
      outcome.primarySignal.metric,
      scope.allowed_paths,
      scope.forbidden_paths,
      pastLearnings,
    );

    const response = await this.llmGateway.complete(
      {
        purpose: 'hypothesis_generation',
        system: HYPOTHESIS_GENERATION_SYSTEM_PROMPT,
        messages: [{ role: 'user', content: prompt }],
        response_format: 'json_object',
      },
      outcome.orgId,
    );

    const parsed = z
      .object({ candidates: z.array(experimentCandidateSchema) })
      .parse(JSON.parse(response.content));

    return parsed.candidates.map((c) => ({
      ...c,
      sub_problem_id: subProblem.id,
    }));
  }
}
