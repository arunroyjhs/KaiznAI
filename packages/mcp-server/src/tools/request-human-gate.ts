import { z } from 'zod';

export const requestHumanGateTool = {
  name: 'request_human_gate',
  description:
    'Trigger a human gate when agent encounters a decision requiring human approval.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      experiment_id: {
        type: 'string',
        description: 'The experiment ID this gate relates to',
      },
      gate_type: {
        type: 'string',
        description: 'Type of gate: portfolio_review, launch_approval, analysis_review, scale_approval, ship_approval',
      },
      question: {
        type: 'string',
        description: 'The question for the human to answer',
      },
      context: {
        type: 'object',
        description: 'Additional context for the human decision',
      },
    },
    required: ['experiment_id', 'gate_type', 'question'],
  },
};

export const requestHumanGateInputSchema = z.object({
  experiment_id: z.string(),
  gate_type: z.enum([
    'portfolio_review',
    'launch_approval',
    'analysis_review',
    'scale_approval',
    'ship_approval',
  ]),
  question: z.string(),
  context: z.record(z.unknown()).optional(),
});

export type RequestHumanGateInput = z.infer<typeof requestHumanGateInputSchema>;

export async function handleRequestHumanGate(
  input: RequestHumanGateInput,
  apiBaseUrl: string,
  apiKey: string,
): Promise<string> {
  const url = new URL('/api/v1/gates', apiBaseUrl);

  const response = await fetch(url.toString(), {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      experiment_id: input.experiment_id,
      gate_type: input.gate_type,
      question: input.question,
      context: input.context ?? {},
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to create gate: ${response.statusText}`);
  }

  const data = await response.json();
  return JSON.stringify(data, null, 2);
}
