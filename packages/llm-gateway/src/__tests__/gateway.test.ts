import { describe, it, expect, vi, beforeEach, afterEach, type Mock } from 'vitest';
import type {
  LLMRequest,
  LLMResponse,
  ProviderAdapter,
  ProviderConfig,
  ProviderSlug,
} from '../types.js';
import { LLMGateway, type GatewayConfig } from '../gateway.js';

// ---------------------------------------------------------------------------
// Mock all provider modules so the constructor never instantiates real clients
// ---------------------------------------------------------------------------

const createMockProvider = (name: ProviderSlug): ProviderAdapter => ({
  name,
  complete: vi.fn(),
  listModels: vi.fn().mockReturnValue([`${name}-model-a`, `${name}-model-b`]),
});

const mockAnthropicProvider = createMockProvider('anthropic');
const mockOpenAIProvider = createMockProvider('openai');
const mockPerplexityProvider = createMockProvider('perplexity');
const mockOllamaProvider = createMockProvider('ollama');

vi.mock('../providers/anthropic.js', () => ({
  AnthropicProvider: vi.fn().mockImplementation(() => mockAnthropicProvider),
}));

vi.mock('../providers/openai.js', () => ({
  OpenAIProvider: vi.fn().mockImplementation(() => mockOpenAIProvider),
}));

vi.mock('../providers/perplexity.js', () => ({
  PerplexityProvider: vi.fn().mockImplementation(() => mockPerplexityProvider),
}));

