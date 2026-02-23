import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  getActiveOutcomesInputSchema,
  handleGetActiveOutcomes,
  getActiveOutcomesTool,
} from '../tools/get-active-outcomes.js';

// ─── Mock global.fetch ──────────────────────────────────────────────────────
const mockFetch = vi.fn();

beforeEach(() => {
  vi.stubGlobal('fetch', mockFetch);
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ─── Tool Definition ────────────────────────────────────────────────────────
describe('getActiveOutcomesTool definition', () => {
  it('has the correct tool name', () => {
    expect(getActiveOutcomesTool.name).toBe('get_active_outcomes');
  });

  it('has a non-empty description', () => {
    expect(getActiveOutcomesTool.description).toBeTruthy();
    expect(typeof getActiveOutcomesTool.description).toBe('string');
  });

  it('defines inputSchema as an object type', () => {
    expect(getActiveOutcomesTool.inputSchema.type).toBe('object');
  });

  it('defines workspace_id as a string property', () => {
    expect(getActiveOutcomesTool.inputSchema.properties.workspace_id).toBeDefined();
    expect(getActiveOutcomesTool.inputSchema.properties.workspace_id.type).toBe('string');
  });
});

// ─── Input Schema Validation ────────────────────────────────────────────────
describe('getActiveOutcomesInputSchema', () => {
  it('validates successfully with no arguments', () => {
    const result = getActiveOutcomesInputSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it('validates successfully with workspace_id', () => {
    const result = getActiveOutcomesInputSchema.safeParse({ workspace_id: 'ws-123' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.workspace_id).toBe('ws-123');
    }
  });

  it('validates successfully with undefined workspace_id', () => {
    const result = getActiveOutcomesInputSchema.safeParse({ workspace_id: undefined });
    expect(result.success).toBe(true);
  });

  it('rejects non-string workspace_id', () => {
    const result = getActiveOutcomesInputSchema.safeParse({ workspace_id: 123 });
    expect(result.success).toBe(false);
  });
});

// ─── Handler Function ───────────────────────────────────────────────────────
describe('handleGetActiveOutcomes', () => {
  const apiBaseUrl = 'http://localhost:3001';
  const apiKey = 'test-api-key';

  it('constructs the correct URL with status=active query parameter', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: [] }),
    });

    await handleGetActiveOutcomes({}, apiBaseUrl, apiKey);

    expect(mockFetch).toHaveBeenCalledOnce();
    const calledUrl = mockFetch.mock.calls[0][0];
    expect(calledUrl).toContain('/api/v1/outcomes');
    expect(calledUrl).toContain('status=active');
  });

  it('adds workspace_id as workspaceId query param when provided', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: [] }),
    });

    await handleGetActiveOutcomes({ workspace_id: 'ws-456' }, apiBaseUrl, apiKey);

    const calledUrl = mockFetch.mock.calls[0][0];
    expect(calledUrl).toContain('workspaceId=ws-456');
    expect(calledUrl).toContain('status=active');
  });

  it('does not include workspaceId param when workspace_id is not provided', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: [] }),
    });

    await handleGetActiveOutcomes({}, apiBaseUrl, apiKey);

    const calledUrl = mockFetch.mock.calls[0][0];
    expect(calledUrl).not.toContain('workspaceId');
  });

  it('sends Authorization header with Bearer token', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: [] }),
    });

    await handleGetActiveOutcomes({}, apiBaseUrl, apiKey);

    const fetchOptions = mockFetch.mock.calls[0][1];
    expect(fetchOptions.headers.Authorization).toBe('Bearer test-api-key');
    expect(fetchOptions.headers['Content-Type']).toBe('application/json');
  });

  it('returns JSON stringified response data', async () => {
    const mockData = { data: [{ id: '1', title: 'Test Outcome' }] };
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockData,
    });

    const result = await handleGetActiveOutcomes({}, apiBaseUrl, apiKey);
    expect(result).toBe(JSON.stringify(mockData, null, 2));
  });

  it('throws when API returns non-ok response', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      statusText: 'Internal Server Error',
    });

    await expect(
      handleGetActiveOutcomes({}, apiBaseUrl, apiKey),
    ).rejects.toThrow('Failed to fetch outcomes: Internal Server Error');
  });

  it('throws when API returns 404', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      statusText: 'Not Found',
    });

    await expect(
      handleGetActiveOutcomes({}, apiBaseUrl, apiKey),
    ).rejects.toThrow('Failed to fetch outcomes: Not Found');
  });

  it('uses the provided apiBaseUrl as the base of the URL', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({}),
    });

    await handleGetActiveOutcomes({}, 'https://api.example.com', apiKey);

    const calledUrl = mockFetch.mock.calls[0][0];
    expect(calledUrl).toMatch(/^https:\/\/api\.example\.com/);
  });
});
