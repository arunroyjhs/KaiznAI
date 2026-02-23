import { z } from 'zod';

export const queryLearningsTool = {
  name: 'query_learnings',
  description:
    'Search past experiment learnings to inform hypothesis generation. Returns relevant findings from completed experiments.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      query: {
        type: 'string',
        description: 'Natural language query to search learnings',
      },
      limit: {
        type: 'number',
        description: 'Maximum number of learnings to return (default: 10)',
      },
    },
  },
};

export const queryLearningsInputSchema = z.object({
  query: z.string().optional(),
  limit: z.number().optional().default(10),
});

export type QueryLearningsInput = z.infer<typeof queryLearningsInputSchema>;

export async function handleQueryLearnings(
  input: QueryLearningsInput,
  apiBaseUrl: string,
  apiKey: string,
): Promise<string> {
  const url = new URL('/api/v1/learnings', apiBaseUrl);
  if (input.query) {
    url.searchParams.set('q', input.query);
  }
  url.searchParams.set('limit', String(input.limit));

  const response = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to query learnings: ${response.statusText}`);
  }

  const data = await response.json();
  return JSON.stringify(data, null, 2);
}
