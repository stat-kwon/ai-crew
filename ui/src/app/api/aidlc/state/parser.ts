export interface StageTask {
  text: string;
  done: boolean;
}

export interface StageState {
  name: string;
  status: "pending" | "active" | "complete";
  tasks: StageTask[];
  phase?: string;
}

export interface AidlcStateResult {
  stages: StageState[];
  found: boolean;
  currentStage?: string;
}

export function parseAidlcState(content: string): AidlcStateResult {
  const stages: StageState[] = [];
  const lines = content.split("\n");
  let currentPhase: string | undefined;
  let currentStage: StageState | null = null;
  let inStageProgress = false;
  let resultCurrentStage: string | undefined;

  for (const line of lines) {
    // 1) Extract "Current Stage" metadata
    const currentStageMatch = line.match(
      /^-\s+\*\*Current Stage\*\*:\s*(.+)$/,
    );
    if (currentStageMatch) {
      resultCurrentStage = currentStageMatch[1].trim();
      continue;
    }

    // 2) Detect "## Stage Progress" section
    const h2Match = line.match(/^##\s+(.+)$/);
    if (h2Match) {
      const heading = h2Match[1].trim();

      if (heading === "Stage Progress") {
        inStageProgress = true;
        continue;
      }

      // Legacy "## N. StageName" pattern (backward compat)
      const stageMatch = heading.match(/^\d+\.\s+(.+)$/);
      if (stageMatch) {
        if (currentStage) stages.push(currentStage);
        currentStage = {
          name: stageMatch[1].trim(),
          status: "pending",
          tasks: [],
          phase: currentPhase,
        };
        continue;
      }

      // Another h2 that is not "Stage Progress" or a legacy stage header
      if (inStageProgress) {
        inStageProgress = false;
        currentPhase = undefined;
      }
      continue;
    }

    // 3) Phase header (### INCEPTION PHASE etc.)
    const phaseMatch = line.match(/^###\s+(.+)$/);
    if (phaseMatch) {
      if (currentStage) {
        stages.push(currentStage);
        currentStage = null;
      }
      currentPhase = phaseMatch[1].trim();
      continue;
    }

    // 4) Checkbox processing
    const checkboxMatch = line.match(/^-\s+\[([ xX])\]\s+(.+)$/);
    if (checkboxMatch) {
      const done = checkboxMatch[1].toLowerCase() === "x";
      const text = checkboxMatch[2].trim();

      if (inStageProgress && currentPhase && !currentStage) {
        // Phase-level checkbox: each checkbox is a stage
        stages.push({
          name: text,
          status: done ? "complete" : "pending",
          tasks: [{ text, done }],
          phase: currentPhase,
        });
      } else if (currentStage) {
        // Legacy: checkbox under a stage header is a task
        currentStage.tasks.push({ text, done });
      }
    }
  }

  if (currentStage) stages.push(currentStage);

  // Calculate status for legacy-style stages (those with multiple tasks)
  for (const stage of stages) {
    if (stage.tasks.length > 1) {
      const completedCount = stage.tasks.filter((t) => t.done).length;
      if (completedCount === stage.tasks.length) {
        stage.status = "complete";
      } else if (completedCount > 0) {
        stage.status = "active";
      }
    } else if (
      stage.tasks.length === 1 &&
      stage.phase === undefined &&
      stage.status === "pending"
    ) {
      // Legacy single-task stage
      const completedCount = stage.tasks.filter((t) => t.done).length;
      if (completedCount === stage.tasks.length) {
        stage.status = "complete";
      }
    }
  }

  return {
    stages,
    found: true,
    currentStage: resultCurrentStage,
  };
}
