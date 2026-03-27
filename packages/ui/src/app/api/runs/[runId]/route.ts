import { NextRequest, NextResponse } from "next/server";
import { readFile, readdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";

function getTargetDir(): string {
  return process.env.AI_CREW_TARGET_DIR || process.cwd();
}

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ runId: string }> }
) {
  try {
    const { runId } = await context.params;
    const targetDir = getTargetDir();
    const runDir = join(targetDir, ".ai-crew", "runs", runId);

    if (!existsSync(runDir)) {
      return NextResponse.json(
        { error: "Run not found" },
        { status: 404 }
      );
    }

    const manifestPath = join(runDir, "manifest.json");
    if (!existsSync(manifestPath)) {
      return NextResponse.json(
        { error: "Manifest not found" },
        { status: 404 }
      );
    }

    const content = await readFile(manifestPath, "utf-8");
    const manifest = JSON.parse(content);

    // List files in the run directory
    const files = await readdir(runDir);

    return NextResponse.json({ ...manifest, files });
  } catch (error) {
    console.error("Error reading run:", error);
    return NextResponse.json(
      { error: "Failed to read run" },
      { status: 500 }
    );
  }
}
