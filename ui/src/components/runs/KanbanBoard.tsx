"use client";

import ColumnLayout from "@cloudscape-design/components/column-layout";
import Container from "@cloudscape-design/components/container";
import Header from "@cloudscape-design/components/header";
import SpaceBetween from "@cloudscape-design/components/space-between";
import Box from "@cloudscape-design/components/box";
import StatusIndicator from "@cloudscape-design/components/status-indicator";
import Badge from "@cloudscape-design/components/badge";

interface NodeState {
  status: string;
  startedAt?: string;
  completedAt?: string;
}

interface KanbanBoardProps {
  nodes: Record<string, NodeState>;
  onNodeClick?: (nodeId: string) => void;
}

const columns = [
  { id: "pending", label: "대기", type: "pending" as const },
  { id: "running", label: "진행 중", type: "in-progress" as const },
  { id: "completed", label: "완료", type: "success" as const },
  { id: "failed", label: "실패", type: "error" as const },
];

function formatDuration(startedAt?: string, completedAt?: string): string {
  if (!startedAt) return "-";
  const start = new Date(startedAt).getTime();
  const end = completedAt ? new Date(completedAt).getTime() : Date.now();
  const duration = Math.round((end - start) / 1000);

  if (duration < 60) return `${duration}s`;
  if (duration < 3600) return `${Math.floor(duration / 60)}m ${duration % 60}s`;
  return `${Math.floor(duration / 3600)}h ${Math.floor((duration % 3600) / 60)}m`;
}

export function KanbanBoard({ nodes, onNodeClick }: KanbanBoardProps) {
  const nodesByStatus = {
    pending: [] as string[],
    running: [] as string[],
    completed: [] as string[],
    failed: [] as string[],
  };

  Object.entries(nodes).forEach(([id, node]) => {
    const status = node.status as keyof typeof nodesByStatus;
    if (status in nodesByStatus) {
      nodesByStatus[status].push(id);
    }
  });

  return (
    <ColumnLayout columns={4}>
      {columns.map((column) => (
        <Container
          key={column.id}
          header={
            <Header
              variant="h3"
              counter={`(${nodesByStatus[column.id as keyof typeof nodesByStatus].length})`}
            >
              <StatusIndicator type={column.type}>{column.label}</StatusIndicator>
            </Header>
          }
        >
          <SpaceBetween size="s">
            {nodesByStatus[column.id as keyof typeof nodesByStatus].length === 0 ? (
              <Box textAlign="center" color="text-status-inactive" padding="s">
                노드 없음
              </Box>
            ) : (
              nodesByStatus[column.id as keyof typeof nodesByStatus].map((nodeId) => {
                const node = nodes[nodeId];
                return (
                  <div
                    key={nodeId}
                    onClick={() => onNodeClick?.(nodeId)}
                    style={{ cursor: node.status === "completed" ? "pointer" : "default" }}
                  >
                    <div
                      style={{
                        padding: "12px",
                        border: "1px solid #e9ebed",
                        borderRadius: "8px",
                        cursor: node.status === "completed" ? "pointer" : "default",
                        backgroundColor:
                          node.status === "completed"
                            ? "#f4fff4"
                            : node.status === "failed"
                              ? "#fff4f4"
                              : node.status === "running"
                                ? "#f4f8ff"
                                : "#fafafa",
                        transition: "all 0.2s",
                      }}
                      onMouseEnter={(e) => {
                        if (node.status === "completed") {
                          e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.1)";
                        }
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.boxShadow = "none";
                      }}
                    >
                      <SpaceBetween size="xs">
                        <Box fontWeight="bold">{nodeId}</Box>
                        <Box fontSize="body-s" color="text-status-inactive">
                          {formatDuration(node.startedAt, node.completedAt)}
                        </Box>
                        {node.status === "completed" && (
                          <Badge color="green">작업 메모 보기</Badge>
                        )}
                      </SpaceBetween>
                    </div>
                  </div>
                );
              })
            )}
          </SpaceBetween>
        </Container>
      ))}
    </ColumnLayout>
  );
}
