"use client";

import { useState, useEffect } from "react";
import useSWR from "swr";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ConfigData {
  project?: string;
  bundle?: string;
  model?: string;
  isolation?: "worktree" | "none";
  locale?: string;
  merge_mode?: "auto" | "manual";
  runs?: {
    retention?: number;
    auto_archive?: boolean;
    context_depth?: number;
  };
}

const fetcher = (url: string) => fetch(url).then((res) => (res.ok ? res.json() : null));

export default function SettingsPage() {
  const { data: config, mutate } = useSWR<ConfigData>("/api/config", fetcher);
  const [form, setForm] = useState<ConfigData>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (config) {
      setForm(config);
    }
  }, [config]);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSaved(false);

    try {
      const response = await fetch("/api/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (!response.ok) {
        throw new Error("저장에 실패했습니다");
      }

      setSaved(true);
      mutate();
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "저장에 실패했습니다");
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    if (config) {
      setForm(config);
    }
  };

  return (
    <div className="flex flex-col items-center py-8">
      <div className="w-full max-w-[720px]">
        {/* Page Header */}
        <header className="mb-12">
          <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight mb-2 font-[var(--font-headline)]">
            설정
          </h1>
          <p className="text-slate-500 font-medium">config.yaml 프로젝트 설정을 관리합니다.</p>
        </header>

        {/* Alerts */}
        {saved && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-emerald-600 filled">check_circle</span>
              <p className="text-sm font-medium text-emerald-700">설정이 저장되었습니다.</p>
            </div>
          </div>
        )}

        {error && (
          <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-rose-600 filled">error</span>
              <p className="text-sm font-medium text-rose-700">{error}</p>
            </div>
            <button onClick={() => setError(null)} className="text-rose-600 hover:text-rose-700">
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>
        )}

        {/* Settings Form */}
        <Card className="overflow-hidden">
          <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900">프로젝트 설정</h2>
            <Badge variant="muted">{form.bundle || "미설정"}</Badge>
          </div>

          <div className="p-8 space-y-8">
            {/* Basic Settings */}
            <section>
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-6">기본 설정</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="text-sm font-semibold text-slate-700 mb-2 block">프로젝트명</label>
                  <Input
                    value={form.project || ""}
                    onChange={(e) => setForm({ ...form, project: e.target.value })}
                    placeholder="my-project"
                  />
                </div>
                <div>
                  <label className="text-sm font-semibold text-slate-700 mb-2 block">팀 템플릿</label>
                  <Input
                    value={form.bundle || ""}
                    disabled
                    className="bg-slate-50 cursor-not-allowed"
                    placeholder="팀 템플릿 페이지에서 선택"
                  />
                  <p className="text-xs text-slate-400 mt-1">팀 템플릿 목록 페이지에서 변경</p>
                </div>
              </div>
            </section>

            {/* AI Model Settings */}
            <section>
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-6">AI 모델</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="text-sm font-semibold text-slate-700 mb-2 block">기본 모델</label>
                  <Select value={form.model || "claude-sonnet-4"} onValueChange={(v) => setForm({ ...form, model: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="claude-sonnet-4">Claude Sonnet 4</SelectItem>
                      <SelectItem value="claude-opus-4">Claude Opus 4</SelectItem>
                      <SelectItem value="claude-haiku-4">Claude Haiku 4</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-semibold text-slate-700 mb-2 block">언어</label>
                  <Select value={form.locale || "ko"} onValueChange={(v) => setForm({ ...form, locale: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ko">한국어</SelectItem>
                      <SelectItem value="en">English</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </section>

            {/* Execution Settings */}
            <section>
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-6">실행 설정</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="text-sm font-semibold text-slate-700 mb-2 block">격리 방식</label>
                  <Select
                    value={form.isolation || "worktree"}
                    onValueChange={(v) => setForm({ ...form, isolation: v as "worktree" | "none" })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="worktree">Git Worktree (권장)</SelectItem>
                      <SelectItem value="none">없음</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-slate-400 mt-1">각 에이전트의 작업 공간 격리 방식</p>
                </div>
                <div>
                  <label className="text-sm font-semibold text-slate-700 mb-2 block">병합 모드</label>
                  <Select
                    value={form.merge_mode || "auto"}
                    onValueChange={(v) => setForm({ ...form, merge_mode: v as "auto" | "manual" })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="auto">자동 병합</SelectItem>
                      <SelectItem value="manual">수동 병합</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </section>

            {/* Run History Settings */}
            <section>
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-6">실행 기록</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="text-sm font-semibold text-slate-700 mb-2 block">보관 개수</label>
                  <Input
                    type="number"
                    min={1}
                    max={20}
                    value={form.runs?.retention || 5}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        runs: { ...form.runs, retention: parseInt(e.target.value) || 5 },
                      })
                    }
                  />
                </div>
                <div>
                  <label className="text-sm font-semibold text-slate-700 mb-2 block">컨텍스트 깊이</label>
                  <Input
                    type="number"
                    min={0}
                    max={5}
                    value={form.runs?.context_depth || 1}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        runs: { ...form.runs, context_depth: parseInt(e.target.value) || 1 },
                      })
                    }
                  />
                </div>
                <div className="flex items-end">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.runs?.auto_archive ?? true}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          runs: { ...form.runs, auto_archive: e.target.checked },
                        })
                      }
                      className="w-5 h-5 rounded border-slate-300 text-primary focus:ring-primary"
                    />
                    <span className="text-sm font-medium text-slate-700">자동 아카이브</span>
                  </label>
                </div>
              </div>
            </section>
          </div>

          {/* Footer */}
          <div className="px-8 py-6 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
            <div className="text-xs text-slate-400">
              <span className="material-symbols-outlined text-sm mr-1 align-middle">info</span>
              설정은 .ai-crew/config.yaml 파일에 저장됩니다
            </div>
            <div className="flex items-center gap-3">
              <Button variant="outline" onClick={handleReset}>
                초기화
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? (
                  <>
                    <span className="material-symbols-outlined animate-spin mr-1">progress_activity</span>
                    저장 중...
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined mr-1">save</span>
                    저장
                  </>
                )}
              </Button>
            </div>
          </div>
        </Card>

        {/* Footer Command Helper */}
        <footer className="mt-8 text-center">
          <p className="text-sm text-slate-400 font-medium tracking-tight">
            <span className="opacity-60">CLI에서 설정 보기:</span>
            <code className="bg-white px-2 py-0.5 rounded border border-slate-200 mx-1 text-slate-600 font-mono">
              cat .ai-crew/config.yaml
            </code>
          </p>
        </footer>
      </div>
    </div>
  );
}
