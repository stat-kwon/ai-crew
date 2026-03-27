"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import ContentLayout from "@cloudscape-design/components/content-layout";
import Container from "@cloudscape-design/components/container";
import Header from "@cloudscape-design/components/header";
import SpaceBetween from "@cloudscape-design/components/space-between";
import Box from "@cloudscape-design/components/box";
import Button from "@cloudscape-design/components/button";
import StatusIndicator from "@cloudscape-design/components/status-indicator";
import ColumnLayout from "@cloudscape-design/components/column-layout";
import Spinner from "@cloudscape-design/components/spinner";
import Badge from "@cloudscape-design/components/badge";
import { KanbanBoard } from "@/components/runs/KanbanBoard";
import { ScratchpadModal } from "@/components/runs/ScratchpadModal";

interface NodeSummary {
  status: string;
  startedAt?: string;
  completedAt?: string;
  summary?: string;
  issues?: string[];
  keyDecisions?: string[];
}

interface RunManifest {
  id: string;
  intent: string;
  status: string;
  startedAt: string;
  completedAt?: string;
  nodes: Record<string, NodeSummary>;
  files?: string[];
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function RunDetailPage({
  params,
}: {
  params: Promise<{ runId: string }>;
}) {
  const router = useRouter();
  const { runId } = use(params);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);

  const { data: manifest, error, isLoading } = useSWR<RunManifest>(
    `/api/runs/${runId}`,
    fetcher
  );

  if (error) {
    return (
      <ContentLayout
        header={
          <Header
            variant="h1"
            actions={
              <Button onClick={() => router.push("/runs")}>Back to Runs</Button>
            }
          >
            Run Not Found
          </Header>
        }
      >
        <Box textAlign="center" color="text-status-inactive" padding="l">
          The requested run could not be found.
        </Box>
      </ContentLayout>
    );
  }

  if (isLoading || !manifest) {
    return (
      <ContentLayout header={<Header variant="h1">Loading...</Header>}>
        <Box textAlign="center" padding="l">
          <Spinner size="large" />
        </Box>
      </ContentLayout>
    );
  }

  const duration =
    manifest.startedAt && manifest.completedAt
      ? Math.round(
          (new Date(manifest.completedAt).getTime() -
            new Date(manifest.startedAt).getTime()) /
            1000
        )
      : null;

  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
    return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
  };

  return (
    <ContentLayout
      header={
        <Header
          variant="h1"
          description={manifest.intent}
          actions={
            <Button onClick={() => router.push("/runs")}>Back to Runs</Button>
          }
        >
          <SpaceBetween direction="horizontal" size="xs">
            <span>{runId}</span>
            <StatusIndicator
              type={
                manifest.status === "completed"
                  ? "success"
                  : manifest.status === "failed"
                    ? "error"
                    : manifest.status === "running"
                      ? "in-progress"
                      : "pending"
              }
            >
              {manifest.status}
            </StatusIndicator>
          </SpaceBetween>
        </Header>
      }
    >
      <SpaceBetween size="l">
        {/* Run Info */}
        <Container header={<Header variant="h2">Run Information</Header>}>
          <ColumnLayout columns={4} variant="text-grid">
            <div>
              <Box variant="awsui-key-label">Started</Box>
              <Box>{new Date(manifest.startedAt).toLocaleString()}</Box>
            </div>
            <div>
              <Box variant="awsui-key-label">Completed</Box>
              <Box>
                {manifest.completedAt
                  ? new Date(manifest.completedAt).toLocaleString()
                  : "-"}
              </Box>
            </div>
            <div>
              <Box variant="awsui-key-label">Duration</Box>
              <Box>{duration !== null ? formatDuration(duration) : "-"}</Box>
            </div>
            <div>
              <Box variant="awsui-key-label">Nodes</Box>
              <Box>{Object.keys(manifest.nodes).length}</Box>
            </div>
          </ColumnLayout>
        </Container>

        {/* Node Status */}
        <Container header={<Header variant="h2">Node Status</Header>}>
          <KanbanBoard nodes={manifest.nodes} onNodeClick={setSelectedNode} />
        </Container>

        {/* Selected Node Details */}
        {selectedNode && manifest.nodes[selectedNode] && (
          <Container
            header={
              <Header
                variant="h2"
                actions={
                  <Button onClick={() => setSelectedNode(null)}>Close</Button>
                }
              >
                Node: {selectedNode}
              </Header>
            }
          >
            <SpaceBetween size="l">
              <ColumnLayout columns={2} variant="text-grid">
                <div>
                  <Box variant="awsui-key-label">Status</Box>
                  <StatusIndicator
                    type={
                      manifest.nodes[selectedNode].status === "completed"
                        ? "success"
                        : manifest.nodes[selectedNode].status === "failed"
                          ? "error"
                          : "pending"
                    }
                  >
                    {manifest.nodes[selectedNode].status}
                  </StatusIndicator>
                </div>
                <div>
                  <Box variant="awsui-key-label">Duration</Box>
                  <Box>
                    {manifest.nodes[selectedNode].startedAt &&
                    manifest.nodes[selectedNode].completedAt
                      ? formatDuration(
                          Math.round(
                            (new Date(
                              manifest.nodes[selectedNode].completedAt!
                            ).getTime() -
                              new Date(
                                manifest.nodes[selectedNode].startedAt!
                              ).getTime()) /
                              1000
                          )
                        )
                      : "-"}
                  </Box>
                </div>
              </ColumnLayout>

              {manifest.nodes[selectedNode].summary && (
                <div>
                  <Box variant="awsui-key-label">Summary</Box>
                  <Box>{manifest.nodes[selectedNode].summary}</Box>
                </div>
              )}

              {manifest.nodes[selectedNode].issues &&
                manifest.nodes[selectedNode].issues!.length > 0 && (
                  <div>
                    <Box variant="awsui-key-label">Issues</Box>
                    <SpaceBetween size="xs">
                      {manifest.nodes[selectedNode].issues!.map((issue, i) => (
                        <Box key={i}>- {issue}</Box>
                      ))}
                    </SpaceBetween>
                  </div>
                )}

              {manifest.nodes[selectedNode].keyDecisions &&
                manifest.nodes[selectedNode].keyDecisions!.length > 0 && (
                  <div>
                    <Box variant="awsui-key-label">Key Decisions</Box>
                    <SpaceBetween size="xs">
                      {manifest.nodes[selectedNode].keyDecisions!.map(
                        (decision, i) => (
                          <Box key={i}>- {decision}</Box>
                        )
                      )}
                    </SpaceBetween>
                  </div>
                )}
            </SpaceBetween>
          </Container>
        )}
      </SpaceBetween>

      {/* Scratchpad Modal */}
      {selectedNode && manifest.nodes[selectedNode]?.status === "completed" && (
        <ScratchpadModal
          nodeId={selectedNode}
          onClose={() => setSelectedNode(null)}
        />
      )}
    </ContentLayout>
  );
}
