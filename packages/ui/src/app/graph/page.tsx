"use client";

import { useState } from "react";
import useSWR, { mutate } from "swr";
import ContentLayout from "@cloudscape-design/components/content-layout";
import Container from "@cloudscape-design/components/container";
import Header from "@cloudscape-design/components/header";
import SpaceBetween from "@cloudscape-design/components/space-between";
import Button from "@cloudscape-design/components/button";
import Alert from "@cloudscape-design/components/alert";
import Box from "@cloudscape-design/components/box";
import Badge from "@cloudscape-design/components/badge";
import SplitPanel from "@cloudscape-design/components/split-panel";
import AppLayout from "@cloudscape-design/components/app-layout";
import { DagCanvas } from "@/components/graph/DagCanvas";
import { NodeEditorDrawer } from "@/components/graph/NodeEditorDrawer";

interface GraphNode {
  id: string;
  type: "worker" | "router" | "aggregator";
  agent: string;
  skills?: string[];
  hooks?: string[];
  model?: string;
  depends_on: string[];
  tasks?: string[];
  config?: {
    isolation?: string;
    retry?: number;
  };
  wait?: "all" | "any";
}

interface GraphData {
  version: string;
  nodes: GraphNode[];
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function GraphPage() {
  const { data, error } = useSWR<GraphData>("/api/graph", fetcher);
  const [localNodes, setLocalNodes] = useState<GraphNode[] | null>(null);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [showAddNode, setShowAddNode] = useState(false);

  const nodes = localNodes ?? data?.nodes ?? [];
  const hasChanges = localNodes !== null;

  const handleNodesChange = (updatedNodes: GraphNode[]) => {
    setLocalNodes(updatedNodes);
    setSaveError(null);
  };

  const handleNodeUpdate = (updatedNode: GraphNode) => {
    const updatedNodes = nodes.map((n) =>
      n.id === updatedNode.id ? updatedNode : n
    );
    handleNodesChange(updatedNodes);
    setSelectedNode(updatedNode);
  };

  const handleAddNode = (newNode: GraphNode) => {
    handleNodesChange([...nodes, newNode]);
    setShowAddNode(false);
  };

  const handleDeleteNode = (nodeId: string) => {
    // Remove the node and update dependencies
    const updatedNodes = nodes
      .filter((n) => n.id !== nodeId)
      .map((n) => ({
        ...n,
        depends_on: n.depends_on.filter((d) => d !== nodeId),
      }));
    handleNodesChange(updatedNodes);
    setSelectedNode(null);
  };

  const handleSave = async () => {
    if (!localNodes) return;

    setSaving(true);
    setSaveError(null);

    try {
      const response = await fetch("/api/graph", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          version: data?.version || "1.0",
          nodes: localNodes,
        }),
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || "Failed to save");
      }

      setLocalNodes(null);
      mutate("/api/graph");
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setLocalNodes(null);
    setSaveError(null);
  };

  if (error) {
    return (
      <ContentLayout
        header={
          <Header
            variant="h1"
            description="Visual DAG editor for graph.yaml"
          >
            Graph Editor
          </Header>
        }
      >
        <Alert type="info" header="No Graph Found">
          No graph.yaml found. Select a bundle from the Bundles page to create one.
        </Alert>
      </ContentLayout>
    );
  }

  return (
    <ContentLayout
      header={
        <Header
          variant="h1"
          description="Visual DAG editor for graph.yaml"
          actions={
            <SpaceBetween direction="horizontal" size="xs">
              <Button onClick={() => setShowAddNode(true)}>Add Node</Button>
              {hasChanges && (
                <>
                  <Button variant="normal" onClick={handleReset}>
                    Reset
                  </Button>
                  <Button
                    variant="primary"
                    onClick={handleSave}
                    loading={saving}
                  >
                    Save
                  </Button>
                </>
              )}
            </SpaceBetween>
          }
        >
          Graph Editor
        </Header>
      }
    >
      <SpaceBetween size="l">
        {saveError && (
          <Alert type="error" dismissible onDismiss={() => setSaveError(null)}>
            {saveError}
          </Alert>
        )}

        <Container>
          <DagCanvas
            nodes={nodes}
            onNodesChange={handleNodesChange}
            onNodeSelect={setSelectedNode}
          />
        </Container>

        {/* Legend */}
        <Container>
          <SpaceBetween direction="horizontal" size="l">
            <SpaceBetween direction="horizontal" size="xs">
              <Box
                display="inline-block"
                padding="xxs"
              >
                <div
                  style={{
                    width: 16,
                    height: 16,
                    borderRadius: 4,
                    border: "2px solid #0972d3",
                    backgroundColor: "#f4f8ff",
                  }}
                />
              </Box>
              <Box>Worker</Box>
            </SpaceBetween>
            <SpaceBetween direction="horizontal" size="xs">
              <Box display="inline-block" padding="xxs">
                <div
                  style={{
                    width: 16,
                    height: 16,
                    borderRadius: 4,
                    border: "2px solid #f89256",
                    backgroundColor: "#fff8f4",
                  }}
                />
              </Box>
              <Box>Router</Box>
            </SpaceBetween>
            <SpaceBetween direction="horizontal" size="xs">
              <Box display="inline-block" padding="xxs">
                <div
                  style={{
                    width: 16,
                    height: 16,
                    borderRadius: 4,
                    border: "2px solid #037f0c",
                    backgroundColor: "#f4fff4",
                  }}
                />
              </Box>
              <Box>Aggregator</Box>
            </SpaceBetween>
          </SpaceBetween>
        </Container>
      </SpaceBetween>

      {/* Node Editor Drawer */}
      {selectedNode && (
        <NodeEditorDrawer
          node={selectedNode}
          allNodes={nodes}
          onClose={() => setSelectedNode(null)}
          onUpdate={handleNodeUpdate}
          onDelete={() => handleDeleteNode(selectedNode.id)}
        />
      )}

      {/* Add Node Modal */}
      {showAddNode && (
        <NodeEditorDrawer
          node={null}
          allNodes={nodes}
          onClose={() => setShowAddNode(false)}
          onAdd={handleAddNode}
        />
      )}
    </ContentLayout>
  );
}
