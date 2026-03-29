"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { AidlcPhase, AidlcStage } from "@/types";
import { Check, Circle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface AidlcProgressProps {
  phases: AidlcPhase[];
}

function StageIcon({ stage }: { stage: AidlcStage }) {
  if (stage.completed) return <Check className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />;
  if (stage.current) return <Loader2 className="h-4 w-4 animate-spin text-blue-600 dark:text-blue-400" />;
  return <Circle className="h-4 w-4 text-muted-foreground" />;
}

export function AidlcProgress({ phases }: AidlcProgressProps) {
  if (phases.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">설계 단계</CardTitle>
          <CardDescription>aidlc-state.md 파일이 없으면 설계 진행도를 구성할 수 없습니다.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="panel-subtle px-5 py-5 text-sm text-muted-foreground">aidlc-state.md 파일이 없습니다.</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-5 xl:grid-cols-3">
      {phases.map((phase) => {
        const completedCount = phase.stages.filter((stage) => stage.completed).length;
        return (
          <Card key={phase.name}>
            <CardHeader className="gap-3">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <CardTitle className="text-xl">{phase.displayName}</CardTitle>
                  <CardDescription className="mt-1">{completedCount}/{phase.stages.length} 단계 완료</CardDescription>
                </div>
                <div className="rounded-full border border-border/70 bg-background px-3 py-1 text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
                  {phase.name}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {phase.stages.map((stage) => (
                  <li
                    key={stage.name}
                    className={cn(
                      "flex items-center gap-3 rounded-2xl border px-4 py-3 transition-colors",
                      stage.current && "border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950/50",
                      !stage.current && "border-border/70 bg-muted/25",
                      stage.completed && "text-muted-foreground"
                    )}
                  >
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-border/70 bg-background">
                      <StageIcon stage={stage} />
                    </div>
                    <div className="min-w-0">
                      <div className={cn("text-sm font-medium tracking-tight", stage.completed && "line-through", stage.current && "text-blue-700 dark:text-blue-300")}>
                        {stage.displayName}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {stage.current ? "현재 진행 중" : stage.completed ? "완료됨" : "대기 중"}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
