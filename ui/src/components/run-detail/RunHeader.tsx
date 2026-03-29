"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

export interface RunHeaderProps {
  intentDescription?: string;
  runId: string;
  state: string;
  startedAt?: string | null;
  completedAt?: string | null;
  nodesCompleted: number;
  nodesTotal: number;
  nodesFailed: number;
}

function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "-";
  const d = new Date(iso);
  return d.toLocaleString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDuration(
  startedAt: string | null | undefined,
  completedAt: string | null | undefined
): string {
  if (!startedAt) return "-";
  const start = new Date(startedAt).getTime();
  const end = completedAt ? new Date(completedAt).getTime() : Date.now();
  const diffMs = end - start;
  const minutes = Math.floor(diffMs / 60000);
  const seconds = Math.floor((diffMs % 60000) / 1000);
  if (minutes > 0) return `${minutes}분 ${seconds}초`;
  return `${seconds}초`;
}

function getStateBadgeVariant(
  state: string
): "completed" | "running" | "failed" | "pending" {
  switch (state) {
    case "completed":
      return "completed";
    case "running":
      return "running";
    case "failed":
      return "failed";
    default:
      return "pending";
  }
}

function getStateLabel(state: string): string {
  switch (state) {
    case "completed":
      return "완료";
    case "running":
      return "진행 중";
    case "failed":
      return "실패";
    case "preparing":
      return "준비 중";
    default:
      return state;
  }
}

export function RunHeader({
  intentDescription,
  runId,
  state,
  startedAt,
  completedAt,
  nodesCompleted,
  nodesTotal,
  nodesFailed,
}: RunHeaderProps) {
  return (
    <div className="space-y-4">
      <Link
        href="/"
        className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 transition-colors"
        aria-label="타임라인으로 돌아가기"
      >
        <span className="material-symbols-outlined text-base">
          arrow_back
        </span>
        타임라인으로 돌아가기
      </Link>

      <Card className="p-6">
        <h1 className="text-lg font-bold text-slate-900">
          {intentDescription || runId}
        </h1>
        <p className="text-xs text-slate-400 mt-1">{runId}</p>

        <div className="flex flex-wrap items-center gap-4 mt-4 text-sm text-slate-600">
          <span>
            {formatDateTime(startedAt)} ~ {formatDateTime(completedAt)}
          </span>
          <span className="text-slate-300">|</span>
          <span>
            총 {formatDuration(startedAt, completedAt)}
          </span>
        </div>

        <div className="flex items-center gap-3 mt-4">
          <Badge variant={getStateBadgeVariant(state)}>
            {getStateLabel(state)}
          </Badge>
          <span className="text-sm text-slate-600">
            {nodesCompleted}/{nodesTotal} 노드 완료
            {nodesFailed > 0 && (
              <span className="text-rose-600 ml-2">
                ({nodesFailed} 실패)
              </span>
            )}
          </span>
        </div>
      </Card>
    </div>
  );
}
