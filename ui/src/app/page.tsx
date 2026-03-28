"use client";

import Link from "next/link";
import useSWR from "swr";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface StateData {
  bundleName: string;
  runId?: string;
  nodes: Record<string, { status: string; startedAt?: string; completedAt?: string }>;
}

interface GraphData {
  nodes: Array<{ id: string; type: string }>;
}

interface AidlcStage {
  name: string;
  status: "pending" | "active" | "complete";
  tasks: { text: string; done: boolean }[];
}

interface RunEntry {
  runId: string;
  state: string;
  createdAt: string;
  completedAt: string | null;
  nodesTotal: number;
  nodesCompleted: number;
  nodesFailed: number;
}

const fetcher = (url: string) => fetch(url).then((res) => res.ok ? res.json() : null);

function getStatusCounts(nodes: Record<string, { status: string }>) {
  const counts = { pending: 0, running: 0, completed: 0, failed: 0 };
  Object.values(nodes).forEach((node) => {
    const status = node.status as keyof typeof counts;
    if (status in counts) counts[status]++;
  });
  return counts;
}

function getDesignProgress(stages: AidlcStage[] | undefined) {
  if (!stages || stages.length === 0) return { current: "시작 전", progress: 0 };
  const completed = stages.filter(s => s.status === "complete").length;
  const active = stages.find(s => s.status === "active");
  const progress = Math.round((completed / stages.length) * 100);
  return {
    current: active?.name || (completed === stages.length ? "완료" : "시작 전"),
    progress,
    phase: `${completed}/${stages.length}`,
  };
}

