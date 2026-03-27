import type {
  Provider,
  ProviderMessage,
  ProviderResponse,
  ChatOptions,
  ModelInfo,
} from "./base.js";

import { execSync } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { createHash } from "node:crypto";
import { platform, release, arch } from "node:os";

// ── Constants ────────────────────────────────────────────────

const CODEX_API_URL = "https://chatgpt.com/backend-api/codex/responses";
const JWT_CLAIM_PATH = "https://api.openai.com/auth";

const MODELS: ModelInfo[] = [
  { id: "gpt-5.4", provider: "codex", description: "GPT-5.4 - latest flagship model" },
  { id: "gpt-5.3-codex", provider: "codex", description: "GPT-5.3 Codex - advanced code generation" },
  { id: "gpt-5.3-codex-spark", provider: "codex", description: "GPT-5.3 Codex Spark - with reasoning/thinking" },
  { id: "gpt-5.2-codex", provider: "codex", description: "GPT-5.2 Codex - code generation" },
  { id: "gpt-5.2", provider: "codex", description: "GPT-5.2 - general purpose" },
  { id: "gpt-5.1-codex", provider: "codex", description: "GPT-5.1 Codex - code generation" },
];

// Models that support reasoning/thinking tokens
const REASONING_MODELS = new Set(["gpt-5.4", "gpt-5.3-codex", "gpt-5.3-codex-spark", "gpt-5.2-codex", "gpt-5.1-codex"]);

// ── Credential Loading ──────────────────────────────────────

interface CodexCredentials {
  accessToken: string;
  accountId: string;
  refreshToken?: string;
}

function resolveCodexHome(): string {
  const configured = process.env.CODEX_HOME;
  if (configured) return configured;
  return join(process.env.HOME ?? "~", ".codex");
}

function extractAccountId(token: string): string {
  const parts = token.split(".");
  if (parts.length !== 3) throw new Error("Invalid JWT token format");

  let payload64 = parts[1];
  const padding = 4 - (payload64.length % 4);
  if (padding !== 4) payload64 += "=".repeat(padding);

  const payload = JSON.parse(
    Buffer.from(payload64, "base64url").toString("utf-8"),
  );
  const authClaim = payload[JWT_CLAIM_PATH] ?? {};
  // Try chatgpt_account_user_id first (used by openclaw), then chatgpt_account_id
  const accountId = authClaim.chatgpt_account_user_id ?? authClaim.chatgpt_account_id;
  if (!accountId) throw new Error("No account ID in token");
  return accountId;
}

function extractChatgptAccountId(token: string): string {
  const parts = token.split(".");
  if (parts.length !== 3) return "";

  let payload64 = parts[1];
  const padding = 4 - (payload64.length % 4);
  if (padding !== 4) payload64 += "=".repeat(padding);

  const payload = JSON.parse(
    Buffer.from(payload64, "base64url").toString("utf-8"),
  );
  return payload[JWT_CLAIM_PATH]?.chatgpt_account_id ?? "";
}

