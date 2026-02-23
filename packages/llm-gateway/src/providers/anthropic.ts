import Anthropic from '@anthropic-ai/sdk';
import { BaseProvider } from './base.js';
import type { LLMRequest, LLMResponse, ProviderConfig } from '../types.js';

const ANTHROPIC_MODELS = [
  'claude-opus-4',
  'claude-sonnet-4-5',
  'claude-haiku-4-5',
] as const;

const DEFAULT_MODEL = 'claude-sonnet-4-5';

export class AnthropicProvider extends BaseProvider {
  readonly name = 'anthropic' as const;

  async complete(request: LLMRequest, config: ProviderConfig): Promise<LLMResponse> {
    const client = new Anthropic({
      apiKey: config.apiKey,
    });

    const model = request.model_override ?? config.preferredModel ?? DEFAULT_MODEL;
    const maxTokens = request.max_tokens ?? 4096;
    const startTime = Date.now();

    const { system, messages } = this.buildMessages(request);

    const response = await client.messages.create({
      model,
      max_tokens: maxTokens,
      system: system ?? undefined,
      messages: messages.map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
      temperature: request.temperature,
    });

    const latencyMs = Date.now() - startTime;
    const textContent = response.content.find((c) => c.type === 'text');

    return {
      content: textContent?.text ?? '',
      provider_used: 'anthropic',
      model_used: model,
      auth_mode_used: config.authMode,
      input_tokens: response.usage.input_tokens,
      output_tokens: response.usage.output_tokens,
      latency_ms: latencyMs,
    };
  }

  listModels(): string[] {
    return [...ANTHROPIC_MODELS];
  }
}
