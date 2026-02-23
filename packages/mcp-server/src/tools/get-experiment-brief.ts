import { z } from 'zod';

export const getExperimentBriefTool = {
  name: 'get_experiment_brief',
  description:
    'Get full experiment brief for an AI agent to build — includes hypothesis, scope, constraints, patterns to follow.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      experiment_id: {
        type: 'string',
        description: 'The experiment ID to get the brief for',
      },
    },
    required: ['experiment_id'],
  },
};

export const getExperimentBriefInputSchema = z.object({
  experiment_id: z.string(),
});

export type GetExperimentBriefInput = z.infer<typeof getExperimentBriefInputSchema>;

export async function handleGetExperimentBrief(
  input: GetExperimentBriefInput,
  apiBaseUrl: string,
  apiKey: string,
): Promise<string> {
  const url = new URL(`/api/v1/experiments/${input.experiment_id}/brief`, apiBaseUrl);

  const response = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch experiment brief: ${response.statusText}`);
  }

  const data = await response.json();
  return JSON.stringify(data, null, 2);
}
