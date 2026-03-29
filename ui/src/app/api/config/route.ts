import { NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { parse } from "yaml";

function getTargetDir(): string {
  return process.env.AI_CREW_TARGET_DIR || process.cwd();
}

export async function GET() {
  try {
    const targetDir = getTargetDir();
    const configPath = join(targetDir, ".ai-crew", "config.yaml");

    if (!existsSync(configPath)) {
      return NextResponse.json(
        { error: "config.yaml not found" },
        { status: 404 }
      );
    }

    const content = await readFile(configPath, "utf-8");
    const config = parse(content);

    return NextResponse.json(config);
  } catch (error) {
    console.error("Error reading config:", error);
    return NextResponse.json(
      { error: "Failed to read config" },
      { status: 500 }
    );
  }
}
