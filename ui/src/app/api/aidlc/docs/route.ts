import { NextRequest, NextResponse } from "next/server";
import { readFile, readdir, stat } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join, relative } from "node:path";
import { groupDocsByFolder, type DocFile } from "./helpers";

function getTargetDir(): string {
  return process.env.AI_CREW_TARGET_DIR || process.cwd();
}

async function listDocsRecursive(
  dir: string,
  base: string,
): Promise<DocFile[]> {
  const docs: DocFile[] = [];

  if (!existsSync(dir)) {
    return docs;
  }

  const entries = await readdir(dir);

  for (const entry of entries) {
    const fullPath = join(dir, entry);
    const fileStat = await stat(fullPath);

    if (fileStat.isDirectory()) {
      const subDocs = await listDocsRecursive(fullPath, base);
      docs.push(...subDocs);
    } else if (entry.endsWith(".md")) {
      const relativePath = relative(base, fullPath);
      const stage = relativePath.split("/")[0];
      docs.push({
        name: entry,
        path: relativePath,
        stage: stage !== entry ? stage : undefined,
      });
    }
  }

  return docs;
}

export async function GET(request: NextRequest) {
  try {
    const targetDir = getTargetDir();
    const docsDir = join(targetDir, "aidlc-docs");

    const { searchParams } = new URL(request.url);
    const filePath = searchParams.get("file");

    if (filePath) {
      // Return specific file content
      const fullPath = join(docsDir, filePath);

      // Security check
      if (!fullPath.startsWith(docsDir)) {
        return NextResponse.json(
          { error: "Path traversal detected" },
          { status: 400 },
        );
      }

      if (!existsSync(fullPath)) {
        return NextResponse.json(
          { error: "File not found" },
          { status: 404 },
        );
      }

      const content = await readFile(fullPath, "utf-8");
      return NextResponse.json({ path: filePath, content });
    }

    // List all docs
    const docs = await listDocsRecursive(docsDir, docsDir);
    const groups = groupDocsByFolder(docs);

    return NextResponse.json({ docs, groups });
  } catch (error) {
    console.error("Error reading AIDLC docs:", error);
    return NextResponse.json(
      { error: "Failed to read AIDLC docs" },
      { status: 500 },
    );
  }
}
