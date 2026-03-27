import { NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";

function getTargetDir(): string {
  return process.env.AI_CREW_TARGET_DIR || process.cwd();
}

interface StageState {
  name: string;
  status: "pending" | "active" | "complete";
  tasks: { text: string; done: boolean }[];
}

function parseAidlcState(content: string): StageState[] {
  const stages: StageState[] = [];
  const lines = content.split("\n");
  let currentStage: StageState | null = null;

  for (const line of lines) {
    // Match stage headers like "## 1. Requirements"
    const stageMatch = line.match(/^##\s+\d+\.\s+(.+)$/);
    if (stageMatch) {
      if (currentStage) {
        stages.push(currentStage);
      }
      currentStage = {
        name: stageMatch[1].trim(),
        status: "pending",
        tasks: [],
      };
      continue;
    }

    // Match checkboxes
    if (currentStage) {
      const checkboxMatch = line.match(/^-\s+\[([ xX])\]\s+(.+)$/);
      if (checkboxMatch) {
        const done = checkboxMatch[1].toLowerCase() === "x";
        currentStage.tasks.push({
          text: checkboxMatch[2].trim(),
          done,
        });
      }
    }
  }

  if (currentStage) {
    stages.push(currentStage);
  }

  // Calculate status based on tasks
  for (const stage of stages) {
    const completedCount = stage.tasks.filter((t) => t.done).length;
    if (completedCount === stage.tasks.length && stage.tasks.length > 0) {
      stage.status = "complete";
    } else if (completedCount > 0) {
      stage.status = "active";
    }
  }

  return stages;
}

export async function GET() {
  try {
    const targetDir = getTargetDir();
    const statePath = join(targetDir, "aidlc-docs", "aidlc-state.md");

    if (!existsSync(statePath)) {
      return NextResponse.json({ stages: [] });
    }

    const content = await readFile(statePath, "utf-8");
    const stages = parseAidlcState(content);

    return NextResponse.json({ stages, raw: content });
  } catch (error) {
    console.error("Error reading AIDLC state:", error);
    return NextResponse.json(
      { error: "Failed to read AIDLC state" },
      { status: 500 }
    );
  }
}
