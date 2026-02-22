import { z } from 'zod';

export const getActiveOutcomesTool = {
  name: 'get_active_outcomes',
  description:
    'Get all active outcomes for this workspace with their current signal values and experiment portfolios.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      workspace_id: {
        type: 'string',
        description: 'The workspace ID to query outcomes for',
      },
    },
  },
};

export const getActiveOutcomesInputSchema = z.object({
  workspace_id: z.string().optional(),
});

export type GetActiveOutcomesInput = z.infer<typeof getActiveOutcomesInputSchema>;

export async function handleGetActiveOutcomes(
  input: GetActiveOutcomesInput,
  apiBaseUrl: string,
  apiKey: string,
): Promise<string> {
  const url = new URL('/api/v1/outcomes', apiBaseUrl);
  url.searchParams.set('status', 'active');
  if (input.workspace_id) {
    url.searchParams.set('workspaceId', input.workspace_id);
  }

  const response = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch outcomes: ${response.statusText}`);
  }

  const data = await response.json();
  return JSON.stringify(data, null, 2);
}
