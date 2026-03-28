"use client";

import { useState } from "react";
import useSWR from "swr";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

interface NodeState {
  status: "pending" | "running" | "completed" | "failed" | "skipped";
  startedAt: string | null;
  completedAt: string | null;
}

interface GraphNode {
  id: string;
  type: "worker" | "router" | "aggregator";
  agent: string;
  depends_on: string[];
}

interface StateData {
  bundleName: string;
  runId?: string;
  nodes: Record<string, NodeState>;
}

interface GraphData {
  nodes: GraphNode[];
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

const fetcher = (url: string) => fetch(url).then((res) => (res.ok ? res.json() : null));
const graphFetcher = (url: string) =>
  fetch(url).then((res) => (res.ok ? res.json().then((d) => d.graph ?? d) : null));

type KanbanColumn = "pending" | "running" | "completed" | "failed";

const columnConfig: Record<KanbanColumn, { label: string; color: string; bgColor: string }> = {
  pending: { label: "대기", color: "#94a3b8", bgColor: "bg-slate-400" },
  running: { label: "진행 중", color: "#4648d4", bgColor: "bg-primary" },
  completed: { label: "완료", color: "#10b981", bgColor: "bg-emerald-500" },
  failed: { label: "실패", color: "#f43f5e", bgColor: "bg-rose-500" },
};

export default function DevelopPage() {
  const { data: state } = useSWR<StateData>("/api/state", fetcher, { refreshInterval: 3000 });
  const { data: graph } = useSWR<GraphData>("/api/graph", graphFetcher);
  const { data: runsData } = useSWR<{ runs: RunEntry[] }>("/api/runs", fetcher);

  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [scratchpadContent, setScratchpadContent] = useState<string>("");
  const [isLoadingScratchpad, setIsLoadingScratchpad] = useState(false);

  const handleNodeClick = async (nodeId: string) => {
    setSelectedNode(nodeId);
    setIsLoadingScratchpad(true);
    try {
      const res = await fetch(`/api/scratchpad/${nodeId}`);
      if (res.ok) {
        const data = await res.json();
        setScratchpadContent(data.content || "");
      } else {
        setScratchpadContent("작업 메모를 찾을 수 없습니다.");
      }
    } catch {
      setScratchpadContent("작업 메모를 불러올 수 없습니다.");
    } finally {
      setIsLoadingScratchpad(false);
    }
  };

  const columns: Record<KanbanColumn, { nodeId: string; agent: string; nodeState: NodeState }[]> = {
    pending: [],
    running: [],
    completed: [],
    failed: [],
  };

  if (state?.nodes && graph?.nodes) {
    Object.entries(state.nodes).forEach(([nodeId, nodeState]) => {
      const graphNode = graph.nodes.find((n) => n.id === nodeId);
      if (graphNode) {
        const status = nodeState.status as KanbanColumn;
        if (columns[status]) {
          columns[status].push({ nodeId, agent: graphNode.agent, nodeState });
        }
      }
    });
  }

  const formatDuration = (startedAt: string | null, completedAt: string | null): string => {
    if (!startedAt) return "-";
    const start = new Date(startedAt).getTime();
    const end = completedAt ? new Date(completedAt).getTime() : Date.now();
    const seconds = Math.abs(Math.floor((end - start) / 1000));
    if (seconds < 60) return `${seconds}초`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}분 ${remainingSeconds}초`;
  };

  const runs = runsData?.runs || [];
  const totalElapsed = state?.nodes
    ? Object.values(state.nodes).reduce((acc, n) => {
        if (n.startedAt) {
          const start = new Date(n.startedAt).getTime();
          const end = n.completedAt ? new Date(n.completedAt).getTime() : Date.now();
          return acc + (end - start);
        }
        return acc;
      }, 0)
    : 0;
  const totalElapsedAbs = Math.abs(totalElapsed);
  const elapsedMinutes = Math.floor(totalElapsedAbs / 60000);
  const elapsedSeconds = Math.floor((totalElapsedAbs % 60000) / 1000);

  return (
    <div className="space-y-6">
      {/* Page Header with Tabs */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-6">
          <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight font-[var(--font-headline)]">
            개발 진행
          </h2>
        </div>
        <div className="flex items-center gap-4">
          {state?.runId && (
            <Badge variant="default" size="lg">
              <span className="material-symbols-outlined text-sm mr-1">history</span>
              {state.runId}
            </Badge>
          )}
          <Badge variant="muted" size="lg">
            <span className="material-symbols-outlined text-sm mr-1">timer</span>
            {elapsedMinutes}분 {elapsedSeconds}초 경과
          </Badge>
        </div>
      </div>

      <Tabs defaultValue="kanban">
        <TabsList>
          <TabsTrigger value="kanban">칸반 보드</TabsTrigger>
          <TabsTrigger value="history">실행 기록</TabsTrigger>
        </TabsList>

        <TabsContent value="kanban">
          {/* Kanban Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-start h-[calc(100vh-260px)]">
            {(Object.keys(columns) as KanbanColumn[]).map((col) => {
              const config = columnConfig[col];
              const items = columns[col];

              return (
                <div key={col} className="flex flex-col h-full">
                  <div className="flex items-center justify-between mb-4 px-2">
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${config.bgColor}`} />
                      <h3
                        className="font-bold text-sm"
                        style={{ color: col === "pending" ? "#64748b" : config.color }}
                      >
                        {config.label}
                      </h3>
                      <span className="text-xs font-medium text-slate-400 ml-1">{items.length}</span>
                    </div>
                    <button className="text-slate-400 hover:text-slate-600 transition-colors">
                      <span className="material-symbols-outlined text-lg">more_horiz</span>
                    </button>
                  </div>

