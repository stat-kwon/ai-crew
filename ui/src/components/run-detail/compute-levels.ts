export interface GraphNode {
  id: string;
  type: string;
  agent?: string;
  skills?: string[];
  depends_on?: string[];
}

/**
 * Compute the execution level for each node using dependency depth (Kahn's algorithm variant).
 * Level 0 = no dependencies, Level N = max dependency level + 1.
 */
export function computeLevels(nodes: GraphNode[]): Map<string, number> {
  const levels = new Map<string, number>();
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));

  function getLevel(id: string): number {
    if (levels.has(id)) return levels.get(id)!;
    const node = nodeMap.get(id);
    if (!node?.depends_on?.length) {
      levels.set(id, 0);
      return 0;
    }
    const maxDep = Math.max(
      ...node.depends_on.map((d) => (nodeMap.has(d) ? getLevel(d) : 0))
    );
    const level = maxDep + 1;
    levels.set(id, level);
    return level;
  }

  nodes.forEach((n) => getLevel(n.id));
  return levels;
}

/**
 * Group nodes by their computed level, sorted ascending.
 */
export function groupNodesByLevel(
  nodes: GraphNode[]
): Array<{ level: number; nodes: GraphNode[] }> {
  const levels = computeLevels(nodes);
  const groups = new Map<number, GraphNode[]>();

  nodes.forEach((node) => {
    const level = levels.get(node.id) ?? 0;
    if (!groups.has(level)) groups.set(level, []);
    groups.get(level)!.push(node);
  });

  return Array.from(groups.entries())
    .sort(([a], [b]) => a - b)
    .map(([level, nodes]) => ({ level, nodes }));
}
