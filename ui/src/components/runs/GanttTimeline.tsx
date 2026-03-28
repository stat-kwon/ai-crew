"use client";

import { useMemo } from "react";
import Box from "@cloudscape-design/components/box";
import SpaceBetween from "@cloudscape-design/components/space-between";
import StatusIndicator from "@cloudscape-design/components/status-indicator";

interface NodeState {
  status: string;
  startedAt?: string;
  completedAt?: string;
}

interface GanttTimelineProps {
  nodes: Record<string, NodeState>;
  onNodeClick?: (nodeId: string) => void;
}

interface TimelineNode {
  id: string;
  status: string;
  startTime: number;
  endTime: number;
  startedAt?: string;
  completedAt?: string;
}

const statusColors: Record<string, string> = {
  pending: "#687078",
  running: "#0972d3",
  completed: "#037f0c",
  failed: "#d91515",
};

export function GanttTimeline({ nodes, onNodeClick }: GanttTimelineProps) {
  const timeline = useMemo(() => {
    const nodeEntries = Object.entries(nodes);
    if (nodeEntries.length === 0) return null;

    const timelineNodes: TimelineNode[] = nodeEntries
      .filter(([_, node]) => node.startedAt)
      .map(([id, node]) => ({
        id,
        status: node.status,
        startTime: new Date(node.startedAt!).getTime(),
        endTime: node.completedAt
          ? new Date(node.completedAt).getTime()
          : Date.now(),
        startedAt: node.startedAt,
        completedAt: node.completedAt,
      }));

    if (timelineNodes.length === 0) return null;

    const minTime = Math.min(...timelineNodes.map((n) => n.startTime));
    const maxTime = Math.max(...timelineNodes.map((n) => n.endTime));
    const totalDuration = maxTime - minTime || 1;

    return {
      nodes: timelineNodes,
      minTime,
      maxTime,
      totalDuration,
    };
  }, [nodes]);

  if (!timeline || timeline.nodes.length === 0) {
    return (
      <Box textAlign="center" color="text-status-inactive" padding="l">
        타임라인 데이터가 없습니다. 노드가 실행을 시작해야 표시됩니다.
      </Box>
    );
  }

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  const formatDuration = (ms: number) => {
    const seconds = Math.round(ms / 1000);
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
    return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
  };

  return (
    <SpaceBetween size="m">
      {/* Time axis */}
      <Box padding={{ horizontal: "l" }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
          <Box fontSize="body-s" color="text-status-inactive">
            {formatTime(timeline.minTime)}
          </Box>
          <Box fontSize="body-s" color="text-status-inactive">
            총 소요: {formatDuration(timeline.totalDuration)}
          </Box>
          <Box fontSize="body-s" color="text-status-inactive">
            {formatTime(timeline.maxTime)}
          </Box>
        </div>
        <div
          style={{
            width: "100%",
            height: 4,
            backgroundColor: "#e9ebed",
            borderRadius: 2,
          }}
        />
      </Box>

      {/* Gantt bars */}
      <div style={{ padding: "0 16px" }}>
        {timeline.nodes.map((node) => {
          const leftPercent =
            ((node.startTime - timeline.minTime) / timeline.totalDuration) * 100;
          const widthPercent =
            ((node.endTime - node.startTime) / timeline.totalDuration) * 100;

          return (
            <div
              key={node.id}
              style={{
                display: "flex",
                alignItems: "center",
                marginBottom: 12,
              }}
            >
              <div style={{ width: 120, flexShrink: 0 }}>
                <Box fontWeight="bold" fontSize="body-s">
                  {node.id}
                </Box>
              </div>
              <div
                style={{
                  flex: 1,
                  position: "relative",
                  height: 32,
                  backgroundColor: "#f4f4f4",
                  borderRadius: 4,
                }}
              >
                <div
                  className="gantt-bar"
                  style={{
                    position: "absolute",
                    left: `${leftPercent}%`,
                    width: `${Math.max(widthPercent, 2)}%`,
                    height: "100%",
                    backgroundColor: statusColors[node.status] || statusColors.pending,
                    borderRadius: 4,
                    cursor: node.status === "completed" ? "pointer" : "default",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "white",
                    fontSize: 12,
                    fontWeight: 500,
                  }}
                  onClick={() => {
                    if (node.status === "completed" && onNodeClick) {
                      onNodeClick(node.id);
                    }
                  }}
                >
                  {formatDuration(node.endTime - node.startTime)}
                </div>
              </div>
              <div style={{ width: 100, paddingLeft: 12, flexShrink: 0 }}>
                <StatusIndicator
                  type={
                    node.status === "completed"
                      ? "success"
                      : node.status === "running"
                        ? "in-progress"
                        : node.status === "failed"
                          ? "error"
                          : "pending"
                  }
                >
                  {node.status}
                </StatusIndicator>
              </div>
            </div>
          );
        })}
      </div>
    </SpaceBetween>
  );
}
