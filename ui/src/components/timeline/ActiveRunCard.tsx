"use client";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { NodeChip, type NodeStatus } from "./NodeChip";

interface NodeState {
  status: string;
  startedAt?: string | null;
  completedAt?: string | null;
}

interface ActiveRunCardProps {
  runId: string;
  intentDescription?: string;
  nodes: Record<string, NodeState>;
  createdAt: string;
}

function formatElapsed(startIso: string): string {
  const elapsed = Date.now() - new Date(startIso).getTime();
  const minutes = Math.floor(elapsed / 60000);
  if (minutes < 1) return "방금 시작";
  if (minutes < 60) return `${minutes}분 경과`;
  const hours = Math.floor(minutes / 60);
  return `${hours}시간 ${minutes % 60}분 경과`;
}

function formatNodeDuration(node: NodeState): string | undefined {
  if (!node.startedAt || !node.completedAt) return undefined;
  const ms =
    new Date(node.completedAt).getTime() - new Date(node.startedAt).getTime();
  const seconds = Math.round(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
}

function mapNodeStatus(status: string): NodeStatus {
  if (status === "completed") return "completed";
  if (status === "running") return "running";
  if (status === "failed") return "failed";
  if (status === "skipped") return "skipped";
  return "pending";
}

export function ActiveRunCard({
  runId,
  intentDescription,
  nodes,
  createdAt,
}: ActiveRunCardProps) {
  const nodeEntries = Object.entries(nodes);
  const completedCount = nodeEntries.filter(
    ([, n]) => n.status === "completed"
  ).length;
  const totalCount = nodeEntries.length;

  return (
    <Card
      className="border-primary/30 ring-1 ring-primary/10 overflow-hidden"
      data-testid="active-run-card"
    >
      <div className="p-5">
        <div className="flex items-start justify-between mb-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="running" size="sm">
                진행 중
              </Badge>
              <span className="text-xs text-slate-400">
                {formatElapsed(createdAt)}
              </span>
            </div>
            <h3 className="text-base font-bold text-slate-900 truncate">
              {intentDescription || runId}
            </h3>
            {intentDescription && (
              <p className="text-xs text-slate-400 mt-0.5">{runId}</p>
            )}
          </div>
          <div className="text-right shrink-0 ml-4">
            <p className="text-sm font-bold text-primary">
              {completedCount}/{totalCount}
            </p>
            <p className="text-[10px] text-slate-400">노드 완료</p>
          </div>
        </div>

        {/* Node Minimap */}
        <div className="flex flex-wrap gap-1.5" data-testid="node-minimap">
          {nodeEntries.map(([nodeId, node]) => (
            <NodeChip
              key={nodeId}
              nodeId={nodeId}
              status={mapNodeStatus(node.status)}
              duration={formatNodeDuration(node)}
            />
          ))}
        </div>
      </div>

      {/* Progress bar at bottom */}
      <div className="h-1 bg-slate-100">
        <div
          className="h-full bg-primary transition-all duration-500"
          style={{
            width: `${totalCount > 0 ? (completedCount / totalCount) * 100 : 0}%`,
          }}
        />
      </div>
    </Card>
  );
}
