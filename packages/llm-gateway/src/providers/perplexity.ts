import { BaseProvider } from './base.js';
import type { LLMRequest, LLMResponse, ProviderConfig } from '../types.js';

const PERPLEXITY_MODELS = [
  'llama-3.1-sonar-large-128k-online',
  'llama-3.1-sonar-small-128k-online',
  'sonar-pro',
] as const;

const DEFAULT_MODEL = 'llama-3.1-sonar-large-128k-online';

const PERPLEXITY_API_BASE = 'https://api.perplexity.ai';

interface PerplexityMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface PerplexityRequestBody {
  model: string;
  messages: PerplexityMessage[];
  temperature?: number;
  max_tokens?: number;
}

interface PerplexityResponse {
  id: string;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export class PerplexityProvider extends BaseProvider {
  readonly name = 'perplexity' as const;

  async complete(request: LLMRequest, config: ProviderConfig): Promise<LLMResponse> {
    if (!config.apiKey) {
      throw new Error('Perplexity API key is required');
    }

    const model = request.model_override ?? config.preferredModel ?? DEFAULT_MODEL;
    const startTime = Date.now();

    const { system, messages } = this.buildMessages(request);

    const allMessages: PerplexityMessage[] = [];
    if (system) {
      allMessages.push({ role: 'system', content: system });
    }
    allMessages.push(
      ...messages.map((m) => ({
        role: m.role as 'user' | 'assistant' | 'system',
        content: m.content,
      })),
    );

    const body: PerplexityRequestBody = {
      model,
      messages: allMessages,
      temperature: request.temperature ?? undefined,
      max_tokens: request.max_tokens ?? 4096,
    };

    const res = await fetch(`${PERPLEXITY_API_BASE}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errorBody = await res.text().catch(() => 'Unknown error');
      throw new Error(`Perplexity API error (${res.status}): ${errorBody}`);
    }

    const response = (await res.json()) as PerplexityResponse;
    const latencyMs = Date.now() - startTime;

    return {
      content: response.choices[0]?.message?.content ?? '',
      provider_used: 'perplexity',
      model_used: model,
      auth_mode_used: config.authMode,
      input_tokens: response.usage?.prompt_tokens ?? 0,
      output_tokens: response.usage?.completion_tokens ?? 0,
      latency_ms: latencyMs,
    };
  }

  listModels(): string[] {
    return [...PERPLEXITY_MODELS];
  }
}
