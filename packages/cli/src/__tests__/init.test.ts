import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ─── Mocks ──────────────────────────────────────────────────────────────────
vi.mock('node:fs', () => ({
  existsSync: vi.fn(),
  writeFileSync: vi.fn(),
}));

import { existsSync, writeFileSync } from 'node:fs';
import { initCommand } from '../commands/init.js';

const mockExistsSync = vi.mocked(existsSync);
const mockWriteFileSync = vi.mocked(writeFileSync);

describe('initCommand', () => {
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;
  let processExitSpy: ReturnType<typeof vi.spyOn>;
  let processCwdSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    processExitSpy = vi.spyOn(process, 'exit').mockImplementation((code?: number | string | null | undefined) => {
      throw new Error(`process.exit(${code})`);
    });
    processCwdSpy = vi.spyOn(process, 'cwd').mockReturnValue('/fake/project');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('writes outcome.yaml when file does not exist', async () => {
    mockExistsSync.mockReturnValue(false);

    await initCommand();

    expect(mockWriteFileSync).toHaveBeenCalledOnce();
    // Verify the file path ends with outcome.yaml
    const writtenPath = mockWriteFileSync.mock.calls[0][0] as string;
    expect(writtenPath).toContain('outcome.yaml');
    // Verify it writes with utf-8 encoding
    expect(mockWriteFileSync.mock.calls[0][2]).toBe('utf-8');
  });

  it('writes YAML content containing version and outcomes sections', async () => {
    mockExistsSync.mockReturnValue(false);

    await initCommand();

    const writtenContent = mockWriteFileSync.mock.calls[0][1] as string;
    expect(writtenContent).toContain('version: 1');
    expect(writtenContent).toContain('outcomes:');
    expect(writtenContent).toContain('signal:');
    expect(writtenContent).toContain('target:');
    expect(writtenContent).toContain('gates:');
  });

  it('prints creation confirmation and next steps', async () => {
    mockExistsSync.mockReturnValue(false);

    await initCommand();

    const logCalls = consoleLogSpy.mock.calls.map((c) => c[0]);
    expect(logCalls).toContain('Created outcome.yaml');
    expect(logCalls.some((msg: string) => msg?.includes('Next steps'))).toBe(true);
    expect(logCalls.some((msg: string) => msg?.includes('outcome-runtime validate'))).toBe(true);
  });

  it('exits with code 1 when outcome.yaml already exists', async () => {
    mockExistsSync.mockReturnValue(true);

    await expect(initCommand()).rejects.toThrow('process.exit(1)');

    expect(mockWriteFileSync).not.toHaveBeenCalled();
    expect(processExitSpy).toHaveBeenCalledWith(1);
  });

  it('logs warning message when file already exists', async () => {
    mockExistsSync.mockReturnValue(true);

    try {
      await initCommand();
    } catch {
      // Expected due to process.exit mock
    }

    const logCalls = consoleLogSpy.mock.calls.map((c) => c[0]);
    expect(logCalls.some((msg: string) => msg?.includes('already exists'))).toBe(true);
  });

  it('resolves path relative to process.cwd()', async () => {
    mockExistsSync.mockReturnValue(false);
    processCwdSpy.mockReturnValue('/my/workspace');

    await initCommand();

    const writtenPath = mockWriteFileSync.mock.calls[0][0] as string;
    expect(writtenPath).toContain('/my/workspace');
    expect(writtenPath).toContain('outcome.yaml');
  });

  it('checks existsSync before attempting to write', async () => {
    mockExistsSync.mockReturnValue(false);

    await initCommand();

    expect(mockExistsSync).toHaveBeenCalledOnce();
    // existsSync should be called before writeFileSync
    const existsCallOrder = mockExistsSync.mock.invocationCallOrder[0];
    const writeCallOrder = mockWriteFileSync.mock.invocationCallOrder[0];
    expect(existsCallOrder).toBeLessThan(writeCallOrder);
  });
});
