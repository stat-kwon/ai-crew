"use client";

import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface FailedRunCardProps {
  runId: string;
  intentDescription?: string;
  nodesTotal: number;
  nodesCompleted: number;
  nodesFailed: number;
  createdAt: string;
  completedAt: string | null;
}

function formatDuration(startIso: string, endIso: string | null): string {
  if (!endIso) return "-";
  const ms = new Date(endIso).getTime() - new Date(startIso).getTime();
  const seconds = Math.round(ms / 1000);
  if (seconds < 60) return `${seconds}초`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}분`;
  const hours = Math.floor(minutes / 60);
  return `${hours}시간 ${minutes % 60}분`;
}

export function FailedRunCard({
  runId,
  intentDescription,
  nodesTotal,
  nodesCompleted,
  nodesFailed,
  createdAt,
  completedAt,
}: FailedRunCardProps) {
  return (
    <Card
      className="border-rose-200 hover:border-rose-300 transition-colors"
      data-testid="failed-run-card"
    >
      <div className="flex items-center justify-between p-4 gap-4">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="w-8 h-8 rounded-full bg-rose-50 flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-rose-500 text-base filled">
              error
            </span>
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-slate-900 truncate">
              {intentDescription || runId}
            </p>
            <div className="flex items-center gap-2 text-[11px] text-slate-400">
              {intentDescription && <span>{runId}</span>}
              <span>
                {nodesCompleted}/{nodesTotal} 노드
              </span>
              <span className="text-rose-500 font-medium">
                {nodesFailed}개 실패
              </span>
              <span>{formatDuration(createdAt, completedAt)}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <Badge variant="failed" size="sm">
            실패
          </Badge>
          <Link
            href={`/runs/${runId}`}
            className="text-xs font-semibold text-primary hover:text-primary/80 transition-colors whitespace-nowrap"
            data-testid={`run-detail-link-${runId}`}
          >
            상세 보기 &rarr;
          </Link>
        </div>
      </div>
    </Card>
  );
}
