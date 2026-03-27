import type {
  Provider,
  ProviderMessage,
  ProviderResponse,
  ChatOptions,
  ModelInfo,
} from "./base.js";

const MODELS: ModelInfo[] = [
  { id: "gpt-4o", provider: "openai", description: "GPT-4o - fast multimodal model" },
  { id: "gpt-4o-mini", provider: "openai", description: "GPT-4o Mini - lightweight and cost-effective" },
  { id: "o3", provider: "openai", description: "o3 - advanced reasoning model" },
  { id: "o3-mini", provider: "openai", description: "o3-mini - efficient reasoning model" },
  { id: "codex", provider: "openai", description: "Codex - code generation model" },
];

export class OpenAIProvider implements Provider {
  readonly name = "openai";
  private client: any = null;

  private async getClient(): Promise<any> {
    if (this.client) return this.client;

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error("OPENAI_API_KEY environment variable is not set");
    }

    try {
      const mod = await import("openai");
      const OpenAI = mod.default ?? mod.OpenAI;
      this.client = new OpenAI({ apiKey });
      return this.client;
    } catch {
      throw new Error(
        'OpenAI SDK not installed. Run: npm install openai',
      );
    }
  }

  async chat(
    messages: ProviderMessage[],
    options?: ChatOptions,
  ): Promise<ProviderResponse> {
    const client = await this.getClient();
    const model = options?.model ?? "gpt-4o";

    const response = await client.chat.completions.create({
      model,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
      ...(options?.temperature != null ? { temperature: options.temperature } : {}),
    });

    const choice = response.choices[0];
    return {
      content: choice.message.content ?? "",
      model: response.model,
      usage: response.usage
        ? {
            inputTokens: response.usage.prompt_tokens,
            outputTokens: response.usage.completion_tokens,
          }
        : undefined,
    };
  }

  listModels(): ModelInfo[] {
    return MODELS;
  }
}
