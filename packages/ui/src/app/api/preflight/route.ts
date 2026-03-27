import { NextResponse } from "next/server";
import { readFile, stat } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { execSync } from "node:child_process";
import { parse } from "yaml";
import crypto from "node:crypto";

function getTargetDir(): string {
  return process.env.AI_CREW_TARGET_DIR || process.cwd();
}

interface CheckResult {
  id: string;
  name: string;
  description: string;
  status: "pass" | "fail" | "warning" | "pending";
  details?: string;
}

async function checkGitStatus(targetDir: string): Promise<CheckResult> {
  try {
    const gitDir = join(targetDir, ".git");
    if (!existsSync(gitDir)) {
      return {
        id: "git-status",
        name: "Git Repository",
        description: "Check if project is a git repository",
        status: "warning",
        details: "Not a git repository",
      };
    }

    try {
      const status = execSync("git status --porcelain", {
        cwd: targetDir,
        encoding: "utf-8",
      }).trim();

      if (status) {
        const lines = status.split("\n").length;
        return {
          id: "git-status",
          name: "Git Status",
          description: "Check for uncommitted changes",
          status: "warning",
          details: `${lines} uncommitted changes`,
        };
      }

      return {
        id: "git-status",
        name: "Git Status",
        description: "Check for uncommitted changes",
        status: "pass",
        details: "Working tree clean",
      };
    } catch {
      return {
        id: "git-status",
        name: "Git Status",
        description: "Check for uncommitted changes",
        status: "fail",
        details: "Failed to check git status",
      };
    }
  } catch {
    return {
      id: "git-status",
      name: "Git Status",
      description: "Check for uncommitted changes",
      status: "fail",
      details: "Error checking git status",
    };
  }
}

async function checkModelAuth(): Promise<CheckResult> {
  // Check for ANTHROPIC_API_KEY
  const hasApiKey = !!process.env.ANTHROPIC_API_KEY;

  return {
    id: "model-auth",
    name: "Model Authentication",
    description: "Check API key configuration",
    status: hasApiKey ? "pass" : "fail",
    details: hasApiKey
      ? "ANTHROPIC_API_KEY is set"
      : "ANTHROPIC_API_KEY not found",
  };
}

async function checkGraphYaml(targetDir: string): Promise<CheckResult> {
  const graphPath = join(targetDir, ".ai-crew", "graph.yaml");

  if (!existsSync(graphPath)) {
    return {
      id: "graph-yaml",
      name: "Graph Configuration",
      description: "Check graph.yaml exists and is valid",
      status: "fail",
      details: "graph.yaml not found",
    };
  }

  try {
    const content = await readFile(graphPath, "utf-8");
    const graph = parse(content);

    if (!graph.nodes || !Array.isArray(graph.nodes)) {
      return {
        id: "graph-yaml",
        name: "Graph Configuration",
        description: "Check graph.yaml exists and is valid",
        status: "fail",
        details: "Invalid graph: nodes array missing",
      };
    }

    // Calculate hash for integrity check
    const hash = crypto.createHash("sha256").update(content).digest("hex").substring(0, 8);

    return {
      id: "graph-yaml",
      name: "Graph Configuration",
      description: "Check graph.yaml exists and is valid",
      status: "pass",
      details: `${graph.nodes.length} nodes, hash: ${hash}`,
    };
  } catch (error) {
    return {
      id: "graph-yaml",
      name: "Graph Configuration",
      description: "Check graph.yaml exists and is valid",
      status: "fail",
      details: `Parse error: ${error instanceof Error ? error.message : "Unknown"}`,
    };
  }
}

async function checkConfigYaml(targetDir: string): Promise<CheckResult> {
  const configPath = join(targetDir, ".ai-crew", "config.yaml");

  if (!existsSync(configPath)) {
    return {
      id: "config-yaml",
      name: "Project Configuration",
      description: "Check config.yaml exists and is valid",
      status: "fail",
      details: "config.yaml not found",
    };
  }

  try {
    const content = await readFile(configPath, "utf-8");
    const config = parse(content);

    return {
      id: "config-yaml",
      name: "Project Configuration",
      description: "Check config.yaml exists and is valid",
      status: "pass",
      details: `Bundle: ${config.bundle || "N/A"}, Workflow: ${config.workflow || "N/A"}`,
    };
  } catch (error) {
    return {
      id: "config-yaml",
      name: "Project Configuration",
      description: "Check config.yaml exists and is valid",
      status: "fail",
      details: `Parse error: ${error instanceof Error ? error.message : "Unknown"}`,
    };
  }
}

