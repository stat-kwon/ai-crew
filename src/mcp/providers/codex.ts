import type {
  Provider,
  ProviderMessage,
  ProviderResponse,
  ChatOptions,
  ModelInfo,
} from "./base.js";

const MODELS: ModelInfo[] = [
  { id: "codex-mini-latest", provider: "codex", description: "Codex Mini - lightweight code model (latest)" },
  { id: "gpt-5.2-codex", provider: "codex", description: "GPT-5.2 Codex - advanced code generation" },
  { id: "gpt-5.1-codex", provider: "codex", description: "GPT-5.1 Codex - code generation" },
  { id: "gpt-5.1-codex-mini", provider: "codex", description: "GPT-5.1 Codex Mini - efficient code generation" },
];

/**
 * Codex provider — uses ChatGPT OAuth token instead of standard API key.
 * Authenticates via CHATGPT_TOKEN environment variable.
 */
export class CodexProvider implements Provider {
  readonly name = "codex";
  private client: any = null;

  private async getClient(): Promise<any> {
    if (this.client) return this.client;

    const token = process.env.CHATGPT_TOKEN;
    if (!token) {
      throw new Error("CHATGPT_TOKEN environment variable is not set");
    }

    try {
      const mod = await import("openai");
      const OpenAI = mod.default ?? mod.OpenAI;
      this.client = new OpenAI({
        apiKey: token,
        baseURL: "https://api.openai.com/v1",
      });
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
    const model = options?.model ?? "codex-mini-latest";

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
