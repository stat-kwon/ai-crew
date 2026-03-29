"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Progress } from "@/components/ui/progress";
import type { GraphState, GraphDefinition } from "@/types";
import { Activity, ArrowUpRight } from "lucide-react";
import Link from "next/link";

interface CurrentRunCardProps {
  state: GraphState | null;
  graph: GraphDefinition | null;
  runId: string | null;
}

export function CurrentRunCard({ state, graph, runId }: CurrentRunCardProps) {
  if (!state || !state.nodes || Object.keys(state.nodes).length === 0) {
    return (
      <Card className="min-h-[320px]">
        <CardHeader>
          <CardTitle className="flex items-center gap-3 text-lg">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl border border-border/70 bg-muted/45">
              <Activity className="h-5 w-5 text-muted-foreground" />
            </span>
            현재 진행 중
          </CardTitle>
          <CardDescription>실행 중인 그래프가 없을 때도 홈에서 상태를 바로 파악할 수 있도록 빈 상태를 유지합니다.</CardDescription>
        </CardHeader>
        <CardContent className="flex h-full items-center">
          <div className="panel-subtle w-full px-5 py-5">
            <div className="text-sm font-medium">진행 중인 작업이 없습니다.</div>
            <div className="mt-1 text-sm text-muted-foreground">새 런이 시작되면 이 카드가 현재 실행 흐름, 진행률, 상태 분포를 요약합니다.</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const nodeIds = Object.keys(state.nodes);
  const completed = nodeIds.filter((id) => state.nodes[id].status === "completed").length;
  const failed = nodeIds.filter((id) => state.nodes[id].status === "failed").length;
  const running = nodeIds.filter((id) => state.nodes[id].status === "running").length;
  const pending = nodeIds.filter((id) => state.nodes[id].status === "pending").length;
  const total = nodeIds.length;
  const levels = graph?.nodes ? new Set(graph.nodes.map((node) => node.depends_on.length)).size + 1 : undefined;

  const progress = Math.round(((completed + failed) / total) * 100);
  const isRunning = running > 0 || pending > 0;

  return (
    <Link href="/current" className="block">
      <Card className="min-h-[320px] transition-transform duration-200 hover:-translate-y-0.5">
        <CardHeader className="gap-4">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-border/70 bg-muted/45">
                <Activity className="h-5 w-5 text-foreground" />
              </div>
              <div>
                <CardTitle className="text-xl">현재 진행 중</CardTitle>
                <CardDescription className="mt-1">지금 어떤 런이 어디까지 왔는지, 실패와 대기까지 포함해 한 번에 요약합니다.</CardDescription>
              </div>
            </div>
            <div className="flex flex-col items-end gap-2">
              <StatusBadge status={isRunning ? "running" : failed > 0 ? "failed" : "completed"} />
              <span className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground">
                상세 보기
                <ArrowUpRight className="h-3.5 w-3.5" />
              </span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="panel-subtle flex items-center justify-between px-4 py-3">
            <div>
              <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Run ID</div>
              <p className="mt-1 font-mono text-sm text-foreground/80">{runId}</p>
            </div>
            <div className="text-right">
              <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Graph scope</div>
              <p className="mt-1 text-sm font-medium">{total} nodes{levels ? ` · ${levels} levels` : ""}</p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-end justify-between">
              <div>
                <div className="metric-label">진행률</div>
                <div className="metric-value">{progress}%</div>
              </div>
              <div className="text-sm text-muted-foreground">완료·실패 기준</div>
            </div>
            <Progress value={progress} className="h-2.5 rounded-full" />
          </div>

          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {[
              ["완료", completed, "text-emerald-600 dark:text-emerald-400"],
              ["실패", failed, "text-red-600 dark:text-red-400"],
              ["진행", running, "text-blue-600 dark:text-blue-400"],
              ["대기", pending, "text-muted-foreground"],
            ].map(([label, value, tone]) => (
              <div key={label} className="panel-subtle px-4 py-4">
                <div className="text-xs uppercase tracking-[0.14em] text-muted-foreground">{label}</div>
                <div className={`mt-2 text-2xl font-semibold tracking-tight ${tone}`}>{value}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
