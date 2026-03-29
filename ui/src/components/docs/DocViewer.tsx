"use client";

import { MarkdownRenderer } from "@/components/common/MarkdownRenderer";
import { ScrollArea } from "@/components/ui/scroll-area";
import { EmptyState } from "@/components/common/EmptyState";
import { LoadingState } from "@/components/common/LoadingState";
import { ErrorState } from "@/components/common/ErrorState";
import { FileText } from "lucide-react";

interface DocViewerProps {
  path: string | null;
  content: string | null;
  isLoading?: boolean;
  error?: Error | null;
}

export function DocViewer({ path, content, isLoading, error }: DocViewerProps) {
  if (!path) {
    return <EmptyState title="문서 선택" description="왼쪽 파일 트리에서 문서를 선택하면 최신 aidlc-docs 내용을 여기서 읽을 수 있습니다." icon={<FileText className="h-7 w-7" />} />;
  }

  if (isLoading) return <LoadingState />;
  if (error) return <ErrorState message={error.message} />;
  if (!content) return <EmptyState title="내용 없음" description="문서 내용을 불러올 수 없습니다." />;

  return (
    <div className="panel-surface flex h-full flex-col overflow-hidden">
      <div className="border-b border-border/70 px-5 py-4">
        <div className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">Document path</div>
        <div className="mt-2 break-all font-mono text-sm text-foreground/80">{path}</div>
      </div>
      <ScrollArea className="flex-1 px-6 py-6">
        <MarkdownRenderer content={content} />
      </ScrollArea>
    </div>
  );
}
