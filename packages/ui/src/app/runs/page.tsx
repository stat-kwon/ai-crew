"use client";

import { useState } from "react";
import useSWR from "swr";
import ContentLayout from "@cloudscape-design/components/content-layout";
import Container from "@cloudscape-design/components/container";
import Header from "@cloudscape-design/components/header";
import Tabs from "@cloudscape-design/components/tabs";
import SpaceBetween from "@cloudscape-design/components/space-between";
import { KanbanBoard } from "@/components/runs/KanbanBoard";
import { RunsHistoryTable } from "@/components/runs/RunsHistoryTable";
import { GanttTimeline } from "@/components/runs/GanttTimeline";
import { ScratchpadModal } from "@/components/runs/ScratchpadModal";

interface RunEntry {
  id: string;
  intent: string;
  status: string;
  startedAt: string;
  completedAt?: string;
}

interface Registry {
  runs: RunEntry[];
}

interface NodeState {
  status: string;
  startedAt?: string;
  completedAt?: string;
}

interface StateData {
  nodes: Record<string, NodeState>;
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function RunsPage() {
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("kanban");

  const { data: registry } = useSWR<Registry>("/api/runs", fetcher, {
    refreshInterval: 5000,
  });
  const { data: state } = useSWR<StateData>("/api/state", fetcher, {
    refreshInterval: 5000,
  });

  const runs = registry?.runs || [];
  const nodes = state?.nodes || {};

  const handleNodeClick = (nodeId: string) => {
    setSelectedNodeId(nodeId);
  };

  return (
    <ContentLayout
      header={
        <Header
          variant="h1"
          description="Execution history and current node status"
        >
          Runs
        </Header>
      }
    >
      <Tabs
        activeTabId={activeTab}
        onChange={({ detail }) => setActiveTab(detail.activeTabId)}
        tabs={[
          {
            id: "kanban",
            label: "Kanban",
            content: (
              <Container>
                <KanbanBoard nodes={nodes} onNodeClick={handleNodeClick} />
              </Container>
            ),
          },
          {
            id: "timeline",
            label: "Timeline",
            content: (
              <Container header={<Header variant="h2">Gantt Timeline</Header>}>
                <GanttTimeline nodes={nodes} onNodeClick={handleNodeClick} />
              </Container>
            ),
          },
          {
            id: "history",
            label: "History",
            content: <RunsHistoryTable runs={runs} />,
          },
        ]}
      />

      {selectedNodeId && (
        <ScratchpadModal
          nodeId={selectedNodeId}
          onClose={() => setSelectedNodeId(null)}
        />
      )}
    </ContentLayout>
  );
}
