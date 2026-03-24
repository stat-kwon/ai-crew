export interface ProviderMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface ProviderResponse {
  content: string;
  model: string;
  usage?: { inputTokens: number; outputTokens: number };
}

export interface ModelInfo {
  id: string;
  provider: string;
  description: string;
}

export interface ChatOptions {
  model?: string;
  temperature?: number;
}

export interface Provider {
  name: string;
  chat(
    messages: ProviderMessage[],
    options?: ChatOptions,
  ): Promise<ProviderResponse>;
  listModels(): ModelInfo[];
}
