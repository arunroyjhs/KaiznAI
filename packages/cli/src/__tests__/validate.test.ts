import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ─── Hoisted mock values ────────────────────────────────────────────────────
const mockParseOutcomeYaml = vi.fn();

// ─── Mocks ──────────────────────────────────────────────────────────────────
vi.mock('node:fs', () => ({
  existsSync: vi.fn(),
  readFileSync: vi.fn(),
}));

// Mock the entire validate module's dynamic import of @outcome-runtime/core
// by mocking the module so that the dynamic import resolves to our mock
vi.mock('@outcome-runtime/core', () => ({
  parseOutcomeYaml: mockParseOutcomeYaml,
}));

import { existsSync, readFileSync } from 'node:fs';

const mockExistsSync = vi.mocked(existsSync);
const mockReadFileSync = vi.mocked(readFileSync);

// We need to import validateCommand AFTER all mocks are set up.
// Using a lazy import approach to avoid the resolution issue.
// The validate.ts uses a dynamic import('outcome-runtime/core') inside,
// which will be resolved by our vi.mock above.

describe('validateCommand', () => {
  let validateCommand: (options: { file?: string }) => Promise<void>;
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
  let processExitSpy: ReturnType<typeof vi.spyOn>;
  let processCwdSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    vi.clearAllMocks();
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    processExitSpy = vi.spyOn(process, 'exit').mockImplementation((code?: number | string | null | undefined) => {
      throw new Error(`process.exit(${code})`);
    });
    processCwdSpy = vi.spyOn(process, 'cwd').mockReturnValue('/fake/project');

    // Import the module dynamically to ensure mocks are in place
    const mod = await import('../commands/validate.js');
    validateCommand = mod.validateCommand;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('exits with code 1 when outcome.yaml is not found', async () => {
    mockExistsSync.mockReturnValue(false);

    await expect(validateCommand({})).rejects.toThrow('process.exit(1)');

    expect(processExitSpy).toHaveBeenCalledWith(1);
    expect(consoleErrorSpy).toHaveBeenCalled();
    const errorCalls = consoleErrorSpy.mock.calls.map((c) => c[0]);
    expect(errorCalls.some((msg: string) => msg?.includes('File not found'))).toBe(true);
  });

  it('suggests running init when file is not found', async () => {
    mockExistsSync.mockReturnValue(false);

    try {
      await validateCommand({});
    } catch {
      // Expected
    }

    const errorCalls = consoleErrorSpy.mock.calls.map((c) => c[0]);
    expect(errorCalls.some((msg: string) => msg?.includes('outcome-runtime init'))).toBe(true);
  });

  it('reads and parses the outcome.yaml file when it exists', async () => {
    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockReturnValue('version: 1\noutcomes: []');
    mockParseOutcomeYaml.mockReturnValue({
      version: 1,
      outcomes: [],
      signal_connectors: [],
    });

    await validateCommand({});

    expect(mockReadFileSync).toHaveBeenCalledOnce();
    expect(mockParseOutcomeYaml).toHaveBeenCalledWith('version: 1\noutcomes: []');
  });

  it('prints success message with config summary for valid YAML', async () => {
    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockReturnValue('yaml content');
    mockParseOutcomeYaml.mockReturnValue({
      version: 1,
      outcomes: [
        {
          id: 'test-outcome',
          title: 'Test Outcome',
          signal: { source: 'postgres', metric: 'conversion_rate' },
          target: { direction: 'increase', to: 0.1 },
        },
      ],
      signal_connectors: [],
    });

    await validateCommand({});

    const logCalls = consoleLogSpy.mock.calls.map((c) => c[0]);
    expect(logCalls.some((msg: string) => msg?.includes('valid'))).toBe(true);
    expect(logCalls.some((msg: string) => msg?.includes('Version: 1'))).toBe(true);
    expect(logCalls.some((msg: string) => msg?.includes('Outcomes: 1'))).toBe(true);
  });

  it('prints outcome details including signal and target info', async () => {
    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockReturnValue('yaml content');
    mockParseOutcomeYaml.mockReturnValue({
      version: 1,
      outcomes: [
        {
          id: 'my-outcome',
          title: 'My Outcome',
          signal: { source: 'mixpanel', metric: 'signup_rate' },
          target: { direction: 'increase', to: 0.2 },
        },
      ],
      signal_connectors: [],
    });

    await validateCommand({});

    const logCalls = consoleLogSpy.mock.calls.map((c) => c[0]);
    expect(logCalls.some((msg: string) => msg?.includes('my-outcome'))).toBe(true);
    expect(logCalls.some((msg: string) => msg?.includes('mixpanel/signup_rate'))).toBe(true);
    expect(logCalls.some((msg: string) => msg?.includes('increase'))).toBe(true);
  });

  it('prints connector names when signal_connectors are present', async () => {
    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockReturnValue('yaml content');
    mockParseOutcomeYaml.mockReturnValue({
      version: 1,
      outcomes: [],
      signal_connectors: [
        { name: 'postgres', type: 'postgres' },
        { name: 'mixpanel', type: 'mixpanel' },
      ],
    });

    await validateCommand({});

    const logCalls = consoleLogSpy.mock.calls.map((c) => c[0]);
    expect(logCalls.some((msg: string) => msg?.includes('Connectors'))).toBe(true);
    expect(logCalls.some((msg: string) => msg?.includes('postgres'))).toBe(true);
  });

  it('exits with code 1 when parseOutcomeYaml throws', async () => {
    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockReturnValue('invalid yaml content');
    mockParseOutcomeYaml.mockImplementation(() => {
      throw new Error('Invalid YAML: missing required field "outcomes"');
    });

    await expect(validateCommand({})).rejects.toThrow('process.exit(1)');

    expect(processExitSpy).toHaveBeenCalledWith(1);
    const errorCalls = consoleErrorSpy.mock.calls.map((c) => c[0]);
    expect(errorCalls.some((msg: string) => msg?.includes('Invalid outcome.yaml'))).toBe(true);
  });

  it('prints the error message when validation fails', async () => {
    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockReturnValue('bad yaml');
    mockParseOutcomeYaml.mockImplementation(() => {
      throw new Error('missing required field');
    });

    try {
      await validateCommand({});
    } catch {
      // Expected
    }

    const errorCalls = consoleErrorSpy.mock.calls.map((c) => c[0]);
    expect(errorCalls.some((msg: string) => msg?.includes('missing required field'))).toBe(true);
  });

  it('uses custom file path from options.file', async () => {
    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockReturnValue('yaml');
    mockParseOutcomeYaml.mockReturnValue({
      version: 1,
      outcomes: [],
      signal_connectors: [],
    });

    await validateCommand({ file: 'custom.yaml' });

    const readPath = mockReadFileSync.mock.calls[0][0] as string;
    expect(readPath).toContain('custom.yaml');
  });

  it('defaults to outcome.yaml when no file option is provided', async () => {
    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockReturnValue('yaml');
    mockParseOutcomeYaml.mockReturnValue({
      version: 1,
      outcomes: [],
      signal_connectors: [],
    });

    await validateCommand({});

    const existsPath = mockExistsSync.mock.calls[0][0] as string;
    expect(existsPath).toContain('outcome.yaml');
  });

  it('handles multiple outcomes in output', async () => {
    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockReturnValue('yaml');
    mockParseOutcomeYaml.mockReturnValue({
      version: 1,
      outcomes: [
        {
          id: 'outcome-1',
          title: 'First',
          signal: { source: 'postgres', metric: 'metric_1' },
          target: { direction: 'increase', to: 0.5 },
        },
        {
          id: 'outcome-2',
          title: 'Second',
          signal: { source: 'mixpanel', metric: 'metric_2' },
          target: { direction: 'decrease', to: 0.1 },
        },
      ],
      signal_connectors: [],
    });

    await validateCommand({});

    const logCalls = consoleLogSpy.mock.calls.map((c) => c[0]);
    expect(logCalls.some((msg: string) => msg?.includes('Outcomes: 2'))).toBe(true);
    expect(logCalls.some((msg: string) => msg?.includes('outcome-1'))).toBe(true);
    expect(logCalls.some((msg: string) => msg?.includes('outcome-2'))).toBe(true);
  });
});
