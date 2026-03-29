"use client";

import useSWR from "swr";
import { fetchCurrentState, fetchAidlcState } from "@/lib/api";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { NodeTimeline } from "@/components/current/NodeTimeline";
import { AidlcProgress } from "@/components/current/AidlcProgress";
import { LoadingState } from "@/components/common/LoadingState";
import { ErrorState } from "@/components/common/ErrorState";
import { EmptyState } from "@/components/common/EmptyState";

export default function CurrentPage() {
  const { data: current, error: currentError, isLoading: currentLoading } = useSWR("current", fetchCurrentState, { refreshInterval: 3000 });
  const { data: aidlcState, error: aidlcError, isLoading: aidlcLoading } = useSWR("aidlc-state", fetchAidlcState, { refreshInterval: 5000 });

  if (currentError || aidlcError) {
    return (
      <div className="page-shell">
        <ErrorState message={(currentError || aidlcError)?.message} />
      </div>
    );
  }

  return (
    <div className="page-shell">
      <header className="page-header">
        <div className="page-kicker">Current run</div>
        <h1 className="page-title">현재 상태</h1>
        <p className="page-description">
          현재 그래프 실행 상태와 AI-DLC 설계 진행 단계를 분리해 보여주며, 노드 레벨·스크래치패드·단계 체크리스트를 한 흐름 안에 정리합니다.
        </p>
        {current?.runId && <div className="rounded-full border border-border/70 bg-background px-4 py-2 font-mono text-sm text-muted-foreground">런 ID: {current.runId}</div>}
      </header>

      <Tabs defaultValue="progress">
        <TabsList>
          <TabsTrigger value="progress">개발 진행</TabsTrigger>
          <TabsTrigger value="design">설계 단계</TabsTrigger>
        </TabsList>

        <TabsContent value="progress" className="mt-2">
          {currentLoading ? (
            <LoadingState />
          ) : current?.state && current?.graph ? (
            <NodeTimeline state={current.state} graph={current.graph} scratchpads={current.scratchpads} />
          ) : (
            <EmptyState title="진행 중인 작업 없음" description="현재 실행 중인 그래프가 없습니다." />
          )}
        </TabsContent>

        <TabsContent value="design" className="mt-2">
          {aidlcLoading ? <LoadingState /> : <AidlcProgress phases={aidlcState?.phases ?? []} />}
        </TabsContent>
      </Tabs>
    </div>
  );
}
