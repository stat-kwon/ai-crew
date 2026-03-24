import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { registry } from "./registry.js";
import { sessionManager } from "./session.js";

export function createServer(): McpServer {
  const server = new McpServer({
    name: "ai-crew-agent",
    version: "1.0.0",
  });

  // ── agent_chat ──────────────────────────────────────────
  server.tool(
    "agent_chat",
    "Send a message to a non-Claude model and get a response. Maintains conversation history per session.",
    {
      session_id: z.string().describe("Session ID for conversation continuity"),
      model: z.string().describe("Model ID (e.g. gpt-4o, gemini-2.5-pro, o3)"),
      system_prompt: z.string().describe("System prompt defining the agent persona"),
      message: z.string().describe("The user message to send"),
    },
    async ({ session_id, model, system_prompt, message }) => {
      try {
        const provider = await registry.getProviderForModel(model);

        // Ensure system prompt is in the session
        const history = sessionManager.getHistory(session_id);
        if (history.length === 0) {
          sessionManager.addMessage(session_id, {
            role: "system",
            content: system_prompt,
          });
        }

        // Add the user message
        sessionManager.addMessage(session_id, {
          role: "user",
          content: message,
        });

        // Get full history and call the provider
        const messages = sessionManager.getHistory(session_id);
        const response = await provider.chat(messages, { model });

        // Store assistant response in session
        sessionManager.addMessage(session_id, {
          role: "assistant",
          content: response.content,
        });

        const meta = [
          `model: ${response.model}`,
          response.usage
            ? `tokens: ${response.usage.inputTokens} in / ${response.usage.outputTokens} out`
            : null,
        ]
          .filter(Boolean)
          .join(" | ");

        return {
          content: [
            { type: "text" as const, text: response.content },
            { type: "text" as const, text: `\n---\n_${meta}_` },
          ],
        };
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        return {
          content: [{ type: "text" as const, text: `Error: ${errorMessage}` }],
          isError: true,
        };
      }
    },
  );

  // ── list_models ─────────────────────────────────────────
  server.tool(
    "list_models",
    "List all available non-Claude models from all configured providers.",
    {},
    async () => {
      const models = registry.listAllModels();
      const formatted = models.map(
        (m) => `- **${m.id}** (${m.provider}): ${m.description}`,
      );

      return {
        content: [
          {
            type: "text" as const,
            text: `Available models:\n\n${formatted.join("\n")}`,
          },
        ],
      };
    },
  );

  return server;
}

export async function startServer(): Promise<void> {
  const server = createServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

// Allow running directly: node server.js
const isDirectRun =
  typeof process !== "undefined" &&
  process.argv[1] &&
  (process.argv[1].endsWith("/server.js") ||
    process.argv[1].endsWith("/server.ts"));

if (isDirectRun) {
  startServer().catch((err) => {
    console.error("Failed to start MCP server:", err);
    process.exit(1);
  });
}
