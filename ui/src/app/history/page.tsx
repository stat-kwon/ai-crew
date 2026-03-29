"use client";

import { Suspense, useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import useSWR from "swr";
import { fetchRuns, fetchRunById } from "@/lib/api";
import { RunList } from "@/components/history/RunList";
import { RunDetail } from "@/components/history/RunDetail";
import { LoadingState } from "@/components/common/LoadingState";
import { ErrorState } from "@/components/common/ErrorState";
import { EmptyState } from "@/components/common/EmptyState";
import { ScrollArea } from "@/components/ui/scroll-area";
import { History } from "lucide-react";

function HistoryContent() {
  const searchParams = useSearchParams();
  const runIdParam = searchParams.get("run");

  const { data: registry, error: registryError, isLoading: registryLoading } = useSWR("runs", fetchRuns);
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);

  useEffect(() => {
    if (runIdParam) {
      setSelectedRunId(runIdParam);
    } else if (registry?.runs && registry.runs.length > 0 && !selectedRunId) {
      const sorted = [...registry.runs].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setSelectedRunId(sorted[0].runId);
    }
  }, [runIdParam, registry?.runs, selectedRunId]);

  const { data: manifest, error: manifestError, isLoading: manifestLoading } = useSWR(selectedRunId ? `run-${selectedRunId}` : null, () => (selectedRunId ? fetchRunById(selectedRunId) : null));

  if (registryError) {
    return (
      <div className="page-shell">
        <ErrorState message={registryError.message} />
      </div>
    );
  }

  if (registryLoading) {
    return (
      <div className="page-shell">
        <LoadingState />
      </div>
    );
  }

  const runs = registry?.runs ?? [];

  if (runs.length === 0) {
    return (
      <div className="page-shell">
        <header className="page-header">
          <div className="page-kicker">Run archive</div>
          <h1 className="page-title">히스토리</h1>
        </header>
        <EmptyState title="히스토리 없음" description="아직 완료된 런이 없습니다. /crew:run을 실행하면 여기에 기록됩니다." icon={<History className="h-7 w-7" />} />
      </div>
    );
  }

  return (
    <div className="page-shell max-w-[1600px]">
      <header className="page-header">
        <div className="page-kicker">Run archive</div>
        <h1 className="page-title">히스토리</h1>
        <p className="page-description">버전 감각이 분명한 런 목록과 선택된 런의 상세 스냅샷을 나란히 배치해, 현재와 과거의 맥락을 빠르게 비교할 수 있게 구성했습니다.</p>
      </header>

      <div className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
        <aside className="panel-surface overflow-hidden">
          <div className="border-b border-border/70 px-5 py-5">
            <div className="text-lg font-semibold tracking-tight">런 목록</div>
            <p className="mt-1 text-sm text-muted-foreground">{runs.length}개의 런</p>
          </div>
          <ScrollArea className="h-[calc(100vh-280px)] px-3 py-3">
            <RunList runs={runs} selectedRunId={selectedRunId} onSelectRun={setSelectedRunId} />
          </ScrollArea>
        </aside>

        <section className="min-w-0">
          {manifestError ? (
            <ErrorState message={manifestError.message} />
          ) : manifestLoading ? (
            <LoadingState />
          ) : manifest ? (
            <RunDetail manifest={manifest} />
          ) : (
            <EmptyState title="런 선택" description="왼쪽에서 런을 선택하세요." />
          )}
        </section>
      </div>
    </div>
  );
}

export default function HistoryPage() {
  return (
    <Suspense fallback={<div className="page-shell"><LoadingState /></div>}>
      <HistoryContent />
    </Suspense>
  );
}