function readKeychainCredentials(): CodexCredentials | null {
  if (platform() !== "darwin") return null;

  const codexHome = resolveCodexHome();
  const hash = createHash("sha256").update(codexHome).digest("hex");
  const account = `cli|${hash.slice(0, 16)}`;

  try {
    const result = execSync(
      `security find-generic-password -s "Codex Auth" -a "${account}" -w`,
      { timeout: 5000, encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"] },
    ).trim();

    const parsed = JSON.parse(result);
    const tokens = parsed.tokens ?? {};
    const accessToken = tokens.access_token;
    if (!accessToken) return null;

    return {
      accessToken,
      accountId: tokens.account_id ?? extractAccountId(accessToken),
      refreshToken: tokens.refresh_token,
    };
  } catch {
    return null;
  }
}

function readFileCredentials(): CodexCredentials | null {
  const authPath = join(resolveCodexHome(), "auth.json");
  if (!existsSync(authPath)) return null;

  try {
    const data = JSON.parse(readFileSync(authPath, "utf-8"));

    // Direct token
    if (data.access_token) {
      return {
        accessToken: data.access_token,
        accountId: data.account_id ?? extractAccountId(data.access_token),
        refreshToken: data.refresh_token,
      };
    }

    // Nested tokens object
    const tokens = data.tokens ?? {};
    if (tokens.access_token) {
      return {
        accessToken: tokens.access_token,
        accountId: tokens.account_id ?? extractAccountId(tokens.access_token),
        refreshToken: tokens.refresh_token,
      };
    }

    return null;
  } catch {
    return null;
  }
}

function loadCredentials(): CodexCredentials {
  // Environment variable override
  const envToken = process.env.CODEX_ACCESS_TOKEN;
  if (envToken) {
    return {
      accessToken: envToken,
      accountId: extractAccountId(envToken),
    };
  }

  // 1. macOS Keychain
  const keychainCreds = readKeychainCredentials();
  if (keychainCreds) return keychainCreds;

  // 2. File fallback (~/.codex/auth.json)
  const fileCreds = readFileCredentials();
  if (fileCreds) return fileCreds;

  throw new Error(
    "No Codex credentials found. Run 'codex auth' to authenticate.",
  );
}

// ── Message Conversion ──────────────────────────────────────

interface CodexMessage {
  role?: string;
  type?: string;
  content?: Array<Record<string, unknown>>;
  status?: string;
  [key: string]: unknown;
}

function convertMessages(messages: ProviderMessage[]): CodexMessage[] {
  const converted: CodexMessage[] = [];

  for (const msg of messages) {
    if (msg.role === "system") {
      // System messages are passed via "instructions" field, skip here
      continue;
    }

    if (msg.role === "user") {
      converted.push({
        role: "user",
        content: [{ type: "input_text", text: msg.content }],
      });
    } else if (msg.role === "assistant") {
      converted.push({
        type: "message",
        role: "assistant",
        content: [
          { type: "output_text", text: msg.content, annotations: [] },
        ],
        status: "completed",
      });
    }
  }

  return converted;
}

// ── SSE Response Parsing ────────────────────────────────────

interface ParsedResponse {
  content: string;
  thinkingContent: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
}

async function parseSSEResponse(response: Response): Promise<ParsedResponse> {
  const reader = response.body?.getReader();
  if (!reader) throw new Error("No response body");

  const decoder = new TextDecoder();
  let buffer = "";
  let content = "";
  let thinkingContent = "";
  let model = "";
  let inputTokens = 0;
  let outputTokens = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith("data:")) continue;

      const data = trimmed.slice(5).trim();
      if (data === "[DONE]") break;

      let event: Record<string, any>;
      try {
        event = JSON.parse(data);
      } catch {
        continue;
      }

      const eventType = event.type ?? "";

      if (eventType === "response.output_text.delta") {
        content += event.delta ?? "";
      } else if (eventType === "response.reasoning.delta") {
        // Thinking/reasoning tokens (spark models)
        thinkingContent += event.delta ?? "";
      } else if (
        eventType === "response.completed" ||
        eventType === "response.done"
      ) {
        const resp = event.response ?? {};
        model = resp.model ?? model;
        const usage = resp.usage ?? {};
        const cached =
          usage.input_tokens_details?.cached_tokens ?? 0;
        inputTokens = (usage.input_tokens ?? 0) - cached;
        outputTokens = usage.output_tokens ?? 0;
      } else if (eventType === "error") {
        throw new Error(`Codex error: ${event.message ?? "Unknown"}`);
      } else if (eventType === "response.failed") {
        const msg =
          event.response?.error?.message ?? "Response failed";
        throw new Error(`Codex error: ${msg}`);
      }
    }
  }

  return { content, thinkingContent, model, inputTokens, outputTokens };
}

// ── Non-Streaming Response Parsing ─────────────────────────

