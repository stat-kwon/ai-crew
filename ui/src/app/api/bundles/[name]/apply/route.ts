import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { stringify } from "yaml";

function getTargetDir(): string {
  return process.env.AI_CREW_TARGET_DIR || process.cwd();
}

export async function POST(
  _request: NextRequest,
  context: { params: Promise<{ name: string }> }
) {
  try {
    const { name } = await context.params;
    const targetDir = getTargetDir();
    const aiCrewDir = join(targetDir, ".ai-crew");

    // Ensure .ai-crew directory exists
    if (!existsSync(aiCrewDir)) {
      await mkdir(aiCrewDir, { recursive: true });
    }

    let bundle: {
      name: string;
      version: string;
      description?: string;
      workflow?: string;
      graph?: { nodes: Array<{ id: string; type: string; agent: string; depends_on?: string[] }> };
      agents?: string[];
      skills?: string[];
      hooks?: string[];
      defaults?: Record<string, unknown>;
    };

    // Try to load bundle from core
    try {
      const { loadBundle } = await import("ai-crew");
      const loadedBundle = await loadBundle(name);
      // Extract what we can from the loaded bundle
      const bundleAny = loadedBundle as unknown as Record<string, unknown>;
      bundle = {
        name: (bundleAny.name as string) || name,
        version: (bundleAny.version as string) || "1.0.0",
        description: bundleAny.description as string | undefined,
        workflow: typeof loadedBundle.workflow === "string"
          ? loadedBundle.workflow
          : (loadedBundle.workflow as { name?: string })?.name,
        graph: loadedBundle.graph as typeof bundle.graph,
        agents: bundleAny.agents as string[] | undefined,
        skills: bundleAny.skills as string[] | undefined,
        hooks: bundleAny.hooks as string[] | undefined,
        defaults: bundleAny.defaults as Record<string, unknown> | undefined,
      };
    } catch {
      // Fallback to mock bundle if core not available
      bundle = {
        name,
        version: "1.0.0",
        description: `${name} bundle`,
        workflow: "aidlc",
        graph: {
          nodes: [
            { id: "planner", type: "worker", agent: "planner-agent", depends_on: [] },
            { id: "builder", type: "worker", agent: "builder-agent", depends_on: ["planner"] },
            { id: "reviewer", type: "worker", agent: "reviewer-agent", depends_on: ["builder"] },
          ],
        },
        agents: ["planner-agent", "builder-agent", "reviewer-agent"],
        skills: ["planning", "coding", "review"],
      };
    }

    // Generate graph.yaml from bundle
    const graphData = {
      version: "1.0",
      nodes: bundle.graph?.nodes || [
        { id: "planner", type: "worker", agent: "planner-agent", depends_on: [] },
        { id: "builder", type: "worker", agent: "builder-agent", depends_on: ["planner"] },
      ],
    };
    const graphYaml = stringify(graphData);
    await writeFile(join(aiCrewDir, "graph.yaml"), graphYaml, "utf-8");

    // Generate config.yaml from bundle
    const configData = {
      project: name,
      bundle: bundle.name,
      version: bundle.version,
      workflow: bundle.workflow || "aidlc",
      defaults: {
        model: "claude-sonnet-4-6",
        isolation: "worktree",
        locale: "en",
        ...(bundle.defaults || {}),
      },
      runs: {
        retention: 10,
        auto_archive: true,
        context_depth: 3,
      },
      includes: {
        skills: bundle.skills || [],
        commands: [],
      },
    };
    const configYaml = stringify(configData);
    await writeFile(join(aiCrewDir, "config.yaml"), configYaml, "utf-8");

    // Generate initial state.json
    const stateData = {
      bundleName: bundle.name,
      intent: "",
      phase: "ready",
      nodes: Object.fromEntries(
        (bundle.graph?.nodes || graphData.nodes).map((n: { id: string }) => [
          n.id,
          { status: "pending" },
        ])
      ),
    };
    await writeFile(
      join(aiCrewDir, "state.json"),
      JSON.stringify(stateData, null, 2),
      "utf-8"
    );

    // Initialize empty runs.json
    const runsData = { runs: [] };
    await writeFile(
      join(aiCrewDir, "runs.json"),
      JSON.stringify(runsData, null, 2),
      "utf-8"
    );

    return NextResponse.json({
      success: true,
      message: `Bundle "${name}" applied successfully`,
      files: ["graph.yaml", "config.yaml", "state.json", "runs.json"],
    });
  } catch (error) {
    console.error("Error applying bundle:", error);
    return NextResponse.json(
      {
        error: "Failed to apply bundle",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