                  <div className="bg-slate-50 p-3 rounded-xl flex-1 overflow-y-auto space-y-3">
                    {items.length === 0 ? (
                      <div className="text-center py-8 text-slate-400">
                        <span className="material-symbols-outlined text-2xl">inbox</span>
                      </div>
                    ) : (
                      items.map(({ nodeId, agent, nodeState }) => (
                        <div
                          key={nodeId}
                          onClick={() => col === "completed" && handleNodeClick(nodeId)}
                          className={`bg-white rounded-xl p-4 border-l-4 border border-slate-100 shadow-sm transition-all ${
                            col === "completed" ? "cursor-pointer hover:shadow-md" : ""
                          }`}
                          style={{ borderLeftColor: config.color }}
                        >
                          <div className="flex justify-between items-start mb-3">
                            <Badge
                              size="sm"
                              className="text-[10px]"
                              variant={
                                col === "running"
                                  ? "running"
                                  : col === "completed"
                                    ? "completed"
                                    : col === "failed"
                                      ? "failed"
                                      : "pending"
                              }
                            >
                              {col === "running"
                                ? "진행 중"
                                : col === "completed"
                                  ? "완료"
                                  : col === "failed"
                                    ? "실패"
                                    : "대기"}
                            </Badge>
                            {col === "running" && (
                              <div className="flex items-center gap-1 text-[11px] font-bold text-primary">
                                <span className="material-symbols-outlined text-xs">schedule</span>
                                {formatDuration(nodeState.startedAt, null)}
                              </div>
                            )}
                            {col === "completed" && (
                              <span className="text-[11px] font-bold text-slate-400">
                                {formatDuration(nodeState.startedAt, nodeState.completedAt)}
                              </span>
                            )}
                            {col === "failed" && (
                              <span className="material-symbols-outlined text-rose-400 text-sm">error</span>
                            )}
                          </div>

                          <div className="mb-2">
                            <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wide mb-0.5">
                              에이전트
                            </p>
                            <h4 className="font-bold text-slate-900">{agent}</h4>
                          </div>

                          {col === "running" && (
                            <>
                              <div className="flex items-center gap-3 mt-2">
                                <div className="flex-1 bg-slate-100 h-1.5 rounded-full overflow-hidden">
                                  <div className="bg-primary w-2/3 h-full rounded-full animate-pulse" />
                                </div>
                              </div>
                              <p className="text-[11px] font-medium text-slate-500 mt-3 flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                                작업 중...
                              </p>
                            </>
                          )}

                          {col === "completed" && (
                            <div className="bg-slate-50 rounded-lg p-2 mt-2 space-y-1">
                              <p className="text-[11px] font-bold text-indigo-600 flex items-center gap-1">
                                <span className="material-symbols-outlined text-xs">description</span>
                                작업 결과 보기
                              </p>
                            </div>
                          )}

                          {col === "failed" && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="w-full mt-2 text-xs border-rose-200 text-rose-600 hover:bg-rose-50"
                            >
                              <span className="material-symbols-outlined text-sm mr-1">refresh</span>
                              재시도
                            </Button>
                          )}

                          {col === "pending" && (
                            <div className="pt-3 border-t border-slate-100 flex items-center gap-2 text-[10px] text-slate-500">
                              <span className="material-symbols-outlined text-xs">link</span>
                              선행 노드 대기 중
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="history">
          <Card className="p-6">
            <h3 className="text-lg font-bold text-slate-900 mb-6">실행 기록</h3>
            {runs.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                <span className="material-symbols-outlined text-4xl mb-2">history</span>
                <p className="text-sm">실행 기록이 없습니다</p>
              </div>
            ) : (
              <div className="space-y-3">
                {runs.map((run) => (
                  <div
                    key={run.runId}
                    className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100 hover:border-primary/20 transition-all"
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          run.state === "running"
                            ? "bg-primary/10"
                            : run.state === "failed"
                              ? "bg-rose-50"
                              : "bg-emerald-50"
                        }`}
                      >
                        <div
                          className={`w-3 h-3 rounded-full ${
                            run.state === "running"
                              ? "bg-primary animate-pulse"
                              : run.state === "failed"
                                ? "bg-rose-500"
                                : "bg-emerald-500"
                          }`}
                        />
                      </div>
                      <div>
                        <p className="font-bold text-slate-900">
                          {run.intentDescription || run.runId}
                        </p>
                        {run.intentDescription && (
                          <p className="text-[10px] text-slate-400 mt-0.5">{run.runId}</p>
                        )}
                        <p className="text-xs text-slate-500">
                          {new Date(run.createdAt).toLocaleString("ko-KR")}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <Badge
                        variant={
                          run.state === "running"
                            ? "running"
                            : run.state === "failed"
                              ? "failed"
                              : "completed"
                        }
                      >
                        {run.state === "running" ? "진행 중" : run.state === "failed" ? "실패" : "완료"}
                      </Badge>
                      <span className="text-sm text-slate-500">
                        {run.nodesCompleted}/{run.nodesTotal} 노드
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </TabsContent>
      </Tabs>

      {/* Scratchpad Modal */}
      {selectedNode && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setSelectedNode(null)}>
          <Card className="w-full max-w-2xl max-h-[80vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-slate-900">작업 메모 - {selectedNode}</h3>
              <button onClick={() => setSelectedNode(null)} className="text-slate-400 hover:text-slate-600">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              {isLoadingScratchpad ? (
                <div className="flex items-center justify-center py-8 text-slate-400">
                  <span className="material-symbols-outlined animate-spin mr-2">progress_activity</span>
                  로딩 중...
                </div>
              ) : (
                <div className="markdown-body prose prose-slate max-w-none">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{scratchpadContent}</ReactMarkdown>
                </div>
              )}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
