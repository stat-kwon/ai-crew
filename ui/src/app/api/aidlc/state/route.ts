import { NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { parseAidlcState } from "./parser";

function getTargetDir(): string {
  return process.env.AI_CREW_TARGET_DIR || process.cwd();
}

export async function GET() {
  try {
    const targetDir = getTargetDir();
    const statePath = join(targetDir, "aidlc-docs", "aidlc-state.md");

    if (!existsSync(statePath)) {
      return NextResponse.json({ stages: [], found: false });
    }

    const content = await readFile(statePath, "utf-8");
    const result = parseAidlcState(content);

    return NextResponse.json({
      stages: result.stages,
      found: true,
      currentStage: result.currentStage,
      raw: content,
    });
  } catch (error) {
    console.error("Error reading AIDLC state:", error);
    return NextResponse.json(
      { error: "Failed to read AIDLC state" },
      { status: 500 },
    );
  }
}
