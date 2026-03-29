"use client";

import { StatusBadge } from "@/components/common/StatusBadge";
import type { RunIndexEntry } from "@/types";
import { cn } from "@/lib/utils";

interface RunListProps {
  runs: RunIndexEntry[];
  selectedRunId: string | null;
  onSelectRun: (runId: string) => void;
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function getRunVersion(index: number, total: number): string {
  return `v${total - index}`;
}

export function RunList({ runs, selectedRunId, onSelectRun }: RunListProps) {
  const sortedRuns = [...runs].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return (
    <ul className="space-y-2">
      {sortedRuns.map((run, index) => {
        const isSelected = selectedRunId === run.runId;
        return (
          <li key={run.runId}>
            <button
              onClick={() => onSelectRun(run.runId)}
              className={cn(
                "w-full rounded-2xl border px-4 py-4 text-left transition-all",
                isSelected
                  ? "border-primary/20 bg-primary text-primary-foreground shadow-sm"
                  : "border-border/70 bg-background hover:bg-muted/35"
              )}
            >
              <div className="mb-3 flex items-start justify-between gap-4">
                <div>
                  <span className={cn("inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em]", isSelected ? "border-white/10 bg-white/10 text-primary-foreground" : "border-border/70 bg-muted/35 text-muted-foreground")}>
                    {getRunVersion(index, sortedRuns.length)}
                  </span>
                </div>
                <StatusBadge status={run.state} className={isSelected ? "border-white/10 bg-white/10 text-primary-foreground" : undefined} />
              </div>
              <p className={cn("line-clamp-2 text-sm font-medium leading-6 tracking-tight", isSelected ? "text-primary-foreground" : "text-foreground")}>
                {run.intent}
              </p>
              <div className={cn("mt-3 flex items-center justify-between text-xs", isSelected ? "text-primary-foreground/75" : "text-muted-foreground")}>
                <span>{formatDate(run.createdAt)}</span>
                <span>{run.nodesCompleted}/{run.nodesTotal} 완료</span>
              </div>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
