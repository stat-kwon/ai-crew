"use client";

import SpaceBetween from "@cloudscape-design/components/space-between";
import Box from "@cloudscape-design/components/box";
import StatusIndicator from "@cloudscape-design/components/status-indicator";
import Badge from "@cloudscape-design/components/badge";
import ProgressBar from "@cloudscape-design/components/progress-bar";
import Icon from "@cloudscape-design/components/icon";

interface Task {
  text: string;
  done: boolean;
}

interface Stage {
  name: string;
  status: "pending" | "active" | "complete";
  tasks: Task[];
}

interface StageFlowProps {
  stages: Stage[];
  selectedStage?: string;
  onSelectStage?: (name: string) => void;
}

function getStageProgress(tasks: Task[]): number {
  if (tasks.length === 0) return 0;
  const completed = tasks.filter((t) => t.done).length;
  return Math.round((completed / tasks.length) * 100);
}

export function StageFlow({
  stages,
  selectedStage,
  onSelectStage,
}: StageFlowProps) {
  if (stages.length === 0) {
    return (
      <Box textAlign="center" color="text-status-inactive" padding="l">
        No AI-DLC stages found. Run the inception workflow to generate stages.
      </Box>
    );
  }

  return (
    <div style={{ overflowX: "auto", paddingBottom: 8 }}>
      <div style={{ display: "flex", alignItems: "stretch", gap: 8, minWidth: "max-content" }}>
        {stages.map((stage, index) => {
          const progress = getStageProgress(stage.tasks);
          const isSelected = selectedStage === stage.name;

          return (
            <div key={stage.name} style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div
                style={{
                  padding: 16,
                  borderRadius: 8,
                  border: isSelected ? "2px solid #0972d3" : "1px solid #e9ebed",
                  backgroundColor: isSelected ? "#f4f8ff" : "#fafafa",
                  cursor: "pointer",
                  minWidth: 180,
                  transition: "all 0.2s",
                }}
                onClick={() => onSelectStage?.(stage.name)}
              >
                <SpaceBetween size="s">
                  <SpaceBetween direction="horizontal" size="xs">
                    <Box fontWeight="bold">{stage.name}</Box>
                    <StatusIndicator
                      type={
                        stage.status === "complete"
                          ? "success"
                          : stage.status === "active"
                            ? "in-progress"
                            : "pending"
                      }
                    >
                      {stage.status}
                    </StatusIndicator>
                  </SpaceBetween>

                  {stage.tasks.length > 0 && (
                    <>
                      <ProgressBar value={progress} />
                      <Box fontSize="body-s" color="text-status-inactive">
                        {stage.tasks.filter((t) => t.done).length} / {stage.tasks.length} tasks
                      </Box>
                    </>
                  )}

                  {stage.tasks.length > 0 && (
                    <SpaceBetween size="xxs">
                      {stage.tasks.slice(0, 3).map((task, i) => (
                        <div
                          key={i}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                            fontSize: 12,
                          }}
                        >
                          <span style={{ color: task.done ? "#037f0c" : "#687078" }}>
                            {task.done ? "✓" : "○"}
                          </span>
                          <span
                            style={{
                              color: task.done ? "#037f0c" : "#16191f",
                              textDecoration: task.done ? "line-through" : "none",
                            }}
                          >
                            {task.text.length > 30
                              ? task.text.substring(0, 30) + "..."
                              : task.text}
                          </span>
                        </div>
                      ))}
                      {stage.tasks.length > 3 && (
                        <Box fontSize="body-s" color="text-status-inactive">
                          +{stage.tasks.length - 3} more
                        </Box>
                      )}
                    </SpaceBetween>
                  )}
                </SpaceBetween>
              </div>

              {index < stages.length - 1 && (
                <div style={{ color: "#687078", fontSize: 20 }}>→</div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
