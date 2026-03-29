"use client";

import { use } from "react";
import useSWR from "swr";
import { RunHeader } from "@/components/run-detail/RunHeader";
import { NodeList } from "@/components/run-detail/NodeList";
import type { GraphNode } from "@/components/run-detail/compute-levels";
import type { NodeStatus } from "@/components/run-detail/NodeAccordion";

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

interface StateData {
  runId?: string;
  intent?: { description?: string };
  nodes: Record<string, NodeStatus>;
}

interface GraphData {
  nodes: GraphNode[];
}

const fetcher = (url: string) =>
  fetch(url).then((res) => (res.ok ? res.json() : null));

export default function RunDetailPage({
  params,
}: {
  params: Promise<{ runId: string }>;
}) {
  const { runId } = use(params);

  const { data: runsData } = useSWR<{ runs: RunEntry[] }>(
    "/api/runs",
    fetcher
  );
  const { data: stateData } = useSWR<StateData>("/api/state", fetcher, {
    refreshInterval: 5000,
  });
  const { data: graphData } = useSWR<GraphData>("/api/graph", fetcher);

  // Find the run either from runs list or current state
  const runFromList = runsData?.runs?.find((r) => r.runId === runId);
  const isCurrentRun = stateData?.runId === runId;

  // Determine run metadata
  const intentDescription =
    runFromList?.intentDescription ||
    (isCurrentRun ? stateData?.intent?.description : undefined);
  const state = runFromList?.state || (isCurrentRun ? "running" : "unknown");
  const startedAt = runFromList?.createdAt || null;
  const completedAt = runFromList?.completedAt || null;
  const nodesCompleted = runFromList?.nodesCompleted ?? 0;
  const nodesTotal = runFromList?.nodesTotal ?? 0;
  const nodesFailed = runFromList?.nodesFailed ?? 0;

  // Node statuses from current state (if this is the active run)
  const nodeStatuses: Record<string, NodeStatus> =
    isCurrentRun && stateData?.nodes ? stateData.nodes : {};

  // Graph nodes for level grouping
  const graphNodes = graphData?.nodes ?? [];

  const isLoading = !runsData && !stateData;

  if (isLoading) {
    return (
      <div className="py-12 text-center text-sm text-slate-400">
        런 정보를 불러오는 중...
      </div>
    );
  }

  if (!runFromList && !isCurrentRun) {
    return (
      <div className="py-12 text-center">
        <p className="text-sm text-slate-400">
          런을 찾을 수 없습니다: {runId}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <RunHeader
        intentDescription={intentDescription}
        runId={runId}
        state={state}
        startedAt={startedAt}
        completedAt={completedAt}
        nodesCompleted={nodesCompleted}
        nodesTotal={nodesTotal}
        nodesFailed={nodesFailed}
      />

      <NodeList graphNodes={graphNodes} nodeStatuses={nodeStatuses} />
    </div>
  );
}
