import OpenAI from 'openai';
import { BaseProvider } from './base.js';
import type { LLMRequest, LLMResponse, ProviderConfig } from '../types.js';

const OPENAI_MODELS = [
  'gpt-4o',
  'gpt-4o-mini',
  'o1',
  'o3-mini',
] as const;

const DEFAULT_MODEL = 'gpt-4o';

export class OpenAIProvider extends BaseProvider {
  readonly name = 'openai' as const;

  async complete(request: LLMRequest, config: ProviderConfig): Promise<LLMResponse> {
    const client = new OpenAI({
      apiKey: config.apiKey,
    });

    const model = request.model_override ?? config.preferredModel ?? DEFAULT_MODEL;
    const startTime = Date.now();

    const { system, messages } = this.buildMessages(request);

    const allMessages: OpenAI.ChatCompletionMessageParam[] = [];
    if (system) {
      allMessages.push({ role: 'system', content: system });
    }
    allMessages.push(
      ...messages.map((m) => ({
        role: m.role as 'user' | 'assistant' | 'system',
        content: m.content,
      })),
    );

    const response = await client.chat.completions.create({
      model,
      messages: allMessages,
      temperature: request.temperature ?? undefined,
      max_tokens: request.max_tokens ?? 4096,
      response_format: request.response_format === 'json_object'
        ? { type: 'json_object' as const }
        : undefined,
    });

    const latencyMs = Date.now() - startTime;

    return {
      content: response.choices[0]?.message?.content ?? '',
      provider_used: 'openai',
      model_used: model,
      auth_mode_used: config.authMode,
      input_tokens: response.usage?.prompt_tokens ?? 0,
      output_tokens: response.usage?.completion_tokens ?? 0,
      latency_ms: latencyMs,
    };
  }

  listModels(): string[] {
    return [...OPENAI_MODELS];
  }
}
