import type { LLMRequest, LLMResponse, ProviderConfig, ProviderAdapter, ProviderSlug } from '../types.js';

export abstract class BaseProvider implements ProviderAdapter {
  abstract readonly name: ProviderSlug;
  abstract complete(request: LLMRequest, config: ProviderConfig): Promise<LLMResponse>;
  abstract listModels(): string[];

  protected buildMessages(request: LLMRequest): { system?: string; messages: Array<{ role: string; content: string }> } {
    const messages = request.messages.map((m) => ({
      role: m.role,
      content: m.content,
    }));

    return {
      system: request.system,
      messages,
    };
  }
}
