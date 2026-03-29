"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StatusBadge } from "@/components/common/StatusBadge";
import { MarkdownRenderer } from "@/components/common/MarkdownRenderer";
import { ScrollArea } from "@/components/ui/scroll-area";
import { EmptyState } from "@/components/common/EmptyState";
import type { RunManifest, NodeSummary } from "@/types";
import { FileText, Clock3, Boxes, BrainCircuit } from "lucide-react";
import { useState } from "react";

interface RunDetailProps {
  manifest: RunManifest;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  const date = new Date(dateStr);
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function NodeSummaryCard({ summary }: { summary: NodeSummary }) {
  return (
    <Card size="sm" className="h-full">
      <CardHeader className="gap-3">
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle className="text-base">{summary.nodeId}</CardTitle>
            <CardDescription className="mt-1">{summary.agent} · {summary.duration}</CardDescription>
          </div>
          <StatusBadge status={summary.status} />
        </div>
      </CardHeader>
      {(summary.filesChanged.length > 0 || summary.keyDecisions.length > 0) && (
        <CardContent className="space-y-4 pt-0">
          {summary.filesChanged.length > 0 && (
            <div className="panel-subtle px-4 py-4">
              <div className="mb-2 text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">변경된 파일</div>
              <ul className="space-y-1.5 text-sm text-foreground/80">
                {summary.filesChanged.map((file) => (
                  <li key={file} className="truncate font-mono text-[13px]">{file}</li>
                ))}
              </ul>
            </div>
          )}
          {summary.keyDecisions.length > 0 && (
            <div className="panel-subtle px-4 py-4">
              <div className="mb-2 text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">주요 결정</div>
              <ul className="list-disc space-y-1.5 pl-4 text-sm text-foreground/80">
                {summary.keyDecisions.map((decision, i) => (
                  <li key={i}>{decision}</li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}

function SnapshotDocList({ documents }: { documents: { path: string; content: string; stage: string }[] }) {
  const [selectedDoc, setSelectedDoc] = useState<string | null>(documents[0]?.path ?? null);
  const selected = documents.find((d) => d.path === selectedDoc);

  if (documents.length === 0) {
    return <EmptyState title="스냅샷 없음" description="이 런에는 AI-DLC 문서 스냅샷이 없습니다." />;
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[280px_minmax(0,1fr)] xl:items-start">
      <div className="panel-surface p-3">
        <div className="px-2 pb-3 pt-1 text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">Snapshot docs</div>
        <ul className="space-y-2">
          {documents.map((doc) => {
            const active = selectedDoc === doc.path;
            return (
              <li key={doc.path}>
                <button
                  onClick={() => setSelectedDoc(doc.path)}
                  className={`w-full rounded-2xl border px-3 py-3 text-left transition-colors ${active ? "border-primary/20 bg-primary text-primary-foreground" : "border-border/70 bg-background hover:bg-muted/35"}`}
                >
                  <div className="flex items-center gap-2 text-sm font-medium tracking-tight">
                    <FileText className="h-4 w-4" />
                    <span className="truncate">{doc.path.split("/").pop()}</span>
                  </div>
                  <div className={`mt-1 text-xs ${active ? "text-primary-foreground/70" : "text-muted-foreground"}`}>{doc.stage}</div>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
      <div className="panel-surface overflow-hidden">
        <div className="border-b border-border/70 px-5 py-4">
          <div className="text-sm font-medium tracking-tight">선택된 문서 미리보기</div>
          {selected && <div className="mt-1 text-xs uppercase tracking-[0.14em] text-muted-foreground">{selected.stage}</div>}
        </div>
        <ScrollArea className="h-[560px] px-5 py-5">
          {selected ? <MarkdownRenderer content={selected.content} /> : <p className="text-sm text-muted-foreground">문서를 선택하세요.</p>}
        </ScrollArea>
      </div>
    </div>
  );
}

export function RunDetail({ manifest }: RunDetailProps) {
  const nodeSummaries = Object.values(manifest.nodeSummaries);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="gap-5">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <div className="max-w-3xl">
              <div className="page-kicker">Run detail</div>
              <CardTitle className="mt-2 text-3xl">{manifest.intent.description}</CardTitle>
              <CardDescription className="mt-3 text-sm leading-6 font-mono">{manifest.runId}</CardDescription>
            </div>
            <StatusBadge status={manifest.state} />
          </div>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {[
            { icon: Clock3, label: "생성", value: formatDate(manifest.timeline.createdAt) },
            { icon: Clock3, label: "시작", value: formatDate(manifest.timeline.startedAt) },
            { icon: Clock3, label: "완료", value: formatDate(manifest.timeline.completedAt) },
            { icon: BrainCircuit, label: "모델", value: manifest.context.model },
            { icon: Boxes, label: "번들", value: manifest.context.bundleName },
            { icon: Boxes, label: "노드 수", value: String(manifest.context.graphNodeCount) },
            { icon: Boxes, label: "레벨 수", value: String(manifest.context.graphLevelCount) },
            { icon: BrainCircuit, label: "Locale", value: manifest.context.locale },
          ].map(({ icon: Icon, label, value }) => (
            <div key={label} className="panel-subtle px-4 py-4">
              <div className="flex items-center gap-2 text-xs uppercase tracking-[0.14em] text-muted-foreground">
                <Icon className="h-3.5 w-3.5" />
                <span>{label}</span>
              </div>
              <div className="mt-2 text-sm font-medium tracking-tight text-foreground">{value}</div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Tabs defaultValue="progress">
        <TabsList>
          <TabsTrigger value="progress">개발 진행</TabsTrigger>
          <TabsTrigger value="snapshot">설계 스냅샷</TabsTrigger>
        </TabsList>
        <TabsContent value="progress" className="mt-2">
          {nodeSummaries.length > 0 ? (
            <div className="grid gap-4 xl:grid-cols-2">
              {nodeSummaries.map((summary) => (
                <NodeSummaryCard key={summary.nodeId} summary={summary} />
              ))}
            </div>
          ) : (
            <EmptyState title="노드 요약 없음" description="이 런에 대한 노드 요약이 없습니다." />
          )}
        </TabsContent>
        <TabsContent value="snapshot" className="mt-2">
          <SnapshotDocList documents={manifest.aidlcSnapshot?.documents ?? []} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
