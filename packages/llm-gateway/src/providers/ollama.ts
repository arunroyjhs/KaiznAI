import { BaseProvider } from './base.js';
import type { LLMRequest, LLMResponse, ProviderConfig } from '../types.js';

const OLLAMA_DEFAULT_MODELS = [
  'llama3.1',
  'codellama',
  'mistral',
] as const;

const DEFAULT_MODEL = 'llama3.1';

const OLLAMA_API_BASE = 'http://localhost:11434';

interface OllamaMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface OllamaChatRequestBody {
  model: string;
  messages: OllamaMessage[];
  stream: false;
  options?: {
    temperature?: number;
    num_predict?: number;
  };
  format?: 'json';
}

interface OllamaChatResponse {
  model: string;
  message: {
    role: string;
    content: string;
  };
  done: boolean;
  prompt_eval_count?: number;
  eval_count?: number;
}

interface OllamaTagsResponse {
  models: Array<{
    name: string;
    model: string;
    size: number;
    digest: string;
    modified_at: string;
  }>;
}

export class OllamaProvider extends BaseProvider {
  readonly name = 'ollama' as const;

  private baseUrl: string;

  constructor(baseUrl?: string) {
    super();
    this.baseUrl = baseUrl ?? OLLAMA_API_BASE;
  }

  async complete(request: LLMRequest, config: ProviderConfig): Promise<LLMResponse> {
    const model = request.model_override ?? config.preferredModel ?? DEFAULT_MODEL;
    const startTime = Date.now();

    const { system, messages } = this.buildMessages(request);

    const allMessages: OllamaMessage[] = [];
    if (system) {
      allMessages.push({ role: 'system', content: system });
    }
    allMessages.push(
      ...messages.map((m) => ({
        role: m.role as 'user' | 'assistant' | 'system',
        content: m.content,
      })),
    );

    const body: OllamaChatRequestBody = {
      model,
      messages: allMessages,
      stream: false,
      options: {
        temperature: request.temperature ?? undefined,
        num_predict: request.max_tokens ?? undefined,
      },
    };

    if (request.response_format === 'json_object') {
      body.format = 'json';
    }

    const res = await fetch(`${this.baseUrl}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errorBody = await res.text().catch(() => 'Unknown error');
      throw new Error(`Ollama API error (${res.status}): ${errorBody}`);
    }

    const response = (await res.json()) as OllamaChatResponse;
    const latencyMs = Date.now() - startTime;

    return {
      content: response.message?.content ?? '',
      provider_used: 'ollama',
      model_used: model,
      auth_mode_used: config.authMode,
      input_tokens: response.prompt_eval_count ?? 0,
      output_tokens: response.eval_count ?? 0,
      latency_ms: latencyMs,
    };
  }

  /**
   * List locally installed Ollama models via GET /api/tags.
   * Falls back to the default model list if the Ollama server is unreachable.
   */
  listModels(): string[] {
    // Synchronous interface -- return well-known defaults.
    // Use listModelsAsync() for the live list from the local server.
    return [...OLLAMA_DEFAULT_MODELS];
  }

  /**
   * Async variant that queries the running Ollama instance for installed models.
   */
  async listModelsAsync(): Promise<string[]> {
    try {
      const res = await fetch(`${this.baseUrl}/api/tags`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!res.ok) {
        return [...OLLAMA_DEFAULT_MODELS];
      }

      const data = (await res.json()) as OllamaTagsResponse;
      return data.models.map((m) => m.name);
    } catch {
      // Ollama server not running -- return defaults
      return [...OLLAMA_DEFAULT_MODELS];
    }
  }
}
