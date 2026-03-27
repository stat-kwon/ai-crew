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
    const statePath = join(targetDir, ".ai-crew", "state.json");

    if (!existsSync(statePath)) {
      return NextResponse.json(
        { error: "state.json not found" },
        { status: 404 }
      );
    }

    const content = await readFile(statePath, "utf-8");
    const state = JSON.parse(content);

    return NextResponse.json(state);
  } catch (error) {
    console.error("Error reading state:", error);
    return NextResponse.json(
      { error: "Failed to read state" },
      { status: 500 }
    );
  }
}
