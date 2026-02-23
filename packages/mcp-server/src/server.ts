import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

import {
  getActiveOutcomesTool,
  handleGetActiveOutcomes,
  getActiveOutcomesInputSchema,
  getExperimentBriefTool,
  handleGetExperimentBrief,
  getExperimentBriefInputSchema,
  reportExperimentBuiltTool,
  handleReportExperimentBuilt,
  reportExperimentBuiltInputSchema,
  queryLearningsTool,
  handleQueryLearnings,
  queryLearningsInputSchema,
  requestHumanGateTool,
  handleRequestHumanGate,
  requestHumanGateInputSchema,
} from './tools/index.js';

export function createMCPServer() {
  const apiBaseUrl = process.env.OR_API_URL ?? 'http://localhost:3001';
  const apiKey = process.env.OR_API_KEY ?? '';

  const server = new Server(
    {
      name: 'outcome-runtime',
      version: '0.1.0',
    },
    {
      capabilities: {
        tools: {},
      },
    },
  );

  // List available tools
  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [
      getActiveOutcomesTool,
      getExperimentBriefTool,
      reportExperimentBuiltTool,
      queryLearningsTool,
      requestHumanGateTool,
    ],
  }));

  // Handle tool calls
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    try {
      let result: string;

      switch (name) {
        case 'get_active_outcomes': {
          const input = getActiveOutcomesInputSchema.parse(args);
          result = await handleGetActiveOutcomes(input, apiBaseUrl, apiKey);
          break;
        }
        case 'get_experiment_brief': {
          const input = getExperimentBriefInputSchema.parse(args);
          result = await handleGetExperimentBrief(input, apiBaseUrl, apiKey);
          break;
        }
        case 'report_experiment_built': {
          const input = reportExperimentBuiltInputSchema.parse(args);
          result = await handleReportExperimentBuilt(input, apiBaseUrl, apiKey);
          break;
        }
        case 'query_learnings': {
          const input = queryLearningsInputSchema.parse(args);
          result = await handleQueryLearnings(input, apiBaseUrl, apiKey);
          break;
        }
        case 'request_human_gate': {
          const input = requestHumanGateInputSchema.parse(args);
          result = await handleRequestHumanGate(input, apiBaseUrl, apiKey);
          break;
        }
        default:
          throw new Error(`Unknown tool: ${name}`);
      }

      return {
        content: [{ type: 'text', text: result }],
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        content: [{ type: 'text', text: `Error: ${message}` }],
        isError: true,
      };
    }
  });

  return server;
}

// Main entry point — run the server over stdio
export async function main() {
  const server = createMCPServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
}
