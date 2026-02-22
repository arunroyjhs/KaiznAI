import { z } from 'zod';

export const reportExperimentBuiltTool = {
  name: 'report_experiment_built',
  description:
    'Report that an experiment has been built and is ready for human gate review.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      experiment_id: {
        type: 'string',
        description: 'The experiment ID that was built',
      },
      implementation_summary: {
        type: 'string',
        description: 'Summary of what was implemented',
      },
      files_changed: {
        type: 'array',
        items: { type: 'string' },
        description: 'List of files that were modified',
      },
      feature_flag_key: {
        type: 'string',
        description: 'The feature flag key used for the experiment',
      },
      agent_notes: {
        type: 'string',
        description: 'Additional notes from the agent about the implementation',
      },
    },
    required: ['experiment_id', 'implementation_summary', 'files_changed'],
  },
};

export const reportExperimentBuiltInputSchema = z.object({
  experiment_id: z.string(),
  implementation_summary: z.string(),
  files_changed: z.array(z.string()),
  feature_flag_key: z.string().optional(),
  agent_notes: z.string().optional(),
});

export type ReportExperimentBuiltInput = z.infer<typeof reportExperimentBuiltInputSchema>;

export async function handleReportExperimentBuilt(
  input: ReportExperimentBuiltInput,
  apiBaseUrl: string,
  apiKey: string,
): Promise<string> {
  const url = new URL(`/api/v1/experiments/${input.experiment_id}/built`, apiBaseUrl);

  const response = await fetch(url.toString(), {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      implementation_summary: input.implementation_summary,
      files_changed: input.files_changed,
      feature_flag_key: input.feature_flag_key,
      agent_notes: input.agent_notes,
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to report build: ${response.statusText}`);
  }

  const data = await response.json();
  return JSON.stringify(data, null, 2);
}
