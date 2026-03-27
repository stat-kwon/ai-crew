"use client";

import { useCallback, useEffect, useMemo } from "react";
import {
  ReactFlow,
  useNodesState,
  useEdgesState,
  addEdge,
  Background,
  Controls,
  MiniMap,
  type Node,
  type Edge,
  type Connection,
  type NodeTypes,
  MarkerType,
} from "@xyflow/react";
import dagre from "dagre";
import "@xyflow/react/dist/style.css";
import { NodeCard } from "./NodeCard";

interface GraphNode {
  id: string;
  type: "worker" | "router" | "aggregator";
  agent: string;
  skills?: string[];
  depends_on: string[];
  tasks?: string[];
  config?: {
    isolation?: string;
    retry?: number;
  };
  wait?: "all" | "any";
}

interface DagCanvasProps {
  nodes: GraphNode[];
  onNodesChange?: (nodes: GraphNode[]) => void;
  onNodeSelect?: (node: GraphNode | null) => void;
}

const nodeTypes: NodeTypes = {
  custom: NodeCard,
};

function getLayoutedElements(
  nodes: Node[],
  edges: Edge[],
  direction = "TB"
): { nodes: Node[]; edges: Edge[] } {
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));
  dagreGraph.setGraph({ rankdir: direction, nodesep: 80, ranksep: 100 });

  const nodeWidth = 200;
  const nodeHeight = 100;

  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, { width: nodeWidth, height: nodeHeight });
  });

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  const layoutedNodes = nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    return {
      ...node,
      position: {
        x: nodeWithPosition.x - nodeWidth / 2,
        y: nodeWithPosition.y - nodeHeight / 2,
      },
    };
  });

  return { nodes: layoutedNodes, edges };
}

function graphNodesToFlow(
  graphNodes: GraphNode[]
): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = graphNodes.map((node) => ({
    id: node.id,
    type: "custom",
    data: {
      label: node.id,
      nodeType: node.type,
      agent: node.agent,
      skills: node.skills,
      tasks: node.tasks,
    },
    position: { x: 0, y: 0 },
  }));

  const edges: Edge[] = graphNodes.flatMap((node) =>
    node.depends_on.map((dep) => ({
      id: `${dep}-${node.id}`,
      source: dep,
      target: node.id,
      markerEnd: { type: MarkerType.ArrowClosed },
    }))
  );

  return getLayoutedElements(nodes, edges);
}

export function DagCanvas({
  nodes: graphNodes,
  onNodesChange,
  onNodeSelect,
}: DagCanvasProps) {
  const { nodes: initialNodes, edges: initialEdges } = useMemo(
    () => graphNodesToFlow(graphNodes),
    [graphNodes]
  );

  const [nodes, setNodes, onNodesStateChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  useEffect(() => {
    const { nodes: newNodes, edges: newEdges } = graphNodesToFlow(graphNodes);
    setNodes(newNodes);
    setEdges(newEdges);
  }, [graphNodes, setNodes, setEdges]);

  const onConnect = useCallback(
    (params: Connection) => {
      setEdges((eds) => addEdge({ ...params, markerEnd: { type: MarkerType.ArrowClosed } }, eds));

      // Update graph nodes with new dependency
      if (params.source && params.target) {
        const updatedNodes = graphNodes.map((node) => {
          if (node.id === params.target && !node.depends_on.includes(params.source!)) {
            return {
              ...node,
              depends_on: [...node.depends_on, params.source!],
            };
          }
          return node;
        });
        onNodesChange?.(updatedNodes);
      }
    },
    [setEdges, graphNodes, onNodesChange]
  );

  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      const graphNode = graphNodes.find((n) => n.id === node.id);
      onNodeSelect?.(graphNode || null);
    },
    [graphNodes, onNodeSelect]
  );

  const onPaneClick = useCallback(() => {
    onNodeSelect?.(null);
  }, [onNodeSelect]);

  return (
    <div style={{ height: 600, width: "100%", borderRadius: 8, border: "1px solid #d1d5db", background: "#fff" }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesStateChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        nodeTypes={nodeTypes}
        fitView
        attributionPosition="bottom-left"
      >
        <Background />
        <Controls />
        <MiniMap
          nodeColor={(node) => {
            const type = node.data?.nodeType;
            return type === "worker"
              ? "#3b82f6"
              : type === "router"
                ? "#f59e0b"
                : type === "aggregator"
                  ? "#22c55e"
                  : "#6b7280";
          }}
        />
      </ReactFlow>
    </div>
  );
}
