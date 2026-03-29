"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/common/StatusBadge";
import { MarkdownRenderer } from "@/components/common/MarkdownRenderer";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { GraphState, GraphDefinition, GraphNode } from "@/types";
import { ChevronDown, ChevronRight, User, Workflow } from "lucide-react";
import { cn } from "@/lib/utils";

interface NodeTimelineProps {
  state: GraphState;
  graph: GraphDefinition;
  scratchpads: Record<string, string>;
}

interface NodeLevel {
  level: number;
  nodes: GraphNode[];
}

function computeLevels(graph: GraphDefinition): NodeLevel[] {
  const nodes = graph.nodes;
  const levels: Map<string, number> = new Map();
  const inDegree: Map<string, number> = new Map();

  for (const node of nodes) {
    inDegree.set(node.id, node.depends_on.length);
    if (node.depends_on.length === 0) levels.set(node.id, 0);
  }

  const queue = nodes.filter((n) => n.depends_on.length === 0).map((n) => n.id);
  while (queue.length > 0) {
    const nodeId = queue.shift()!;
    const nodeLevel = levels.get(nodeId) ?? 0;

    for (const node of nodes) {
      if (node.depends_on.includes(nodeId)) {
        const newLevel = Math.max(levels.get(node.id) ?? 0, nodeLevel + 1);
        levels.set(node.id, newLevel);
        const remaining = (inDegree.get(node.id) ?? 0) - 1;
        inDegree.set(node.id, remaining);
        if (remaining === 0) queue.push(node.id);
      }
    }
  }

  const levelGroups: Map<number, GraphNode[]> = new Map();
  for (const node of nodes) {
    const level = levels.get(node.id) ?? 0;
    if (!levelGroups.has(level)) levelGroups.set(level, []);
    levelGroups.get(level)!.push(node);
  }

  return Array.from(levelGroups.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([level, nodes]) => ({ level, nodes }));
}

function NodeCard({
  node,
  state,
  scratchpad,
  isExpanded,
  onToggle,
}: {
  node: GraphNode;
  state: GraphState;
  scratchpad?: string;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const nodeState = state.nodes[node.id];
  const status = nodeState?.status ?? "pending";
  const hasScratchpad = !!scratchpad;

  return (
    <Card className={cn("h-full border-border/70 transition-all", isExpanded && "border-primary/25 shadow-[0_18px_42px_rgba(15,23,42,0.06)]") }>
      <CardHeader className="cursor-pointer gap-4" onClick={onToggle}>
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 items-start gap-3">
            <div className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-xl border border-border/70 bg-muted/40 text-muted-foreground">
              {hasScratchpad ? isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" /> : <Workflow className="h-4 w-4" />}
            </div>
            <div className="min-w-0">
              <CardTitle className="truncate text-base">{node.id}</CardTitle>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1 rounded-full border border-border/70 bg-background px-2.5 py-1">
                  <User className="h-3 w-3" />
                  {node.agent}
                </span>
                <span className="inline-flex rounded-full border border-border/70 bg-muted/35 px-2.5 py-1 uppercase tracking-[0.12em]">
                  {node.type}
                </span>
              </div>
            </div>
          </div>
          <StatusBadge status={status} />
        </div>
      </CardHeader>
      {isExpanded && scratchpad && (
        <CardContent className="pt-0">
          <div className="panel-subtle overflow-hidden">
            <div className="border-b border-border/70 px-4 py-3 text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
              Scratchpad
            </div>
            <ScrollArea className="max-h-96 px-4 py-4">
              <MarkdownRenderer content={scratchpad} className="text-sm" />
            </ScrollArea>
          </div>
        </CardContent>
      )}
    </Card>
  );
}

export function NodeTimeline({ state, graph, scratchpads }: NodeTimelineProps) {
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const levels = computeLevels(graph);

  const toggleNode = (nodeId: string) => {
    setExpandedNodes((prev) => {
      const next = new Set(prev);
      if (next.has(nodeId)) next.delete(nodeId);
      else next.add(nodeId);
      return next;
    });
  };

  return (
    <div className="space-y-8">
      {levels.map(({ level, nodes }) => (
        <section key={level} className="space-y-4">
          <div className="flex items-center justify-between gap-4 border-b border-border/60 pb-3">
            <div>
              <div className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">Execution layer</div>
              <div className="mt-1 text-lg font-semibold tracking-tight">Level {level}</div>
            </div>
            <div className="rounded-full border border-border/70 bg-background px-3 py-1 text-xs font-medium text-muted-foreground">
              {nodes.length > 1 ? `병렬 ${nodes.length}개` : "단일 실행"}
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {nodes.map((node) => (
              <NodeCard
                key={node.id}
                node={node}
                state={state}
                scratchpad={scratchpads[node.id]}
                isExpanded={expandedNodes.has(node.id)}
                onToggle={() => toggleNode(node.id)}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