async function checkAiCrewDir(targetDir: string): Promise<CheckResult> {
  const aiCrewDir = join(targetDir, ".ai-crew");

  if (!existsSync(aiCrewDir)) {
    return {
      id: "ai-crew-dir",
      name: "AI-Crew Directory",
      description: "Check .ai-crew directory exists",
      status: "fail",
      details: ".ai-crew directory not found",
    };
  }

  try {
    const stats = await stat(aiCrewDir);
    if (!stats.isDirectory()) {
      return {
        id: "ai-crew-dir",
        name: "AI-Crew Directory",
        description: "Check .ai-crew directory exists",
        status: "fail",
        details: ".ai-crew is not a directory",
      };
    }

    return {
      id: "ai-crew-dir",
      name: "AI-Crew Directory",
      description: "Check .ai-crew directory exists",
      status: "pass",
      details: "Directory exists",
    };
  } catch {
    return {
      id: "ai-crew-dir",
      name: "AI-Crew Directory",
      description: "Check .ai-crew directory exists",
      status: "fail",
      details: "Error checking directory",
    };
  }
}

async function checkNodeDependencies(targetDir: string): Promise<CheckResult> {
  const graphPath = join(targetDir, ".ai-crew", "graph.yaml");

  if (!existsSync(graphPath)) {
    return {
      id: "node-deps",
      name: "Node Dependencies",
      description: "Validate node dependency graph",
      status: "pending",
      details: "No graph to validate",
    };
  }

  try {
    const content = await readFile(graphPath, "utf-8");
    const graph = parse(content);

    if (!graph.nodes || !Array.isArray(graph.nodes)) {
      return {
        id: "node-deps",
        name: "Node Dependencies",
        description: "Validate node dependency graph",
        status: "fail",
        details: "Invalid graph structure",
      };
    }

    const nodeIds = new Set(graph.nodes.map((n: { id: string }) => n.id));
    const invalidDeps: string[] = [];

    for (const node of graph.nodes) {
      if (node.depends_on && Array.isArray(node.depends_on)) {
        for (const dep of node.depends_on) {
          if (!nodeIds.has(dep)) {
            invalidDeps.push(`${node.id} -> ${dep}`);
          }
        }
      }
    }

    if (invalidDeps.length > 0) {
      return {
        id: "node-deps",
        name: "Node Dependencies",
        description: "Validate node dependency graph",
        status: "fail",
        details: `Invalid dependencies: ${invalidDeps.join(", ")}`,
      };
    }

    // Check for cycles (simple DFS)
    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    function hasCycle(nodeId: string): boolean {
      visited.add(nodeId);
      recursionStack.add(nodeId);

      const node = graph.nodes.find((n: { id: string }) => n.id === nodeId);
      if (node?.depends_on) {
        for (const dep of node.depends_on) {
          if (!visited.has(dep)) {
            if (hasCycle(dep)) return true;
          } else if (recursionStack.has(dep)) {
            return true;
          }
        }
      }

      recursionStack.delete(nodeId);
      return false;
    }

    for (const node of graph.nodes) {
      if (!visited.has(node.id)) {
        if (hasCycle(node.id)) {
          return {
            id: "node-deps",
            name: "Node Dependencies",
            description: "Validate node dependency graph",
            status: "fail",
            details: "Circular dependency detected",
          };
        }
      }
    }

    return {
      id: "node-deps",
      name: "Node Dependencies",
      description: "Validate node dependency graph",
      status: "pass",
      details: "All dependencies valid, no cycles",
    };
  } catch (error) {
    return {
      id: "node-deps",
      name: "Node Dependencies",
      description: "Validate node dependency graph",
      status: "fail",
      details: `Error: ${error instanceof Error ? error.message : "Unknown"}`,
    };
  }
}

export async function GET() {
  try {
    const targetDir = getTargetDir();

    const checks = await Promise.all([
      checkAiCrewDir(targetDir),
      checkGitStatus(targetDir),
      checkModelAuth(),
      checkConfigYaml(targetDir),
      checkGraphYaml(targetDir),
      checkNodeDependencies(targetDir),
    ]);

    const passCount = checks.filter((c) => c.status === "pass").length;
    const failCount = checks.filter((c) => c.status === "fail").length;
    const warningCount = checks.filter((c) => c.status === "warning").length;

    return NextResponse.json({
      checks,
      summary: {
        total: checks.length,
        pass: passCount,
        fail: failCount,
        warning: warningCount,
        ready: failCount === 0,
      },
    });
  } catch (error) {
    console.error("Error running preflight checks:", error);
    return NextResponse.json(
      { error: "Failed to run preflight checks" },
      { status: 500 }
    );
  }
}
