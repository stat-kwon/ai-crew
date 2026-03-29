"use client";

import { useState } from "react";
import useSWR from "swr";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface AidlcStage {
  name: string;
  status: "pending" | "active" | "complete";
  tasks: { text: string; done: boolean }[];
}

interface DocGroupFile {
  name: string;
  label: string;
  path: string;
}

interface DocGroup {
  folder: string;
  label: string;
  sortOrder: number;
  files: DocGroupFile[];
}

interface DocsResponse {
  groups: DocGroup[];
}

const fetcher = (url: string) => fetch(url).then((res) => (res.ok ? res.json() : null));

const stageLabels: Record<string, string> = {
  "Workspace Detection": "작업공간 감지",
  "Requirements Analysis": "요구사항 분석",
  Requirements: "요구사항 분석",
  "User Stories": "사용자 시나리오",
  "Workflow Planning": "작업 계획 수립",
  "Architecture Design": "아키텍처 설계",
  "Task Decomposition": "작업 분해",
};

const folderIcons: Record<string, string> = {
  "inception/requirements": "article",
  "inception/user-stories": "account_tree",
  "inception/plans": "assignment",
  "inception/application-design": "architecture",
  "construction": "build",
  "operations": "deployed_code",
};

function getFolderIcon(folder: string): string {
  return folderIcons[folder] || "folder";
}