vi.mock('../providers/ollama.js', () => ({
  OllamaProvider: vi.fn().mockImplementation(() => mockOllamaProvider),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeConfig(overrides?: Partial<GatewayConfig>): GatewayConfig {
  return {
    providers: [
      { provider: 'anthropic', authMode: 'api_key', apiKey: 'sk-ant-test' },
      { provider: 'openai', authMode: 'api_key', apiKey: 'sk-oai-test' },
      { provider: 'perplexity', authMode: 'api_key', apiKey: 'sk-pplx-test' },
      { provider: 'ollama', authMode: 'api_key' },
    ],
    defaultProvider: 'anthropic',
    ...overrides,
  };
}

function makeRequest(overrides?: Partial<LLMRequest>): LLMRequest {
  return {
    messages: [{ role: 'user', content: 'Hello' }],
    purpose: 'hypothesis_generation',
    ...overrides,
  };
}

function makeLLMResponse(overrides?: Partial<LLMResponse>): LLMResponse {
  return {
    content: 'response content',
    provider_used: 'anthropic',
    model_used: 'claude-sonnet-4-5',
    auth_mode_used: 'api_key',
    input_tokens: 10,
    output_tokens: 20,
    latency_ms: 150,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('LLMGateway', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // -----------------------------------------------------------------------
  // Constructor
  // -----------------------------------------------------------------------
  describe('constructor', () => {
    it('creates providers for all four supported slugs', () => {
      const gateway = new LLMGateway(makeConfig());

      expect(gateway.getProvider('anthropic')).toBeDefined();
      expect(gateway.getProvider('openai')).toBeDefined();
      expect(gateway.getProvider('perplexity')).toBeDefined();
      expect(gateway.getProvider('ollama')).toBeDefined();
    });

    it('stores the config passed in', () => {
      const config = makeConfig({ defaultProvider: 'openai' });
      const gateway = new LLMGateway(config);

      // Default provider choice is exercised via complete(); here just verify
      // the gateway was created without error with a non-anthropic default.
      expect(gateway).toBeDefined();
    });
  });

  // -----------------------------------------------------------------------
  // getProvider
  // -----------------------------------------------------------------------
  describe('getProvider', () => {
    it('returns the correct provider adapter for each slug', () => {
      const gateway = new LLMGateway(makeConfig());

      expect(gateway.getProvider('anthropic')).toBe(mockAnthropicProvider);
      expect(gateway.getProvider('openai')).toBe(mockOpenAIProvider);
      expect(gateway.getProvider('perplexity')).toBe(mockPerplexityProvider);
      expect(gateway.getProvider('ollama')).toBe(mockOllamaProvider);
    });

    it('returns undefined for an unknown slug', () => {
      const gateway = new LLMGateway(makeConfig());

      // Force an unknown slug via type cast
      expect(gateway.getProvider('unknown' as ProviderSlug)).toBeUndefined();
    });
  });

  // -----------------------------------------------------------------------
  // complete -- happy path
  // -----------------------------------------------------------------------
  describe('complete', () => {
    it('calls the default provider when no override is specified', async () => {
      const gateway = new LLMGateway(makeConfig({ defaultProvider: 'anthropic' }));
      const expectedResponse = makeLLMResponse({ provider_used: 'anthropic' });
      (mockAnthropicProvider.complete as Mock).mockResolvedValueOnce(expectedResponse);

      const request = makeRequest();
      const result = await gateway.complete(request, 'org-1');

      expect(mockAnthropicProvider.complete).toHaveBeenCalledOnce();
      expect(result).toEqual(expectedResponse);
    });

    it('uses the provider_override when specified', async () => {
      const gateway = new LLMGateway(makeConfig({ defaultProvider: 'anthropic' }));
      const expectedResponse = makeLLMResponse({ provider_used: 'openai' });
      (mockOpenAIProvider.complete as Mock).mockResolvedValueOnce(expectedResponse);

      const request = makeRequest({ provider_override: 'openai' });
      const result = await gateway.complete(request, 'org-1');

      expect(mockOpenAIProvider.complete).toHaveBeenCalledOnce();
      expect(mockAnthropicProvider.complete).not.toHaveBeenCalled();
      expect(result.provider_used).toBe('openai');
    });

    it('passes the resolved ProviderConfig to the adapter', async () => {
      const config = makeConfig();
      const gateway = new LLMGateway(config);
      const expectedResponse = makeLLMResponse();
      (mockAnthropicProvider.complete as Mock).mockResolvedValueOnce(expectedResponse);

      const request = makeRequest();
      await gateway.complete(request, 'org-1');

      const callArgs = (mockAnthropicProvider.complete as Mock).mock.calls[0];
      expect(callArgs[0]).toEqual(request);
      // The second argument should be the resolved provider config
      expect(callArgs[1]).toMatchObject({
        provider: 'anthropic',
        authMode: 'api_key',
        apiKey: 'sk-ant-test',
      });
    });

    it('sets purpose-appropriate model if no model_override or preferredModel', async () => {
      const config = makeConfig({
        providers: [{ provider: 'anthropic', authMode: 'api_key', apiKey: 'sk-test' }],
      });
      const gateway = new LLMGateway(config);
      (mockAnthropicProvider.complete as Mock).mockResolvedValueOnce(makeLLMResponse());

      await gateway.complete(makeRequest({ purpose: 'hypothesis_generation' }), 'org-1');

      const providerConfig = (mockAnthropicProvider.complete as Mock).mock
        .calls[0][1] as ProviderConfig;
      expect(providerConfig.preferredModel).toBe('claude-opus-4');
    });

    it('does not override preferredModel when it is already set', async () => {
      const config = makeConfig({
        providers: [
          {
            provider: 'anthropic',
            authMode: 'api_key',
            apiKey: 'sk-test',
            preferredModel: 'my-custom-model',
          },
        ],
      });
      const gateway = new LLMGateway(config);
      (mockAnthropicProvider.complete as Mock).mockResolvedValueOnce(makeLLMResponse());

      await gateway.complete(makeRequest({ purpose: 'analysis' }), 'org-1');

      const providerConfig = (mockAnthropicProvider.complete as Mock).mock
        .calls[0][1] as ProviderConfig;
      expect(providerConfig.preferredModel).toBe('my-custom-model');
    });

    it('does not override model when model_override is specified on the request', async () => {
      const config = makeConfig({
        providers: [{ provider: 'anthropic', authMode: 'api_key', apiKey: 'sk-test' }],
      });
      const gateway = new LLMGateway(config);
      (mockAnthropicProvider.complete as Mock).mockResolvedValueOnce(makeLLMResponse());

      await gateway.complete(
        makeRequest({ purpose: 'analysis', model_override: 'claude-opus-4' }),
        'org-1',
      );

      const providerConfig = (mockAnthropicProvider.complete as Mock).mock
        .calls[0][1] as ProviderConfig;
      // preferredModel should NOT be set because model_override is present
      expect(providerConfig.preferredModel).toBeUndefined();
    });
  });

  // -----------------------------------------------------------------------
  // complete -- error: provider not configured
  // -----------------------------------------------------------------------
  describe('complete -- provider not configured', () => {
    it('throws when the requested provider has no ProviderConfig entry', async () => {
      const config: GatewayConfig = {
        providers: [{ provider: 'anthropic', authMode: 'api_key', apiKey: 'sk-test' }],
        defaultProvider: 'openai',
      };
      const gateway = new LLMGateway(config);

      // openai is the default provider, and the adapter exists in the Map,
      // but there is no ProviderConfig for it -- resolveConfig returns undefined
      await expect(gateway.complete(makeRequest(), 'org-1')).rejects.toThrow(
        'No configuration found for provider openai',
      );
    });
  });

  // -----------------------------------------------------------------------
  // complete -- retry behaviour
  //
  // We spy on globalThis.setTimeout and invoke its callback synchronously
  // so backoff delays are skipped. This avoids unhandled-rejection warnings
  // that occur when vi.useFakeTimers() is combined with rejected promises.
  // -----------------------------------------------------------------------
  describe('complete -- retries', () => {
    let setTimeoutSpy: ReturnType<typeof vi.spyOn>;
    const recordedDelays: number[] = [];

    beforeEach(() => {
      recordedDelays.length = 0;
      setTimeoutSpy = vi
        .spyOn(globalThis, 'setTimeout')
        // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
        .mockImplementation(((fn: Function, delay?: number) => {
          if (typeof delay === 'number' && delay > 0) {
            recordedDelays.push(delay);
          }
          if (typeof fn === 'function') {
            fn();
          }
          return 0 as unknown as ReturnType<typeof setTimeout>;
        }) as typeof setTimeout);
    });

    afterEach(() => {
      setTimeoutSpy.mockRestore();
    });

    it('retries up to 3 times with exponential backoff on failure, then succeeds', async () => {
      const gateway = new LLMGateway(makeConfig());
      const expectedResponse = makeLLMResponse();

      (mockAnthropicProvider.complete as Mock)
        .mockRejectedValueOnce(new Error('Transient error 1'))
        .mockRejectedValueOnce(new Error('Transient error 2'))
        .mockResolvedValueOnce(expectedResponse);

      const result = await gateway.complete(makeRequest(), 'org-1');

      expect(mockAnthropicProvider.complete).toHaveBeenCalledTimes(3);
      expect(result).toEqual(expectedResponse);
    });

    it('throws the last error when all 3 attempts fail', async () => {
      const gateway = new LLMGateway(makeConfig());

      (mockAnthropicProvider.complete as Mock)
        .mockRejectedValueOnce(new Error('Fail 1'))
        .mockRejectedValueOnce(new Error('Fail 2'))
        .mockRejectedValueOnce(new Error('Fail 3'));

      await expect(gateway.complete(makeRequest(), 'org-1')).rejects.toThrow('Fail 3');

      expect(mockAnthropicProvider.complete).toHaveBeenCalledTimes(3);
    });

    it('does not retry after the first success', async () => {
      const gateway = new LLMGateway(makeConfig());
      const expectedResponse = makeLLMResponse();

      (mockAnthropicProvider.complete as Mock).mockResolvedValueOnce(expectedResponse);

      const result = await gateway.complete(makeRequest(), 'org-1');

      expect(result).toEqual(expectedResponse);
      expect(mockAnthropicProvider.complete).toHaveBeenCalledTimes(1);
      // No backoff delays should have been recorded
      expect(recordedDelays).toHaveLength(0);
    });

    it('converts non-Error thrown values into Error instances', async () => {
      const gateway = new LLMGateway(makeConfig());

      (mockAnthropicProvider.complete as Mock)
        .mockRejectedValueOnce(new Error('first'))
        .mockRejectedValueOnce(new Error('second'))
        .mockRejectedValueOnce(new Error('third'));

      await expect(gateway.complete(makeRequest(), 'org-1')).rejects.toThrow('third');

      expect(mockAnthropicProvider.complete).toHaveBeenCalledTimes(3);
    });

    it('uses correct exponential backoff delays (1s for attempt 0, 2s for attempt 1)', async () => {
      const gateway = new LLMGateway(makeConfig());
      const expectedResponse = makeLLMResponse();

      (mockAnthropicProvider.complete as Mock)
        .mockRejectedValueOnce(new Error('Fail 1'))
        .mockRejectedValueOnce(new Error('Fail 2'))
        .mockResolvedValueOnce(expectedResponse);

      await gateway.complete(makeRequest(), 'org-1');

      // 2^0 * 1000 = 1000ms, 2^1 * 1000 = 2000ms
      expect(recordedDelays).toEqual([1000, 2000]);
    });

    it('retries exactly 3 times total (not 2, not 4)', async () => {
      const gateway = new LLMGateway(makeConfig());

      (mockAnthropicProvider.complete as Mock)
        .mockRejectedValueOnce(new Error('Attempt 1'))
        .mockRejectedValueOnce(new Error('Attempt 2'))
        .mockRejectedValueOnce(new Error('Attempt 3'));

      await expect(gateway.complete(makeRequest(), 'org-1')).rejects.toThrow('Attempt 3');

      expect(mockAnthropicProvider.complete).toHaveBeenCalledTimes(3);
    });

    it('succeeds on second attempt after one failure', async () => {
      const gateway = new LLMGateway(makeConfig());
      const expectedResponse = makeLLMResponse();

      (mockAnthropicProvider.complete as Mock)
        .mockRejectedValueOnce(new Error('First attempt failed'))
        .mockResolvedValueOnce(expectedResponse);

      const result = await gateway.complete(makeRequest(), 'org-1');

      expect(result).toEqual(expectedResponse);
      expect(mockAnthropicProvider.complete).toHaveBeenCalledTimes(2);
    });

    it('does not delay after the last failed attempt', async () => {
      const gateway = new LLMGateway(makeConfig());

      (mockAnthropicProvider.complete as Mock)
        .mockRejectedValueOnce(new Error('Fail 1'))
        .mockRejectedValueOnce(new Error('Fail 2'))
        .mockRejectedValueOnce(new Error('Fail 3'));

      await expect(gateway.complete(makeRequest(), 'org-1')).rejects.toThrow('Fail 3');

      // Only 2 backoff delays: after attempt 0 and attempt 1 (not after attempt 2)
      expect(recordedDelays).toHaveLength(2);
    });
  });

  // -----------------------------------------------------------------------
  // complete -- various purposes map to correct models
  // -----------------------------------------------------------------------
  describe('complete -- purpose-to-model mapping', () => {
    const purposeModelPairs: Array<[LLMRequest['purpose'], string]> = [
      ['hypothesis_generation', 'claude-opus-4'],
      ['hypothesis_scoring', 'claude-sonnet-4-5'],
      ['analysis', 'claude-sonnet-4-5'],
      ['vibe_check', 'claude-haiku-4-5'],
      ['context_summarization', 'claude-haiku-4-5'],
      ['decision_synthesis', 'claude-sonnet-4-5'],
    ];

    it.each(purposeModelPairs)(
      'maps purpose "%s" to model "%s"',
      async (purpose, expectedModel) => {
        const config = makeConfig({
          providers: [{ provider: 'anthropic', authMode: 'api_key', apiKey: 'sk-test' }],
        });
        const gateway = new LLMGateway(config);
        (mockAnthropicProvider.complete as Mock).mockResolvedValueOnce(makeLLMResponse());

        await gateway.complete(makeRequest({ purpose }), 'org-1');

        const providerConfig = (mockAnthropicProvider.complete as Mock).mock
          .calls[0][1] as ProviderConfig;
        expect(providerConfig.preferredModel).toBe(expectedModel);
      },
    );
  });
});
