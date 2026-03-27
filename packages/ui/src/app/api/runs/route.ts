import { NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";

function getTargetDir(): string {
  return process.env.AI_CREW_TARGET_DIR || process.cwd();
}

export async function GET() {
  try {
    const targetDir = getTargetDir();
    const runsPath = join(targetDir, ".ai-crew", "runs.json");

    if (!existsSync(runsPath)) {
      return NextResponse.json({ runs: [] });
    }

    const content = await readFile(runsPath, "utf-8");
    const registry = JSON.parse(content);

    return NextResponse.json(registry);
  } catch (error) {
    console.error("Error reading runs:", error);
    return NextResponse.json(
      { error: "Failed to read runs" },
      { status: 500 }
    );
  }
}
