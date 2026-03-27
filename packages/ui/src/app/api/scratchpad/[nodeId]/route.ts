import { NextRequest, NextResponse } from "next/server";
import { readFile, readdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";

function getTargetDir(): string {
  return process.env.AI_CREW_TARGET_DIR || process.cwd();
}

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ nodeId: string }> }
) {
  try {
    const { nodeId } = await context.params;
    const targetDir = getTargetDir();
    const scratchpadDir = join(targetDir, ".ai-crew", "scratchpad", nodeId);

    if (!existsSync(scratchpadDir)) {
      return NextResponse.json({ files: [] });
    }

    const files = await readdir(scratchpadDir);
    const contents: Record<string, string> = {};

    for (const file of files) {
      try {
        const filePath = join(scratchpadDir, file);
        const content = await readFile(filePath, "utf-8");
        contents[file] = content;
      } catch {
        // Skip unreadable files
      }
    }

    // Format for ScratchpadModal component
    const formattedFiles = files.map((file) => ({
      name: file,
      content: contents[file] || "",
    }));

    return NextResponse.json({
      files: formattedFiles,
      content: formattedFiles.length > 0 ? formattedFiles[0].content : "",
    });
  } catch (error) {
    console.error("Error reading scratchpad:", error);
    return NextResponse.json(
      { error: "Failed to read scratchpad" },
      { status: 500 }
    );
  }
}
