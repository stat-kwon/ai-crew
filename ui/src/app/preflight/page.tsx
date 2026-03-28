"use client";

import { useState } from "react";
import useSWR from "swr";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface CheckResult {
  id: string;
  name: string;
  description: string;
  status: "pass" | "fail" | "warning" | "pending";
  details?: string;
}

interface PreflightData {
  checks: CheckResult[];
  summary: {
    total: number;
    pass: number;
    fail: number;
    warning: number;
    ready: boolean;
  };
}

const fetcher = (url: string) => fetch(url).then((res) => (res.ok ? res.json() : null));

const checkIcons: Record<string, string> = {
  "ai-crew-dir": "folder",
  "git-status": "commit",
  "model-auth": "hub",
  "config-yaml": "settings",
  "graph-yaml": "verified",
  "node-deps": "link",
};

const checkLabels: Record<string, string> = {
  "ai-crew-dir": "AI-Crew 디렉토리",
  "git-status": "Git 상태",
  "model-auth": "AI 모델 연결",
  "config-yaml": "프로젝트 설정",
  "graph-yaml": "작업 흐름 검증",
  "node-deps": "노드 의존성",
};

export default function PreflightPage() {
  const { data, isLoading, mutate } = useSWR<PreflightData>("/api/preflight", fetcher);
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    await mutate();
    setRefreshing(false);
  };

  const checks = data?.checks || [];
  const summary = data?.summary || { total: 0, pass: 0, fail: 0, warning: 0, ready: false };

  return (
    <div className="flex flex-col items-center py-8">
      <div className="w-full max-w-[720px]">
        {/* Page Header */}
        <header className="mb-12">
          <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight mb-2 font-[var(--font-headline)]">
            환경 점검
          </h1>
          <p className="text-slate-500 font-medium">실행 전 시스템 무결성 및 리소스를 확인합니다.</p>
        </header>

        {/* Preflight Main Card */}
        <Card className="overflow-hidden mb-8">
          {/* Card Header */}
          <div className="px-8 pt-8 pb-4 flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900 opacity-80 uppercase tracking-widest text-[13px]">
              점검 결과
            </h2>
            <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing}>
              <span className={`material-symbols-outlined text-lg mr-1 ${refreshing ? "animate-spin" : ""}`}>
                refresh
              </span>
              다시 점검
            </Button>
          </div>

          {/* Checklist Area */}
          <div className="px-8 py-4 space-y-6">
            {isLoading ? (
              <div className="flex items-center justify-center py-12 text-slate-400">
                <span className="material-symbols-outlined animate-spin text-2xl mr-2">progress_activity</span>
                점검 중...
              </div>
            ) : checks.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                <span className="material-symbols-outlined text-4xl mb-2">error_outline</span>
                <p className="text-sm">점검 결과를 불러올 수 없습니다</p>
              </div>
            ) : (
              checks.map((check) => {
                const icon = checkIcons[check.id] || "check_circle";
                const label = checkLabels[check.id] || check.name;
                const isPassed = check.status === "pass";
                const isWarning = check.status === "warning";
                const isFailed = check.status === "fail";

                return (
                  <div key={check.id} className="flex items-center justify-between group">
                    <div className="flex items-center gap-4">
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          isPassed
                            ? "bg-primary/5 text-primary"
                            : isWarning
                              ? "bg-amber-50 text-amber-600"
                              : isFailed
                                ? "bg-rose-50 text-rose-600"
                                : "bg-slate-50 text-slate-400"
                        }`}
                      >
                        <span className="material-symbols-outlined text-[20px]">{icon}</span>
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-900">{label}</h3>
                        <p className="text-sm text-slate-500">{check.details || check.description}</p>
                      </div>
                    </div>
                    <Badge
                      variant={isPassed ? "success" : isWarning ? "warning" : isFailed ? "error" : "muted"}
                      size="sm"
                    >
                      {isPassed ? "통과" : isWarning ? "경고" : isFailed ? "실패" : "대기"}
                    </Badge>
                  </div>
                );
              })
            )}
          </div>

          {/* Divider */}
          <div className="mx-8 h-px bg-slate-100 mt-6" />

          {/* Summary Panel */}
          <div className="p-8 bg-slate-50/50">
            <div className="flex flex-col items-center text-center mb-8">
              <div
                className={`inline-flex items-center gap-2 px-6 py-2 rounded-full font-bold shadow-lg mb-6 ${
                  summary.ready
                    ? "bg-primary text-white shadow-primary/20"
                    : summary.fail > 0
                      ? "bg-rose-500 text-white shadow-rose-500/20"
                      : "bg-amber-500 text-white shadow-amber-500/20"
                }`}
              >
                <span className="material-symbols-outlined text-sm filled">
                  {summary.ready ? "check_circle" : summary.fail > 0 ? "error" : "warning"}
                </span>
                {summary.ready ? "실행 가능" : summary.fail > 0 ? "실행 불가" : "주의 필요"}
              </div>

              <div className="grid grid-cols-3 gap-12 w-full max-w-md mx-auto">
                <div className="space-y-1">
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">통과</p>
                  <p className="font-bold text-slate-900 text-lg">{summary.pass}개</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">경고</p>
                  <p className="font-bold text-slate-900 text-lg">{summary.warning}개</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">실패</p>
                  <p className="font-bold text-slate-900 text-lg">{summary.fail}개</p>
                </div>
              </div>
            </div>

            {/* CTA Action */}
            <div className="flex justify-center">
              <Button
                size="xl"
                disabled={!summary.ready}
                className="px-10 py-4 bg-gradient-to-br from-primary to-primary-container shadow-xl shadow-indigo-200 hover:scale-[1.02] transition-all duration-200"
              >
                <span className="material-symbols-outlined mr-1">play_arrow</span>
                개발 실행 시작
              </Button>
            </div>
          </div>
        </Card>

        {/* Footer Command Helper */}
        <footer className="text-center">
          <p className="text-sm text-slate-400 font-medium tracking-tight">
            <span className="opacity-60">환경 점검 명령:</span>
            <code className="bg-white px-2 py-0.5 rounded border border-slate-200 mx-1 text-slate-600 font-mono">
              /crew:preflight
            </code>
            <span className="mx-2">→</span>
            <span className="opacity-60">개발 실행:</span>
            <code className="bg-white px-2 py-0.5 rounded border border-slate-200 mx-1 text-slate-600 font-mono">
              /crew:run
            </code>
          </p>
        </footer>
      </div>
    </div>
  );
}
