import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@outcome-runtime/core': resolve(__dirname, 'packages/core/src/index.ts'),
      '@outcome-runtime/hypothesis-engine': resolve(__dirname, 'packages/hypothesis-engine/src/index.ts'),
      '@outcome-runtime/signal-collector': resolve(__dirname, 'packages/signal-collector/src/index.ts'),
      '@outcome-runtime/human-gates': resolve(__dirname, 'packages/human-gates/src/index.ts'),
      '@outcome-runtime/llm-gateway': resolve(__dirname, 'packages/llm-gateway/src/index.ts'),
      '@outcome-runtime/learning-library': resolve(__dirname, 'packages/learning-library/src/index.ts'),
      '@outcome-runtime/billing': resolve(__dirname, 'packages/billing/src/index.ts'),
      '@outcome-runtime/agent-sdk': resolve(__dirname, 'packages/agent-sdk/src/index.ts'),
      '@outcome-runtime/auth': resolve(__dirname, 'packages/auth/src/index.ts'),
    },
  },
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
    },
    testTimeout: 10000,
  },
});
