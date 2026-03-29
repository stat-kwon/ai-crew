"use client";

import { useState } from "react";
import useSWR from "swr";
import { fetchAidlcDocs, fetchAidlcDocContent } from "@/lib/api";
import { FileTree } from "@/components/docs/FileTree";
import { DocViewer } from "@/components/docs/DocViewer";
import { LoadingState } from "@/components/common/LoadingState";
import { ErrorState } from "@/components/common/ErrorState";
import { EmptyState } from "@/components/common/EmptyState";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FileText } from "lucide-react";

export default function DocsPage() {
  const [selectedPath, setSelectedPath] = useState<string | null>(null);

  const { data: tree, error: treeError, isLoading: treeLoading } = useSWR("aidlc-docs", fetchAidlcDocs);
  const { data: docData, error: docError, isLoading: docLoading } = useSWR(selectedPath ? `doc-${selectedPath}` : null, () => (selectedPath ? fetchAidlcDocContent(selectedPath) : null));

  if (treeError) {
    return (
      <div className="page-shell">
        <ErrorState message={treeError.message} />
      </div>
    );
  }

  if (treeLoading) {
    return (
      <div className="page-shell">
        <LoadingState />
      </div>
    );
  }

  const nodes = tree ?? [];

  if (nodes.length === 0) {
    return (
      <div className="page-shell">
        <header className="page-header">
          <div className="page-kicker">Latest docs</div>
          <h1 className="page-title">설계 문서</h1>
        </header>
        <EmptyState title="문서 없음" description="aidlc-docs 디렉토리가 없거나 비어 있습니다." icon={<FileText className="h-7 w-7" />} />
      </div>
    );
  }

  return (
    <div className="page-shell max-w-[1600px]">
      <header className="page-header">
        <div className="page-kicker">Latest docs</div>
        <h1 className="page-title">설계 문서</h1>
        <p className="page-description">좌측에는 최신 aidlc-docs 파일 트리를, 우측에는 선택한 문서의 읽기 전용 뷰어를 배치해 탐색과 읽기 흐름을 분리했습니다.</p>
      </header>

      <div className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
        <aside className="panel-surface overflow-hidden">
          <div className="border-b border-border/70 px-5 py-5">
            <div className="text-lg font-semibold tracking-tight">파일 트리</div>
            <p className="mt-1 text-sm text-muted-foreground">aidlc-docs</p>
          </div>
          <ScrollArea className="h-[calc(100vh-280px)]">
            <FileTree nodes={nodes} selectedPath={selectedPath} onSelectFile={setSelectedPath} />
          </ScrollArea>
        </aside>

        <section className="min-w-0 overflow-hidden">
          <DocViewer path={selectedPath} content={docData?.content ?? null} isLoading={docLoading} error={docError} />
        </section>
      </div>
    </div>
  );
}
