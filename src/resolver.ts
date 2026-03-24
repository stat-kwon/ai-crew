import { readFile } from "node:fs/promises";

/**
 * Parse YAML frontmatter from an agent .md file to extract the model field.
 *
 * Agent .md files may contain YAML frontmatter between `---` delimiters:
 * ```
 * ---
 * model: claude-opus-4
 * ---
 * # Agent prompt content...
 * ```
 *
 * Model priority (resolved by the caller, not this function):
 *   graph.yaml config.model > agent frontmatter > bundle defaults
 */
export async function parseAgentFrontmatter(
  agentMdPath: string,
): Promise<{ model?: string }> {
  let content: string;
  try {
    content = await readFile(agentMdPath, "utf-8");
  } catch {
    return {};
  }

  const trimmed = content.trimStart();
  if (!trimmed.startsWith("---")) {
    return {};
  }

  // Find closing delimiter
  const endIndex = trimmed.indexOf("\n---", 3);
  if (endIndex === -1) {
    return {};
  }

  const frontmatterBlock = trimmed.slice(3, endIndex).trim();
  const result: { model?: string } = {};

  // Parse simple key: value YAML lines (no external YAML parser dependency)
  for (const line of frontmatterBlock.split("\n")) {
    const colonIndex = line.indexOf(":");
    if (colonIndex === -1) continue;

    const key = line.slice(0, colonIndex).trim();
    const value = line.slice(colonIndex + 1).trim();

    if (key === "model" && value.length > 0) {
      // Strip surrounding quotes if present
      result.model = value.replace(/^["']|["']$/g, "");
      break;
    }
  }

  return result;
}
