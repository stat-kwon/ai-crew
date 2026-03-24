import type { Provider, ModelInfo } from "./providers/base.js";

interface ModelCatalogEntry {
  modelId: string;
  providerName: string;
}

/** Known model-to-provider mappings */
const MODEL_CATALOG: ModelCatalogEntry[] = [
  // OpenAI (standard API key)
  { modelId: "gpt-4o", providerName: "openai" },
  { modelId: "gpt-4o-mini", providerName: "openai" },
  { modelId: "o3", providerName: "openai" },
  { modelId: "o3-mini", providerName: "openai" },
  // Codex (ChatGPT OAuth token)
  { modelId: "codex-mini-latest", providerName: "codex" },
  { modelId: "gpt-5.2-codex", providerName: "codex" },
  { modelId: "gpt-5.1-codex", providerName: "codex" },
  { modelId: "gpt-5.1-codex-mini", providerName: "codex" },
  // Google
  { modelId: "gemini-2.5-pro", providerName: "google" },
  { modelId: "gemini-2.5-flash", providerName: "google" },
  { modelId: "gemini-2.0-flash", providerName: "google" },
];

export class ProviderRegistry {
  private providers = new Map<string, Provider>();
  private initErrors = new Map<string, string>();

  /** Lazily initialize and return a provider by name */
  private async getProvider(name: string): Promise<Provider> {
    const cached = this.providers.get(name);
    if (cached) return cached;

    const cachedError = this.initErrors.get(name);
    if (cachedError) throw new Error(cachedError);

    try {
      let provider: Provider;
      switch (name) {
        case "openai": {
          const { OpenAIProvider } = await import("./providers/openai.js");
          provider = new OpenAIProvider();
          break;
        }
        case "codex": {
          const { CodexProvider } = await import("./providers/codex.js");
          provider = new CodexProvider();
          break;
        }
        case "google": {
          const { GoogleProvider } = await import("./providers/google.js");
          provider = new GoogleProvider();
          break;
        }
        default:
          throw new Error(`Unknown provider: ${name}`);
      }

      this.providers.set(name, provider);
      return provider;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.initErrors.set(name, message);
      throw err;
    }
  }

  /** Resolve a model ID to its provider name */
  private resolveProvider(modelId: string): string {
    const entry = MODEL_CATALOG.find((e) => e.modelId === modelId);
    if (entry) return entry.providerName;

    // Heuristic: prefix-based routing
    if (modelId.startsWith("gpt-") && modelId.includes("codex")) {
      return "codex";
    }
    if (modelId.startsWith("codex")) {
      return "codex";
    }
    if (modelId.startsWith("gpt-") || modelId.startsWith("o3")) {
      return "openai";
    }
    if (modelId.startsWith("gemini")) {
      return "google";
    }

    throw new Error(
      `Unknown model "${modelId}". Use list_models to see available models.`,
    );
  }

  /** Get the provider for a specific model */
  async getProviderForModel(modelId: string): Promise<Provider> {
    const providerName = this.resolveProvider(modelId);
    return this.getProvider(providerName);
  }

  /** List all available models across all providers */
  listAllModels(): ModelInfo[] {
    const models: ModelInfo[] = [];

    // Return the catalog statically -- we don't need to instantiate providers
    // just to list models.
    for (const entry of MODEL_CATALOG) {
      models.push({
        id: entry.modelId,
        provider: entry.providerName,
        description: getModelDescription(entry.modelId),
      });
    }

    return models;
  }
}

function getModelDescription(modelId: string): string {
  const descriptions: Record<string, string> = {
    "gpt-4o": "GPT-4o - fast multimodal model",
    "gpt-4o-mini": "GPT-4o Mini - lightweight and cost-effective",
    "o3": "o3 - advanced reasoning model",
    "o3-mini": "o3-mini - efficient reasoning model",
    "codex-mini-latest": "Codex Mini - lightweight code model (latest)",
    "gpt-5.2-codex": "GPT-5.2 Codex - advanced code generation",
    "gpt-5.1-codex": "GPT-5.1 Codex - code generation",
    "gpt-5.1-codex-mini": "GPT-5.1 Codex Mini - efficient code generation",
    "gemini-2.5-pro": "Gemini 2.5 Pro - advanced reasoning and coding",
    "gemini-2.5-flash": "Gemini 2.5 Flash - fast and efficient",
    "gemini-2.0-flash": "Gemini 2.0 Flash - previous gen fast model",
  };
  return descriptions[modelId] ?? modelId;
}

/** Singleton registry */
export const registry = new ProviderRegistry();
