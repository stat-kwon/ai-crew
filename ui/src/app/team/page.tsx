"use client";

import { useCallback, useEffect, useState } from "react";
import useSWR from "swr";
import {
  ReactFlow,
  ReactFlowProvider,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  Node,
  Edge,
  Position,
  MarkerType,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import dagre from "dagre";
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

interface GraphNode {
  id: string;
  type: "worker" | "router" | "aggregator";
  agent: string;
  skills: string[];
  hooks: string[];
  depends_on: string[];
  wait?: "all" | "any";
  config: {
    isolation?: "worktree" | "none";
    model?: string;
  };
}

interface GraphData {
  nodes: GraphNode[];
}

const fetcher = (url: string) => fetch(url).then((res) => (res.ok ? res.json() : null));
const graphFetcher = (url: string) =>
  fetch(url).then((res) => (res.ok ? res.json().then((d) => d.graph ?? d) : null));

const nodeTypeColors = {
  worker: { border: "#4648d4", bg: "#eef2ff", label: "작업자" },
  aggregator: { border: "#006c49", bg: "#ecfdf5", label: "취합자" },
  router: { border: "#f59e0b", bg: "#fffbeb", label: "분배자" },
};

const nodeTypeIcons = {
  worker: "person",
  aggregator: "verified_user",
  router: "alt_route",
};

function layoutGraph(nodes: GraphNode[]): { nodes: Node[]; edges: Edge[] } {
  const g = new dagre.graphlib.Graph();
  g.setGraph({ rankdir: "TB", nodesep: 80, ranksep: 100 });
  g.setDefaultEdgeLabel(() => ({}));

  nodes.forEach((node) => {
    g.setNode(node.id, { width: 220, height: 100 });
  });

  nodes.forEach((node) => {
    node.depends_on.forEach((dep) => {
      g.setEdge(dep, node.id);
    });
  });

  dagre.layout(g);

  const flowNodes: Node[] = nodes.map((node) => {
    const pos = g.node(node.id);
    const colors = nodeTypeColors[node.type];
    return {
      id: node.id,
      position: { x: pos.x - 110, y: pos.y - 50 },
      data: { ...node, colors },
      type: "customNode",
      sourcePosition: Position.Bottom,
      targetPosition: Position.Top,
    };
  });

  const flowEdges: Edge[] = [];
  nodes.forEach((node) => {
    node.depends_on.forEach((dep) => {
      flowEdges.push({
        id: `${dep}-${node.id}`,
        source: dep,
        target: node.id,
        style: { stroke: "#94a3b8", strokeWidth: 2, strokeDasharray: "4" },
        markerEnd: { type: MarkerType.ArrowClosed, color: "#94a3b8" },
      });
    });
  });

  return { nodes: flowNodes, edges: flowEdges };
}

function CustomNode({ data, selected }: { data: GraphNode & { colors: typeof nodeTypeColors.worker }; selected: boolean }) {
  const icon = nodeTypeIcons[data.type];
  return (
    <div
      className={`w-56 bg-white p-4 rounded-xl shadow-md border-l-4 transition-all ${
        selected ? "ring-2 ring-primary ring-offset-4 ring-opacity-20" : ""
      }`}
      style={{ borderLeftColor: data.colors.border }}
    >
      <div className="flex justify-between items-start mb-2">
        <Badge
          size="sm"
          className="text-[10px]"
          style={{ backgroundColor: data.colors.bg, color: data.colors.border }}
        >
          {data.colors.label}
        </Badge>
        <span className="material-symbols-outlined text-slate-300 text-lg">{icon}</span>
      </div>
      <h3 className="font-bold text-slate-900">[{data.agent}]</h3>
      <p className="text-[11px] text-slate-500 mt-1 line-clamp-1">
        {data.skills?.join(", ") || "스킬 없음"}
      </p>
    </div>
  );
}

const nodeTypes = { customNode: CustomNode };

function TeamEditorContent() {
  const { data: graphData, mutate } = useSWR<GraphData>("/api/graph", graphFetcher);
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [editForm, setEditForm] = useState<Partial<GraphNode>>({});

  useEffect(() => {
    if (graphData?.nodes) {
      const layout = layoutGraph(graphData.nodes);
      setNodes(layout.nodes);
      setEdges(layout.edges);
    }
  }, [graphData, setNodes, setEdges]);

  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      const graphNode = graphData?.nodes.find((n) => n.id === node.id);
      if (graphNode) {
        setSelectedNode(graphNode);
        setEditForm({ ...graphNode });
      }
    },
    [graphData]
  );

  const handleSave = async () => {
    if (!graphData || !selectedNode || !editForm.id) return;

    const updatedNodes = graphData.nodes.map((n) =>
      n.id === selectedNode.id ? { ...n, ...editForm } : n
    );

    try {
      const res = await fetch("/api/graph", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nodes: updatedNodes }),
      });
      if (res.ok) {
        mutate();
        setSelectedNode(null);
      }
    } catch {
      // save error handled silently
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-baseline justify-between">
        <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight font-[var(--font-headline)]">
          에이전트 팀 편집
        </h2>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm">
            <span className="material-symbols-outlined text-lg mr-1">add</span>
            역할 추가
          </Button>
          <Button size="sm" onClick={handleSave}>
            <span className="material-symbols-outlined text-lg mr-1">save</span>
            저장
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-8 h-[calc(100vh-200px)]">
        {/* DAG Canvas */}
        <section className="col-span-8">
          <Card className="h-full overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-50 flex justify-between items-center">
              <h3 className="font-bold text-slate-800">작업 흐름 캔버스</h3>
              <span className="flex items-center gap-1 text-xs text-slate-400 font-medium bg-slate-50 px-3 py-1 rounded-full">
                <span className="material-symbols-outlined text-sm">grid_on</span>
                그리드 활성
              </span>
            </div>
            <div className="h-[calc(100%-60px)]">
              {graphData?.nodes && graphData.nodes.length > 0 ? (
                <ReactFlow
                  nodes={nodes}
                  edges={edges}
                  onNodesChange={onNodesChange}
                  onEdgesChange={onEdgesChange}
                  onNodeClick={onNodeClick}
                  nodeTypes={nodeTypes}
                  fitView
                  className="dot-grid"
                >
                  <Controls />
                  <Background gap={24} size={1} color="#cbd5e1" />
                </ReactFlow>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-slate-400">
                  <span className="material-symbols-outlined text-6xl mb-4">account_tree</span>
                  <p className="text-lg font-medium">그래프가 없습니다</p>
                  <p className="text-sm mt-1">팀 템플릿을 선택하여 에이전트 팀 구성을 시작하세요</p>
                </div>
              )}
            </div>
          </Card>
        </section>

        {/* Role Editor */}
        <section className="col-span-4">
          <Card className="h-full p-6 flex flex-col gap-6 overflow-y-auto">
            {selectedNode ? (
              <>
                <div>
                  <h3 className="text-xl font-bold text-slate-900">역할 편집 - {selectedNode.agent}</h3>
                  <p className="text-sm text-slate-400 mt-1 font-medium">에이전트 속성 및 워크플로우 제어</p>
                </div>

                <div className="space-y-5 flex-1">
                  {/* ID */}
                  <div>
                    <label className="text-[11px] font-bold text-slate-400 tracking-wider mb-1.5 block">ID</label>
                    <Input disabled value={editForm.id || ""} className="bg-slate-50 cursor-not-allowed" />
                  </div>

                  {/* Agent Name */}
                  <div>
                    <label className="text-[11px] font-bold text-slate-400 tracking-wider mb-1.5 block">역할명</label>
                    <Input
                      value={editForm.agent || ""}
                      onChange={(e) => setEditForm({ ...editForm, agent: e.target.value })}
                    />
                  </div>

                  {/* Type & Wait */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[11px] font-bold text-slate-400 tracking-wider mb-1.5 block">타입</label>
                      <Select
                        value={editForm.type}
                        onValueChange={(value) => setEditForm({ ...editForm, type: value as GraphNode["type"] })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="worker">작업자</SelectItem>
                          <SelectItem value="aggregator">취합자</SelectItem>
                          <SelectItem value="router">분배자</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {editForm.type === "aggregator" && (
                      <div>
                        <label className="text-[11px] font-bold text-slate-400 tracking-wider mb-1.5 block">
                          대기 방식
                        </label>
                        <Select
                          value={editForm.wait || "all"}
                          onValueChange={(value) => setEditForm({ ...editForm, wait: value as "all" | "any" })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">전체 대기</SelectItem>
                            <SelectItem value="any">부분 대기</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>

                  {/* Skills */}
                  <div>
                    <label className="text-[11px] font-bold text-slate-400 tracking-wider mb-2 block">
                      스킬 (Skills)
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {editForm.skills?.map((skill, idx) => (
                        <span
                          key={idx}
                          className="bg-indigo-50 text-indigo-600 px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5"
                        >
                          <span className="material-symbols-outlined text-[14px]">code</span>
                          {skill}
                        </span>
                      ))}
                      <button className="bg-slate-50 text-slate-400 w-8 h-7 rounded-full flex items-center justify-center hover:bg-slate-100 transition-colors">
                        <span className="material-symbols-outlined text-lg">add</span>
                      </button>
                    </div>
                  </div>

                  {/* Dependencies */}
                  <div>
                    <label className="text-[11px] font-bold text-slate-400 tracking-wider mb-3 block">
                      입력 의존성 (Dependencies)
                    </label>
                    <div className="space-y-2">
                      {editForm.depends_on?.map((dep) => (
                        <div key={dep} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                          <span className="material-symbols-outlined text-slate-400">link</span>
                          <div className="flex-1">
                            <p className="text-xs font-bold text-slate-700">{dep}</p>
                          </div>
                          <button className="material-symbols-outlined text-slate-300 hover:text-rose-500 transition-colors">
                            close
                          </button>
                        </div>
                      ))}
                      {(!editForm.depends_on || editForm.depends_on.length === 0) && (
                        <p className="text-xs text-slate-400">의존성 없음 (첫 번째 단계)</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Footer Buttons */}
                <div className="pt-6 border-t border-slate-100 grid grid-cols-2 gap-4">
                  <Button variant="outline" onClick={() => setSelectedNode(null)}>
                    <span className="material-symbols-outlined text-lg mr-1">close</span>
                    취소
                  </Button>
                  <Button onClick={handleSave}>
                    <span className="material-symbols-outlined text-lg mr-1">save</span>
                    저장
                  </Button>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-slate-400">
                <span className="material-symbols-outlined text-6xl mb-4">touch_app</span>
                <p className="text-lg font-medium">노드를 선택하세요</p>
                <p className="text-sm mt-1">캔버스에서 노드를 클릭하면 편집할 수 있습니다</p>
              </div>
            )}
          </Card>
        </section>
      </div>
    </div>
  );
}

export default function TeamPage() {
  return (
    <ReactFlowProvider>
      <TeamEditorContent />
    </ReactFlowProvider>
  );
}
