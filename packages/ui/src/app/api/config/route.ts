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

export async function PUT(request: NextRequest) {
  try {
    const targetDir = getTargetDir();
    const configPath = join(targetDir, ".ai-crew", "config.yaml");
    const body = await request.json();

    // Basic validation - ensure it's a valid object
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json(
        { error: "Config must be an object" },
        { status: 400 }
      );
    }

    // Skip core validation as it may be too strict for partial updates
    // The UI ensures proper format

    const yamlContent = stringify(body);
    await writeFile(configPath, yamlContent, "utf-8");

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error saving config:", error);
    return NextResponse.json(
      { error: "Failed to save config" },
      { status: 500 }
    );
  }
}
