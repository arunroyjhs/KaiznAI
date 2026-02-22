import type { LLMGateway } from '@outcome-runtime/llm-gateway';
import type { Outcome } from '@outcome-runtime/core';
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
  constructor(private llmGateway: LLMGateway) {}

  /**
   * Generate a portfolio of experiment hypotheses for a given outcome.
   * Returns scored and filtered candidates ready for human gate review.
   */
  async generatePortfolio(outcome: Outcome): Promise<ScoredCandidate[]> {
    // Step 1: Decompose the metric into sub-problems
    const subProblems = await this.decompose(outcome);

    // Step 2: Generate candidates for each sub-problem (parallel)
    const candidateArrays = await Promise.all(
      subProblems.map((sp) => this.generateCandidates(sp, outcome)),
    );
    const allCandidates = candidateArrays.flat();

    // Step 3: Score all candidates
    const scored = allCandidates.map(scoreCandidate);

    // Step 4: Select diverse, non-conflicting portfolio
    return selectPortfolio(scored, outcome.maxConcurrentExperiments);
  }

  private async decompose(outcome: Outcome) {
    const prompt = buildDecompositionPrompt(
      outcome.title,
      outcome.description ?? '',
      outcome.primarySignal.metric,
      outcome.target.from,
      outcome.target.to,
      outcome.target.direction,
      outcome.constraints,
      [], // past learnings — empty for v1
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
