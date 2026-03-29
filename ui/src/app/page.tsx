"use client";

import { useState, useMemo } from "react";
import useSWR from "swr";
import { ProjectSummaryBar } from "@/components/timeline/ProjectSummaryBar";
import {
  TimelineFilter,
  type RunStatusFilter,
} from "@/components/timeline/TimelineFilter";
import { DateDivider } from "@/components/timeline/DateDivider";
import { ActiveRunCard } from "@/components/timeline/ActiveRunCard";
import { CompletedRunCard } from "@/components/timeline/CompletedRunCard";
import { FailedRunCard } from "@/components/timeline/FailedRunCard";

interface StateData {
  runId?: string;
  intent?: { description?: string };
  nodes: Record<
    string,
    { status: string; startedAt?: string; completedAt?: string }
  >;
}

interface RunEntry {
  runId: string;
  state: string;
  createdAt: string;
  completedAt: string | null;
  nodesTotal: number;
  nodesCompleted: number;
  nodesFailed: number;
  intentDescription?: string;
}

const fetcher = (url: string) =>
  fetch(url).then((res) => (res.ok ? res.json() : null));

function formatDateLabel(isoDate: string): string {
  const date = new Date(isoDate);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);

  if (date.toDateString() === today.toDateString()) return "오늘";
  if (date.toDateString() === yesterday.toDateString()) return "어제";

  return date.toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function groupRunsByDate(
  runs: RunEntry[]
): { date: string; label: string; runs: RunEntry[] }[] {
  const groups: Record<string, RunEntry[]> = {};

  for (const run of runs) {
    const dateKey = new Date(run.createdAt).toDateString();
    if (!groups[dateKey]) groups[dateKey] = [];
    groups[dateKey].push(run);
  }

  return Object.entries(groups)
    .map(([dateKey, dateRuns]) => ({
      date: dateKey,
      label: formatDateLabel(dateRuns[0].createdAt),
      runs: dateRuns,
    }))
    .sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
}

export default function TimelinePage() {
  const [statusFilter, setStatusFilter] = useState<RunStatusFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const { data: state } = useSWR<StateData>("/api/state", fetcher, {
    refreshInterval: 3000,
  });
  const { data: runsData } = useSWR<{ runs: RunEntry[] }>(
    "/api/runs",
    fetcher,
    { refreshInterval: 5000 }
  );

  const runs = runsData?.runs || [];

  const filteredRuns = useMemo(() => {
    let result = runs;

    if (statusFilter !== "all") {
      result = result.filter((r) => r.state === statusFilter);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (r) =>
          r.runId.toLowerCase().includes(query) ||
          r.intentDescription?.toLowerCase().includes(query)
      );
    }

    return result;
  }, [runs, statusFilter, searchQuery]);

  const dateGroups = useMemo(
    () => groupRunsByDate(filteredRuns),
    [filteredRuns]
  );

  const currentRunId = state?.runId;

  function isActiveRun(run: RunEntry): boolean {
    return run.runId === currentRunId && run.state === "running";
  }

  return (
    <div className="space-y-6">
      <div className="flex items-baseline justify-between">
        <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
          타임라인
        </h2>
      </div>

      <ProjectSummaryBar />

      <TimelineFilter
        statusFilter={statusFilter}
        searchQuery={searchQuery}
        onStatusFilterChange={setStatusFilter}
        onSearchQueryChange={setSearchQuery}
      />

      {dateGroups.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <span className="material-symbols-outlined text-5xl mb-3 block">
            inbox
          </span>
          <p className="text-sm font-medium">
            {runs.length === 0
              ? "실행 기록이 없습니다"
              : "필터 조건에 맞는 런이 없습니다"}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {dateGroups.map((group) => (
            <div key={group.date}>
              <DateDivider date={group.label} />
              <div className="space-y-3 mt-2">
                {group.runs.map((run) => {
                  if (isActiveRun(run) && state?.nodes) {
                    return (
                      <ActiveRunCard
                        key={run.runId}
                        runId={run.runId}
                        intentDescription={
                          run.intentDescription ||
                          state?.intent?.description
                        }
                        nodes={state.nodes}
                        createdAt={run.createdAt}
                      />
                    );
                  }

                  if (run.state === "failed") {
                    return (
                      <FailedRunCard
                        key={run.runId}
                        runId={run.runId}
                        intentDescription={run.intentDescription}
                        nodesTotal={run.nodesTotal}
                        nodesCompleted={run.nodesCompleted}
                        nodesFailed={run.nodesFailed}
                        createdAt={run.createdAt}
                        completedAt={run.completedAt}
                      />
                    );
                  }

                  return (
                    <CompletedRunCard
                      key={run.runId}
                      runId={run.runId}
                      intentDescription={run.intentDescription}
                      nodesTotal={run.nodesTotal}
                      nodesCompleted={run.nodesCompleted}
                      createdAt={run.createdAt}
                      completedAt={run.completedAt}
                    />
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
