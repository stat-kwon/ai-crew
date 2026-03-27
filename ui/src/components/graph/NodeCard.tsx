"use client";

import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";

interface NodeCardData {
  label: string;
  nodeType: "worker" | "router" | "aggregator";
  agent?: string;
  skills?: string[];
  tasks?: string[];
}

const typeStyles = {
  worker: {
    borderColor: "#0972d3",
    backgroundColor: "#f4f8ff",
  },
  router: {
    borderColor: "#f89256",
    backgroundColor: "#fff8f4",
  },
  aggregator: {
    borderColor: "#037f0c",
    backgroundColor: "#f4fff4",
  },
};

const typeLabels = {
  worker: "W",
  router: "R",
  aggregator: "A",
};

function NodeCardComponent({ data, selected }: NodeProps) {
  const nodeData = data as unknown as NodeCardData;
  const styles = typeStyles[nodeData.nodeType] || typeStyles.worker;

  return (
    <>
      <Handle
        type="target"
        position={Position.Top}
        style={{ background: "#687078" }}
      />
      <div
        style={{
          minWidth: 180,
          borderRadius: 8,
          border: `2px solid ${styles.borderColor}`,
          backgroundColor: styles.backgroundColor,
          padding: 12,
          boxShadow: selected
            ? `0 0 0 2px white, 0 0 0 4px ${styles.borderColor}`
            : "0 1px 3px rgba(0,0,0,0.1)",
          transition: "box-shadow 0.2s",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <span
            style={{
              width: 20,
              height: 20,
              borderRadius: 4,
              backgroundColor: styles.borderColor,
              color: "white",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 11,
              fontWeight: 600,
            }}
          >
            {typeLabels[nodeData.nodeType]}
          </span>
          <span style={{ fontWeight: 600, fontSize: 14 }}>{nodeData.label}</span>
        </div>
        {nodeData.agent && (
          <div
            style={{
              marginTop: 4,
              fontSize: 11,
              color: "#687078",
            }}
          >
            {nodeData.agent}
          </div>
        )}
        {nodeData.skills && nodeData.skills.length > 0 && (
          <div
            style={{
              marginTop: 6,
              display: "flex",
              flexWrap: "wrap",
              gap: 4,
            }}
          >
            {nodeData.skills.slice(0, 3).map((skill) => (
              <span
                key={skill}
                style={{
                  borderRadius: 12,
                  backgroundColor: "rgba(255,255,255,0.7)",
                  padding: "2px 8px",
                  fontSize: 10,
                  border: `1px solid ${styles.borderColor}`,
                }}
              >
                {skill}
              </span>
            ))}
            {nodeData.skills.length > 3 && (
              <span
                style={{
                  fontSize: 10,
                  color: "#687078",
                  padding: "2px 4px",
                }}
              >
                +{nodeData.skills.length - 3}
              </span>
            )}
          </div>
        )}
      </div>
      <Handle
        type="source"
        position={Position.Bottom}
        style={{ background: "#687078" }}
      />
    </>
  );
}

export const NodeCard = memo(NodeCardComponent);
