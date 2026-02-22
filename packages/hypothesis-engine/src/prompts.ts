export const DECOMPOSITION_SYSTEM_PROMPT = `You are an expert product experimentation strategist. Your job is to decompose a metric improvement goal into distinct sub-problems that can each be addressed by independent experiments.

Rules:
- Each sub-problem should target a different lever for moving the metric
- Sub-problems should be independent (changing one shouldn't affect another)
- Prioritize sub-problems by estimated impact
- Be specific about which part of the user journey each sub-problem addresses
- Consider both UX improvements and technical optimizations

Respond with a JSON object containing a "sub_problems" array.`;

export const HYPOTHESIS_GENERATION_SYSTEM_PROMPT = `You are an expert product experimentation strategist. Given a sub-problem and outcome context, generate experiment candidates.

Each candidate must include:
- A clear, falsifiable hypothesis
- The mechanism (why you think it works)
- A quantitative prediction with confidence range
- Specific intervention details (what to change)
- A measurement plan with success and kill thresholds
- A rollout plan (start small, scale up)
- Effort estimate in hours
- Risk level (low/medium/high)
- Whether the change is easily reversible

Rules:
- Hypotheses must be falsifiable and specific
- Predictions must include a confidence range
- Kill thresholds should protect against negative impact
- Respect scope constraints (allowed/forbidden paths)
- Prefer reversible, low-risk experiments
- Each experiment should be independently buildable

Respond with a JSON object containing a "candidates" array.`;

export function buildDecompositionPrompt(
  outcomeTitle: string,
  outcomeDescription: string,
  signalMetric: string,
  targetFrom: number | undefined,
  targetTo: number,
  targetDirection: string,
  constraints: Array<{ signal?: string; rule?: string }>,
  pastLearnings: string[],
): string {
  const constraintLines = constraints
    .map((c) => (c.rule ? `- Rule: ${c.rule}` : `- Signal "${c.signal}" must stay within limits`))
    .join('\n');

  const learningLines = pastLearnings.length > 0
    ? `\nPast learnings from previous experiments:\n${pastLearnings.map((l) => `- ${l}`).join('\n')}`
    : '\nNo past learnings available yet.';

  return `Outcome: ${outcomeTitle}
Description: ${outcomeDescription}
Primary Signal: ${signalMetric}
Target: ${targetDirection} from ${targetFrom ?? 'unknown'} to ${targetTo}

Constraints:
${constraintLines}
${learningLines}

Decompose this outcome into 3-5 independent sub-problems. Each sub-problem should represent a distinct lever for moving the ${signalMetric} metric toward the target.`;
}

export function buildHypothesisPrompt(
  subProblem: { description: string; metric_lever: string },
  outcomeTitle: string,
  signalMetric: string,
  allowedPaths: string[],
  forbiddenPaths: string[],
  pastLearnings: string[] = [],
): string {
  const learningLines = pastLearnings.length > 0
    ? `\nRelevant learnings from past experiments:\n${pastLearnings.map((l) => `- ${l}`).join('\n')}\n\nUse these learnings to inform your candidates. Avoid approaches that have been refuted. Build on confirmed findings.`
    : '';

  return `Sub-problem: ${subProblem.description}
Metric lever: ${subProblem.metric_lever}
Outcome: ${outcomeTitle}
Primary Signal: ${signalMetric}

Scope constraints:
- Allowed paths: ${allowedPaths.length > 0 ? allowedPaths.join(', ') : 'any'}
- Forbidden paths: ${forbiddenPaths.length > 0 ? forbiddenPaths.join(', ') : 'none'}
${learningLines}
Generate 2-3 experiment candidates for this sub-problem. Each candidate should be a distinct approach to solving this sub-problem.`;
}