export default function DocsPage() {
  const { data: aidlcData } = useSWR<{ stages: AidlcStage[]; raw?: string }>("/api/aidlc/state", fetcher, {
    refreshInterval: 5000,
  });
  const { data: docsData } = useSWR<DocsResponse>("/api/aidlc/docs", fetcher);

  const [selectedDoc, setSelectedDoc] = useState<string | null>(null);
  const [docContent, setDocContent] = useState<string>("");
  const [isLoadingDoc, setIsLoadingDoc] = useState(false);

  const stages = aidlcData?.stages || [];
  const groups = docsData?.groups || [];
  const totalFiles = groups.reduce((sum, g) => sum + g.files.length, 0);

  const completedCount = stages.filter((s) => s.status === "complete").length;
  const progressPercent = stages.length > 0 ? Math.round((completedCount / stages.length) * 100) : 0;

  const handleDocSelect = async (docPath: string) => {
    setSelectedDoc(docPath);
    setIsLoadingDoc(true);
    try {
      const res = await fetch(`/api/aidlc/docs?path=${encodeURIComponent(docPath)}`);
      if (res.ok) {
        const data = await res.json();
        setDocContent(data.content || "");
      }
    } catch {
      setDocContent("문서를 불러올 수 없습니다.");
    } finally {
      setIsLoadingDoc(false);
    }
  };

  return (
    <div className="mx-auto max-w-screen-2xl space-y-8">
      {/* Page Header */}
      <div className="flex items-baseline justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight font-[var(--font-headline)]">
            설계 문서
          </h2>
          <Badge variant="default">인셉션</Badge>
        </div>
      </div>

      {/* Horizontal Stepper Timeline */}
      <Card className="p-8">
        <div className="relative flex items-center justify-between">
          {/* Background Progress Line */}
          <div className="absolute top-4 left-0 w-full h-1 bg-slate-100 z-0 rounded-full" />
          <div
            className="absolute top-4 left-0 h-1 bg-primary z-0 rounded-full transition-all duration-1000"
            style={{ width: `${progressPercent}%` }}
          />

          {/* Steps */}
          {stages.length > 0 ? (
            stages.map((stage, idx) => {
              const isCompleted = stage.status === "complete";
              const isActive = stage.status === "active";
              const label = stageLabels[stage.name] || stage.name;

              return (
                <div key={idx} className="relative z-10 flex flex-col items-center gap-2 group">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center ring-4 ring-white transition-all ${
                      isCompleted
                        ? "bg-primary text-white"
                        : isActive
                          ? "bg-white border-4 border-primary animate-pulse"
                          : "bg-white border-4 border-slate-100"
                    }`}
                  >
                    {isCompleted ? (
                      <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'wght' 700" }}>
                        check
                      </span>
                    ) : (
                      <div className={`w-2 h-2 rounded-full ${isActive ? "bg-primary" : "bg-slate-200"}`} />
                    )}
                  </div>
                  <div className="text-center">
                    <span className={`text-xs font-bold ${isActive ? "text-primary" : "text-slate-900"}`}>
                      {label}
                    </span>
                    {isActive && (
                      <span className="text-[9px] font-medium text-primary/60 bg-indigo-50 px-1.5 py-0.5 rounded mt-1 block">
                        현재 진행 중
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="w-full text-center py-8 text-slate-400">
              <span className="material-symbols-outlined text-4xl mb-2">hourglass_empty</span>
              <p className="text-sm">설계 단계가 시작되지 않았습니다</p>
              <p className="text-xs mt-1">CLI에서 /crew:elaborate를 실행하세요</p>
            </div>
          )}
        </div>
      </Card>

      {/* Two Column Layout: Folder Tree (4 cols) + Markdown Viewer (8 cols) */}
      <div className="grid grid-cols-12 gap-6 items-start">
        {/* Left Column: Document Tree */}
        <div className="col-span-12 lg:col-span-4">
          <Card className="overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-50 flex items-center justify-between">
              <h3 className="font-bold text-slate-900 flex items-center gap-2">
                <span className="material-symbols-outlined text-indigo-500">description</span>
                생성된 문서
              </h3>
              <span className="text-xs font-medium text-slate-400 uppercase tracking-tighter">
                {totalFiles}개 문서
              </span>
            </div>
            <div className="p-4 space-y-4 max-h-[calc(100vh-320px)] overflow-y-auto">
              {groups.length === 0 ? (
                <div className="text-center py-8 text-slate-400" data-testid="empty-state">
                  <span className="material-symbols-outlined text-4xl mb-2">folder_off</span>
                  <p className="text-sm">아직 생성된 문서가 없습니다</p>
                </div>
              ) : (
                groups.map((group) => (
                  <div key={group.folder} className="space-y-2" data-testid={`group-${group.folder.replace(/\//g, "-")}`}>
                    {/* Group Header */}
                    <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                      <div className="w-7 h-7 rounded-md bg-indigo-50 flex items-center justify-center">
                        <span className="material-symbols-outlined text-indigo-500 text-sm">
                          {getFolderIcon(group.folder)}
                        </span>
                      </div>
                      <h4 className="text-sm font-bold text-slate-700" data-testid={`group-label-${group.folder.replace(/\//g, "-")}`}>
                        {group.label}
                      </h4>
                      <span className="text-[10px] text-slate-400 ml-auto">{group.files.length}개</span>
                    </div>

                    {/* Files in this group */}
                    {group.files.length === 0 ? (
                      <p className="text-xs text-slate-400 pl-9">파일 없음</p>
                    ) : (
                      <div className="space-y-1">
                        {group.files.map((file) => {
                          const isSelected = selectedDoc === file.path;

                          return (
                            <button
                              key={file.path}
                              type="button"
                              onClick={() => handleDocSelect(file.path)}
                              data-testid={`file-item-${file.name}`}
                              className={`w-full text-left flex items-center gap-3 p-2.5 rounded-lg border cursor-pointer transition-colors ${
                                isSelected
                                  ? "bg-indigo-50/50 border-indigo-200 ring-2 ring-indigo-500/10"
                                  : "bg-slate-50/30 border-slate-100 hover:border-indigo-200"
                              }`}
                            >
                              <div
                                className={`w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0 ${
                                  isSelected ? "bg-indigo-100 text-indigo-600" : "bg-indigo-50 text-indigo-600"
                                }`}
                              >
                                <span className="material-symbols-outlined text-sm">description</span>
                              </div>
                              <div className="min-w-0 flex-1">
                                <h5 className="text-sm font-semibold text-slate-900 truncate">
                                  {file.label}
                                </h5>
                                <span className="text-[10px] text-slate-400">{file.name}</span>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>

        {/* Right Column: Document Viewer */}
        <div className="col-span-12 lg:col-span-8">
          <Card className="overflow-hidden flex flex-col h-[calc(100vh-320px)] min-h-[400px]">
            <div className="px-6 py-4 border-b border-slate-50 bg-slate-50/50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-slate-400 text-lg">markdown</span>
                <span className="text-sm font-semibold text-slate-900">
                  {selectedDoc ? selectedDoc.split("/").pop() : "문서를 선택하세요"}
                </span>
              </div>
            </div>
            <div className="p-6 overflow-y-auto flex-1">
              {isLoadingDoc ? (
                <div className="flex items-center justify-center h-full text-slate-400">
                  <span className="material-symbols-outlined animate-spin mr-2">progress_activity</span>
                  로딩 중...
                </div>
              ) : selectedDoc ? (
                <div className="markdown-body prose prose-slate max-w-none">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{docContent}</ReactMarkdown>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-slate-400">
                  <span className="material-symbols-outlined text-4xl mb-2">article</span>
                  <p className="text-sm">좌측에서 문서를 선택하세요</p>
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>

      {/* Bottom Banner — Simplified CLI guidance */}
      <div className="bg-indigo-50/80 border border-indigo-100 rounded-xl p-4 flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm">
          <span className="material-symbols-outlined text-indigo-600 filled">lightbulb</span>
        </div>
        <div>
          <span className="text-xs font-bold text-indigo-700 block">설계 초안 작성</span>
          <p className="text-sm text-indigo-900">
            CLI에서 <code className="font-mono font-bold bg-indigo-100 px-1.5 py-0.5 rounded">/crew:elaborate</code>를 실행하세요
          </p>
        </div>
      </div>
    </div>
  );
}