function parseDirectResponse(data: Record<string, any>): ParsedResponse {
  let content = "";
  let thinkingContent = "";

  const outputs = data.output ?? [];
  for (const output of outputs) {
    if (output.type === "message") {
      for (const item of output.content ?? []) {
        if (item.type === "output_text") {
          content += item.text ?? "";
        }
      }
    } else if (output.type === "reasoning") {
      for (const item of output.content ?? []) {
        thinkingContent += item.text ?? "";
      }
    }
  }

  const usage = data.usage ?? {};
  const cached = usage.input_tokens_details?.cached_tokens ?? 0;

  return {
    content,
    thinkingContent,
    model: data.model ?? "",
    inputTokens: (usage.input_tokens ?? 0) - cached,
    outputTokens: usage.output_tokens ?? 0,
  };
}

// ── Provider Implementation ─────────────────────────────────

export class CodexProvider implements Provider {
  readonly name = "codex";
  private credentials: CodexCredentials | null = null;

  private getCredentials(): CodexCredentials {
    if (!this.credentials) {
      this.credentials = loadCredentials();
    }
    return this.credentials;
  }

  async chat(
    messages: ProviderMessage[],
    options?: ChatOptions,
  ): Promise<ProviderResponse> {
    const creds = this.getCredentials();
    const model = options?.model ?? "gpt-5.4";
    // ChatGPT backend API requires streaming — non-streaming returns 400
    const useStreaming = true;

    // Extract system prompt
    const systemMessages = messages.filter((m) => m.role === "system");
    const systemPrompt = systemMessages.map((m) => m.content).join("\n");

    // Convert messages to Codex format
    const convertedMessages = convertMessages(messages);

    // Determine ChatGPT-Account-Id header
    const chatgptAccountId = extractChatgptAccountId(creds.accessToken);

    const headers: Record<string, string> = {
      Authorization: `Bearer ${creds.accessToken}`,
      "OpenAI-Beta": "responses=experimental",
      "User-Agent": `ai-crew (${platform()} ${release()}; ${arch()})`,
      "Content-Type": "application/json",
    };

    // Add ChatGPT-Account-Id if available
    if (chatgptAccountId) {
      headers["ChatGPT-Account-Id"] = chatgptAccountId;
    }

    if (useStreaming) {
      headers["Accept"] = "text/event-stream";
    }

    const body: Record<string, unknown> = {
      model,
      store: false,
      stream: useStreaming,
      instructions: systemPrompt,
      input: convertedMessages,
    };

    // Add reasoning support for compatible models
    if (options?.reasoning && REASONING_MODELS.has(model)) {
      body.reasoning = { effort: options.reasoning.effort };
    }

    if (options?.temperature != null) {
      body.temperature = options.temperature;
    }

    // Retry logic
    const maxRetries = 3;
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const response = await fetch(CODEX_API_URL, {
          method: "POST",
          headers,
          body: JSON.stringify(body),
        });

        if (!response.ok) {
          const errorText = await response.text();

          if (
            [429, 500, 502, 503, 504].includes(response.status) &&
            attempt < maxRetries - 1
          ) {
            const delay = 1000 * 2 ** attempt;
            await new Promise((r) => setTimeout(r, delay));
            continue;
          }

          let errMsg: string;
          try {
            const errData = JSON.parse(errorText);
            errMsg = errData.detail ?? errData.error?.message ?? errorText;
          } catch {
            errMsg = errorText;
          }
          throw new Error(`Codex API error (${response.status}): ${errMsg}`);
        }

        let parsed: ParsedResponse;
        if (useStreaming) {
          parsed = await parseSSEResponse(response);
        } else {
          const data = await response.json();
          parsed = parseDirectResponse(data);
        }

        // Include thinking content as prefix if present
        let finalContent = parsed.content;
        if (parsed.thinkingContent) {
          finalContent = `<thinking>\n${parsed.thinkingContent}\n</thinking>\n\n${parsed.content}`;
        }

        return {
          content: finalContent,
          model: parsed.model || model,
          usage: {
            inputTokens: parsed.inputTokens,
            outputTokens: parsed.outputTokens,
          },
        };
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
        if (attempt < maxRetries - 1 && lastError.message.includes("fetch")) {
          const delay = 1000 * 2 ** attempt;
          await new Promise((r) => setTimeout(r, delay));
          continue;
        }
        throw lastError;
      }
    }

    throw lastError ?? new Error("Max retries exceeded");
  }

  listModels(): ModelInfo[] {
    return MODELS;
  }
}
