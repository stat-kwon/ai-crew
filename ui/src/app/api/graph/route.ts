import { NextRequest, NextResponse } from "next/server";
import { readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { parse, stringify } from "yaml";

function getTargetDir(): string {
  return process.env.AI_CREW_TARGET_DIR || process.cwd();
}

export async function GET() {
  try {
    const targetDir = getTargetDir();
    const graphPath = join(targetDir, ".ai-crew", "graph.yaml");

    if (!existsSync(graphPath)) {
      return NextResponse.json(
        { error: "graph.yaml not found" },
        { status: 404 }
      );
    }

    const content = await readFile(graphPath, "utf-8");
    const graph = parse(content);

    return NextResponse.json(graph);
  } catch (error) {
    console.error("Error reading graph:", error);
    return NextResponse.json(
      { error: "Failed to read graph" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const targetDir = getTargetDir();
    const graphPath = join(targetDir, ".ai-crew", "graph.yaml");
    const body = await request.json();

    // Validate the graph structure
    if (!body.nodes || !Array.isArray(body.nodes)) {
      return NextResponse.json(
        { error: "Invalid graph: nodes array required" },
        { status: 400 }
      );
    }

    // Try to use core validation if available
    try {
      const { validateGraph } = await import("ai-crew");
      const result = validateGraph(body.nodes);
      if (!result.valid) {
        return NextResponse.json(
          { error: "Graph validation failed", errors: result.errors },
          { status: 400 }
        );
      }
    } catch {
      // Core not available, proceed without validation
    }

    const yamlContent = stringify(body);
    await writeFile(graphPath, yamlContent, "utf-8");

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error saving graph:", error);
    return NextResponse.json(
      { error: "Failed to save graph" },
      { status: 500 }
    );
  }
}
