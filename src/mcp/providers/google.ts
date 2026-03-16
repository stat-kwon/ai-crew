import type {
  Provider,
  ProviderMessage,
  ProviderResponse,
  ChatOptions,
  ModelInfo,
} from "./base.js";

const MODELS: ModelInfo[] = [
  { id: "gemini-2.5-pro", provider: "google", description: "Gemini 2.5 Pro - advanced reasoning and coding" },
  { id: "gemini-2.5-flash", provider: "google", description: "Gemini 2.5 Flash - fast and efficient" },
  { id: "gemini-2.0-flash", provider: "google", description: "Gemini 2.0 Flash - previous gen fast model" },
];

export class GoogleProvider implements Provider {
  readonly name = "google";
  private genAI: any = null;

  private async getGenAI(): Promise<any> {
    if (this.genAI) return this.genAI;

    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      throw new Error("GOOGLE_API_KEY environment variable is not set");
    }

    try {
      const mod = await import("@google/generative-ai");
      const GoogleGenerativeAI = mod.GoogleGenerativeAI ?? mod.default;
      this.genAI = new GoogleGenerativeAI(apiKey);
      return this.genAI;
    } catch {
      throw new Error(
        'Google Generative AI SDK not installed. Run: npm install @google/generative-ai',
      );
    }
  }

  async chat(
    messages: ProviderMessage[],
    options?: ChatOptions,
  ): Promise<ProviderResponse> {
    const genAI = await this.getGenAI();
    const modelId = options?.model ?? "gemini-2.5-pro";

    // Separate system prompt from conversation history
    const systemMessages = messages.filter((m) => m.role === "system");
    const chatMessages = messages.filter((m) => m.role !== "system");
    const systemInstruction = systemMessages.map((m) => m.content).join("\n");

    const model = genAI.getGenerativeModel({
      model: modelId,
      ...(systemInstruction ? { systemInstruction } : {}),
      ...(options?.temperature != null
        ? { generationConfig: { temperature: options.temperature } }
        : {}),
    });

    // Convert messages to Gemini format (alternating user/model)
    const history = chatMessages.slice(0, -1).map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));

    const lastMessage = chatMessages[chatMessages.length - 1];
    if (!lastMessage) {
      throw new Error("No user message provided");
    }

    const chat = model.startChat({ history });
    const result = await chat.sendMessage(lastMessage.content);
    const response = result.response;

    return {
      content: response.text(),
      model: modelId,
      usage: response.usageMetadata
        ? {
            inputTokens: response.usageMetadata.promptTokenCount ?? 0,
            outputTokens: response.usageMetadata.candidatesTokenCount ?? 0,
          }
        : undefined,
    };
  }

  listModels(): ModelInfo[] {
    return MODELS;
  }
}