export default function DashboardPage() {
  const { data: state } = useSWR<StateData>("/api/state", fetcher, { refreshInterval: 5000 });
  const { data: graph } = useSWR<GraphData>("/api/graph", fetcher);
  const { data: aidlc } = useSWR<{ stages: AidlcStage[] }>("/api/aidlc/state", fetcher);
  const { data: runsData } = useSWR<{ runs: RunEntry[] }>("/api/runs", fetcher);

  const statusCounts = state?.nodes ? getStatusCounts(state.nodes) : null;
  const designProgress = getDesignProgress(aidlc?.stages);
  const nodeCount = graph?.nodes?.length || 0;
  const totalNodes = statusCounts ? Object.values(statusCounts).reduce((a, b) => a + b, 0) : 0;

  const recentRuns = runsData?.runs?.slice(0, 3) || [];

  const flowSteps = [
    { id: "init", label: "설계 초안 작성", cmd: "/crew:init", icon: "edit_note" },
    { id: "elaborate", label: "설계 고도화", cmd: "/crew:elaborate", icon: "architecture" },
    { id: "check", label: "환경 점검", cmd: "/crew:check", icon: "fact_check" },
    { id: "run", label: "개발 실행", cmd: "/crew:run", icon: "play_circle" },
    { id: "merge", label: "결과 통합", cmd: "/crew:merge", icon: "inventory_2" },
  ];

  // Determine current step based on state (1-5)
  const currentStep: number = statusCounts?.completed === totalNodes && totalNodes > 0
    ? 5
    : statusCounts?.running
      ? 4
      : statusCounts?.completed
        ? 4
        : aidlc?.stages?.some(s => s.status === "complete")
          ? 2
          : 1;

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex items-baseline justify-between">
        <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight font-[var(--font-headline)]">대시보드</h2>
        <p className="text-sm text-slate-500 font-medium">
          마지막 업데이트: <span className="text-slate-900">방금 전</span>
        </p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        {/* Card 1: Team */}
        <Card className="p-6 card-shadow flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">현재 팀 구성</p>
            <p className="text-xl font-bold text-slate-900">{state?.bundleName || "미설정"}</p>
            <p className="text-sm text-primary font-semibold mt-1">{nodeCount}명 활동 중</p>
          </div>
          <div className="p-3 bg-indigo-50 rounded-xl">
            <span className="material-symbols-outlined text-primary text-3xl filled">groups</span>
          </div>
        </Card>

        {/* Card 2: Last Run */}
        <Card className="p-6 card-shadow flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">마지막 실행</p>
            <div className="flex items-center gap-2">
              <p className="text-xl font-bold text-slate-900">{state?.runId || "없음"}</p>
              {statusCounts?.running ? (
                <Badge variant="running" size="sm">진행 중</Badge>
              ) : statusCounts?.failed ? (
                <Badge variant="failed" size="sm">실패</Badge>
              ) : statusCounts?.completed ? (
                <Badge variant="completed" size="sm">완료</Badge>
              ) : null}
            </div>
            <p className="text-sm text-slate-500 mt-1">
              {totalNodes > 0 ? `${statusCounts?.completed || 0}/${totalNodes} 노드 완료` : "실행 기록 없음"}
            </p>
          </div>
          <div className="p-3 bg-slate-50 rounded-xl">
            <span className="material-symbols-outlined text-slate-400 text-3xl">history</span>
          </div>
        </Card>

        {/* Card 3: Node Status */}
        <Card className="p-6 card-shadow">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">팀원 현황</p>
          <p className="text-xl font-bold text-slate-900 mb-3">
            {statusCounts
              ? `${statusCounts.completed} 완료 / ${statusCounts.running} 진행 / ${statusCounts.pending} 대기`
              : "데이터 없음"}
          </p>
          {statusCounts && totalNodes > 0 && (
            <div className="flex h-2 w-full rounded-full overflow-hidden bg-slate-100 gap-0.5">
              <div
                className="h-full bg-emerald-500 transition-all"
                style={{ width: `${(statusCounts.completed / totalNodes) * 100}%` }}
              />
              <div
                className="h-full bg-primary transition-all"
                style={{ width: `${(statusCounts.running / totalNodes) * 100}%` }}
              />
              <div
                className="h-full bg-slate-300 transition-all"
                style={{ width: `${(statusCounts.pending / totalNodes) * 100}%` }}
              />
              {statusCounts.failed > 0 && (
                <div
                  className="h-full bg-rose-500 transition-all"
                  style={{ width: `${(statusCounts.failed / totalNodes) * 100}%` }}
                />
              )}
            </div>
          )}
        </Card>

        {/* Card 4: Design Progress */}
        <Card className="p-6 card-shadow">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">설계 진행</p>
          <p className="text-xl font-bold text-slate-900 mb-3">{designProgress.current}</p>
          <div className="relative w-full h-2 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="absolute top-0 left-0 h-full bg-primary transition-all duration-500"
              style={{ width: `${designProgress.progress}%` }}
            />
          </div>
          <div className="flex justify-between mt-2">
            <span className="text-[10px] font-bold text-primary">{designProgress.progress}% 완료</span>
            <span className="text-[10px] font-bold text-slate-400 italic">단계 {designProgress.phase}</span>
          </div>
        </Card>
      </div>

      {/* Row 2: Flow and Recent */}
      <div className="flex flex-col xl:flex-row gap-6">
        {/* Development Flow */}
        <Card className="xl:w-[60%] overflow-hidden">
          <div className="p-6 border-b border-slate-50 flex justify-between items-center">
            <h3 className="text-lg font-bold text-slate-900">개발 흐름</h3>
            <Link href="/design" className="text-primary text-xs font-bold hover:underline">
              자세히 보기
            </Link>
          </div>
          <div className="p-10">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4 relative">
              {/* Connecting Line */}
              <div className="hidden md:block absolute top-[22px] left-0 w-full h-[2px] bg-slate-100 -z-0" />

              {flowSteps.map((step, idx) => {
                const isActive = idx + 1 === currentStep;
                const isCompleted = idx + 1 < currentStep;
                const isPending = idx + 1 > currentStep;

                return (
                  <div key={step.id} className="z-10 flex flex-col items-center gap-3">
                    <div
                      className={`flex items-center justify-center rounded-full shadow-sm transition-all ${
                        isActive
                          ? "w-14 h-14 border-[3px] border-primary bg-white text-primary shadow-[0_0_20px_rgba(70,72,212,0.15)] scale-110"
                          : isCompleted
                            ? "w-11 h-11 border-2 border-emerald-500 bg-emerald-500 text-white"
                            : "w-11 h-11 border-2 border-slate-100 bg-white text-slate-300"
                      }`}
                    >
                      <span
                        className={`material-symbols-outlined ${isActive ? "text-2xl" : "text-xl"} ${
                          isActive || isCompleted ? "filled" : ""
                        }`}
                      >
                        {isCompleted ? "check" : step.icon}
                      </span>
                    </div>
                    <div className="text-center">
                      <p
                        className={`text-sm ${
                          isActive
                            ? "font-extrabold text-primary"
                            : isCompleted
                              ? "font-bold text-slate-700"
                              : "font-medium text-slate-400"
                        }`}
                      >
                        {step.label}
                      </p>
                      <code
                        className={`text-[10px] font-mono ${
                          isActive ? "text-primary/70" : isPending ? "text-slate-300" : "text-slate-400"
                        }`}
                      >
                        {step.cmd}
                      </code>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* AI Suggestion */}
          <div className="mx-6 mb-6 p-4 bg-slate-50 rounded-xl flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-amber-500 flex items-center justify-center text-white shrink-0">
              <span className="material-symbols-outlined">lightbulb</span>
            </div>
            <div>
              <p className="text-xs font-bold text-slate-900">다음 단계</p>
              <p className="text-xs text-slate-500">
                {currentStep === 1 && "설계 단계를 시작하려면 /crew:init 명령어를 실행하세요."}
                {currentStep === 2 && "설계를 고도화하려면 /crew:elaborate 명령어를 실행하세요."}
                {currentStep === 3 && "개발을 실행하려면 /crew:run 명령어를 실행하세요."}
                {currentStep === 4 && "결과를 통합하려면 /crew:merge 명령어를 실행하세요."}
                {currentStep === 5 && "모든 단계가 완료되었습니다!"}
              </p>
            </div>
          </div>
        </Card>

        {/* Recent Runs */}
        <Card className="xl:w-[40%] flex flex-col">
          <div className="p-6 border-b border-slate-50 flex justify-between items-center">
            <h3 className="text-lg font-bold text-slate-900">최근 실행</h3>
            <Link href="/develop" className="text-slate-400 hover:text-slate-600">
              <span className="material-symbols-outlined">more_horiz</span>
            </Link>
          </div>
          <div className="flex-1 p-6 space-y-4">
            {recentRuns.length === 0 ? (
              <div className="text-center py-8 text-slate-400">
                <span className="material-symbols-outlined text-4xl mb-2">inbox</span>
                <p className="text-sm">실행 기록이 없습니다</p>
              </div>
            ) : (
              recentRuns.map((run) => {
                const isRunning = run.state === "running";
                const isFailed = run.state === "failed";
                const isCompleted = run.state === "completed";

                return (
                  <div
                    key={run.runId}
                    className={`flex items-center justify-between p-4 rounded-xl border transition-all ${
                      isRunning
                        ? "bg-indigo-50/30 border-primary/10 ring-1 ring-primary/5"
                        : "bg-slate-50/50 border-transparent hover:border-slate-100"
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          isRunning
                            ? "bg-primary/10"
                            : isFailed
                              ? "bg-rose-50"
                              : "bg-emerald-50"
                        }`}
                      >
                        <div
                          className={`w-3 h-3 rounded-full ${
                            isRunning
                              ? "bg-primary animate-pulse shadow-[0_0_8px_rgba(70,72,212,0.4)]"
                              : isFailed
                                ? "bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.4)]"
                                : "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]"
                          }`}
                        />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-900">{run.runId}</p>
                        <p
                          className={`text-[10px] font-bold uppercase tracking-tight ${
                            isRunning
                              ? "text-primary"
                              : isFailed
                                ? "text-rose-600"
                                : "text-emerald-600"
                          }`}
                        >
                          {isRunning ? "진행 중" : isFailed ? "실패" : "완료"}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-bold text-slate-700">
                        {run.nodesCompleted}/{run.nodesTotal} 노드
                      </p>
                      <p className="text-[10px] text-slate-400">
                        {run.completedAt
                          ? new Date(run.completedAt).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })
                          : "진행 중"}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
          <div className="p-4 border-t border-slate-50 text-center">
            <Link
              href="/develop"
              className="text-slate-400 text-xs font-bold hover:text-slate-600 transition-colors uppercase tracking-widest"
            >
              전체 기록 보기
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
}
