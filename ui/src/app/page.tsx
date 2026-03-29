"use client";

import useSWR from "swr";
import { fetchRuns, fetchCurrentState } from "@/lib/api";
import { CurrentRunCard } from "@/components/home/CurrentRunCard";
import { RunHistoryList } from "@/components/home/RunHistoryList";
import { LoadingCard } from "@/components/common/LoadingState";
import { ErrorState } from "@/components/common/ErrorState";
import { Card, CardContent } from "@/components/ui/card";

export default function HomePage() {
  const { data: registry, error: registryError, isLoading: registryLoading } = useSWR("runs", fetchRuns, { refreshInterval: 5000 });
  const { data: current, error: currentError, isLoading: currentLoading } = useSWR("current", fetchCurrentState, { refreshInterval: 3000 });

  const isLoading = registryLoading || currentLoading;
  const error = registryError || currentError;
  const runCount = registry?.runs?.length ?? 0;
  const activeNodes = current?.state?.nodes ? Object.keys(current.state.nodes).length : 0;

  if (error) {
    return (
      <div className="page-shell">
        <ErrorState message={error.message} />
      </div>
    );
  }

  return (
    <div className="page-shell">
      <header className="page-header">
        <div className="page-kicker">Overview</div>
        <h1 className="page-title">대시보드</h1>
        <p className="page-description">
          현재 진행 중인 그래프와 최근 런 히스토리를 한 화면에서 읽을 수 있도록, 정보 밀도는 높이고 시각적 소음은 줄인 운영형 콘솔 레이아웃입니다.
        </p>
        <div className="grid gap-3 md:grid-cols-3">
          <Card className="shadow-none">
            <CardContent className="px-5 py-5">
              <div className="metric-label">Active nodes</div>
              <div className="metric-value mt-2">{activeNodes}</div>
            </CardContent>
          </Card>
          <Card className="shadow-none">
            <CardContent className="px-5 py-5">
              <div className="metric-label">Recorded runs</div>
              <div className="metric-value mt-2">{runCount}</div>
            </CardContent>
          </Card>
          <Card className="shadow-none">
            <CardContent className="px-5 py-5">
              <div className="metric-label">Mode</div>
              <div className="mt-2 text-xl font-semibold tracking-tight">Read-only</div>
            </CardContent>
          </Card>
        </div>
      </header>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(360px,0.9fr)]">
        {isLoading ? (
          <>
            <LoadingCard />
            <LoadingCard />
          </>
        ) : (
          <>
            <CurrentRunCard state={current?.state ?? null} graph={current?.graph ?? null} runId={current?.runId ?? null} />
            <RunHistoryList runs={registry?.runs ?? []} />
          </>
        )}
      </section>
    </div>
  );
}
