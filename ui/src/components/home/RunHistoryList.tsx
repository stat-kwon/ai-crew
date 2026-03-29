"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/common/StatusBadge";
import type { RunIndexEntry } from "@/types";
import { History, ArrowRight } from "lucide-react";
import Link from "next/link";

interface RunHistoryListProps {
  runs: RunIndexEntry[];
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function getRunVersion(runId: string, index: number, total: number): string {
  return `v${total - index}`;
}

export function RunHistoryList({ runs }: RunHistoryListProps) {
  if (runs.length === 0) {
    return (
      <Card className="min-h-[320px]">
        <CardHeader>
          <CardTitle className="flex items-center gap-3 text-lg">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl border border-border/70 bg-muted/45">
              <History className="h-5 w-5 text-muted-foreground" />
            </span>
            이전 작업
          </CardTitle>
          <CardDescription>이전 런이 누적되면 버전 감각과 상태 차이를 홈에서 바로 확인할 수 있습니다.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="panel-subtle px-5 py-5 text-sm text-muted-foreground">아직 완료된 작업이 없습니다.</div>
        </CardContent>
      </Card>
    );
  }

  const sortedRuns = [...runs].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return (
    <Card className="min-h-[320px]">
      <CardHeader className="gap-3">
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-3 text-xl">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-border/70 bg-muted/45">
                <History className="h-5 w-5" />
              </span>
              이전 작업
            </CardTitle>
            <CardDescription className="mt-2">최신순으로 정렬된 런 목록을 요약하고, 각 버전의 상태와 완료율을 드러냅니다.</CardDescription>
          </div>
          <Link href="/history" className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
            전체 보기
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        <ul className="space-y-3">
          {sortedRuns.slice(0, 5).map((run, index) => (
            <li key={run.runId}>
              <Link
                href={`/history?run=${run.runId}`}
                className="group panel-subtle flex items-start justify-between gap-4 px-4 py-4 transition-colors hover:bg-background"
              >
                <div className="min-w-0 flex-1">
                  <div className="mb-2 flex items-center gap-2">
                    <span className="inline-flex rounded-full border border-border/70 bg-background px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                      {getRunVersion(run.runId, index, sortedRuns.length)}
                    </span>
                    <StatusBadge status={run.state} />
                  </div>
                  <p className="line-clamp-1 text-sm font-medium tracking-tight text-foreground">{run.intent}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{formatDate(run.createdAt)}</p>
                </div>
                <div className="shrink-0 text-right">
                  <div className="text-lg font-semibold tracking-tight text-foreground">{run.nodesCompleted}/{run.nodesTotal}</div>
                  <div className="text-xs uppercase tracking-[0.14em] text-muted-foreground">완료 노드</div>
                  {run.nodesFailed > 0 && <div className="mt-2 text-xs font-medium text-red-600 dark:text-red-400">{run.nodesFailed} 실패</div>}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
