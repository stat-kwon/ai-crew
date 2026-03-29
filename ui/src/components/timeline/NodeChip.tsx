"use client";

import { cn } from "@/lib/utils";

export type NodeStatus = "completed" | "running" | "pending" | "failed" | "skipped";

interface NodeChipProps {
  nodeId: string;
  status: NodeStatus;
  duration?: string;
}

const statusConfig: Record<NodeStatus, { bg: string; text: string; dot: string; pulse?: boolean }> = {
  completed: {
    bg: "bg-emerald-50",
    text: "text-emerald-700",
    dot: "bg-emerald-500",
  },
  running: {
    bg: "bg-primary/10",
    text: "text-primary",
    dot: "bg-primary",
    pulse: true,
  },
  pending: {
    bg: "bg-slate-100",
    text: "text-slate-500",
    dot: "bg-slate-400",
  },
  failed: {
    bg: "bg-rose-50",
    text: "text-rose-700",
    dot: "bg-rose-500",
  },
  skipped: {
    bg: "bg-slate-50",
    text: "text-slate-400",
    dot: "bg-slate-300",
  },
};

export function NodeChip({ nodeId, status, duration }: NodeChipProps) {
  const config = statusConfig[status] || statusConfig.pending;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium",
        config.bg,
        config.text
      )}
      data-testid={`node-chip-${nodeId}`}
    >
      <span
        className={cn(
          "inline-block w-1.5 h-1.5 rounded-full",
          config.dot,
          config.pulse && "animate-pulse"
        )}
      />
      <span className="truncate max-w-[120px]">{nodeId}</span>
      {duration && (
        <span className="text-[10px] opacity-70">{duration}</span>
      )}
    </span>
  );
}
