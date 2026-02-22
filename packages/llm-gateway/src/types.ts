export type LLMPurpose =
  | 'hypothesis_generation'
  | 'hypothesis_scoring'
  | 'analysis'
  | 'vibe_check'
  | 'context_summarization'
  | 'decision_synthesis';

export type ProviderSlug = 'anthropic' | 'openai' | 'perplexity' | 'ollama';
export type AuthMode = 'api_key' | 'oauth_account';

export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface LLMRequest {
  messages: Message[];
  system?: string;
  temperature?: number;
  max_tokens?: number;
  response_format?: 'text' | 'json_object';
  purpose: LLMPurpose;
  provider_override?: ProviderSlug;
  model_override?: string;
}

export interface LLMResponse {
  content: string;
  provider_used: ProviderSlug;
  model_used: string;
  auth_mode_used: AuthMode;
  input_tokens: number;
  output_tokens: number;
  latency_ms: number;
}

export interface ProviderConfig {
  provider: ProviderSlug;
  authMode: AuthMode;
  apiKey?: string;
  preferredModel?: string;
  fallbackModel?: string;
}

export interface ProviderAdapter {
  readonly name: ProviderSlug;
  complete(request: LLMRequest, config: ProviderConfig): Promise<LLMResponse>;
  listModels(): string[];
}
