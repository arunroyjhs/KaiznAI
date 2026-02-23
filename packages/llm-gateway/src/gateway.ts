import type {
  LLMRequest,
  LLMResponse,
  ProviderConfig,
  ProviderAdapter,
  ProviderSlug,
  LLMPurpose,
} from './types.js';
import { AnthropicProvider } from './providers/anthropic.js';
import { OpenAIProvider } from './providers/openai.js';
import { PerplexityProvider } from './providers/perplexity.js';
import { OllamaProvider } from './providers/ollama.js';

const PURPOSE_MODEL_MAP: Record<LLMPurpose, string> = {
  hypothesis_generation: 'claude-opus-4',
  hypothesis_scoring: 'claude-sonnet-4-5',
  analysis: 'claude-sonnet-4-5',
  vibe_check: 'claude-haiku-4-5',
  context_summarization: 'claude-haiku-4-5',
  decision_synthesis: 'claude-sonnet-4-5',
};

export interface GatewayConfig {
  providers: ProviderConfig[];
  defaultProvider: ProviderSlug;
}

export class LLMGateway {
  private providers: Map<ProviderSlug, ProviderAdapter>;
  private config: GatewayConfig;

  constructor(config: GatewayConfig) {
    this.config = config;
    this.providers = new Map();
    this.providers.set('anthropic', new AnthropicProvider());
    this.providers.set('openai', new OpenAIProvider());
    this.providers.set('perplexity', new PerplexityProvider());
    this.providers.set('ollama', new OllamaProvider());
  }

  async complete(request: LLMRequest, orgId: string): Promise<LLMResponse> {
    const providerSlug = request.provider_override ?? this.config.defaultProvider;
    const provider = this.providers.get(providerSlug);

    if (!provider) {
      throw new Error(`Provider ${providerSlug} not configured`);
    }

    const providerConfig = this.resolveConfig(providerSlug, request.purpose);

    if (!providerConfig) {
      throw new Error(`No configuration found for provider ${providerSlug}`);
    }

    // Set purpose-appropriate model if not overridden
    if (!request.model_override && !providerConfig.preferredModel) {
      providerConfig.preferredModel = PURPOSE_MODEL_MAP[request.purpose];
    }

    // Retry with exponential backoff (3 retries per error handling standards)
    let lastError: Error | undefined;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const result = await provider.complete(request, providerConfig);
        return result;
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
        if (attempt < 2) {
          const delay = Math.pow(2, attempt) * 1000;
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError ?? new Error('LLM request failed after retries');
  }

  private resolveConfig(providerSlug: ProviderSlug, _purpose: LLMPurpose): ProviderConfig | undefined {
    return this.config.providers.find((p) => p.provider === providerSlug);
  }

  getProvider(slug: ProviderSlug): ProviderAdapter | undefined {
    return this.providers.get(slug);
  }
}
