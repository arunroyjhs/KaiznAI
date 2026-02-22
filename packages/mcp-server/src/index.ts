#!/usr/bin/env node
import { createMCPServer } from './server.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

export { createMCPServer } from './server.js';

// When run directly, start the server over stdio
const isMainModule = process.argv[1]?.endsWith('mcp-server') ||
                     process.argv[1]?.endsWith('outcome-runtime-mcp');

if (isMainModule) {
  const server = createMCPServer();
  const transport = new StdioServerTransport();
  server.connect(transport).catch(console.error);
}
