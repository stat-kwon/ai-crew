"use client";

import { groupNodesByLevel, type GraphNode } from "./compute-levels";
import { NodeAccordion, type NodeStatus } from "./NodeAccordion";

export interface NodeListProps {
  graphNodes: GraphNode[];
  nodeStatuses: Record<string, NodeStatus>;
}

function getLevelLabel(level: number): string {
  if (level === 0) return "Level 0 (병렬)";
  return `Level ${level} (의존성 있음)`;
}

export function NodeList({ graphNodes, nodeStatuses }: NodeListProps) {
  const levelGroups = groupNodesByLevel(graphNodes);

  if (levelGroups.length === 0) {
    return (
      <div className="py-8 text-center text-sm text-slate-400">
        노드 정보가 없습니다
      </div>
    );
  }

  return (
    <section aria-label="노드 실행 결과" className="space-y-6">
      {levelGroups.map(({ level, nodes }) => (
        <div key={level}>
          <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wide mb-3">
            {getLevelLabel(level)}
          </h2>
          <div className="space-y-2">
            {nodes.map((node) => (
              <NodeAccordion
                key={node.id}
                nodeId={node.id}
                agent={node.agent}
                nodeStatus={nodeStatuses[node.id]}
              />
            ))}
          </div>
        </div>
      ))}
    </section>
  );
}
