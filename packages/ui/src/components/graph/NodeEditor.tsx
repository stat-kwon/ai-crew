"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

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

interface NodeEditorProps {
  node: GraphNode;
  onClose: () => void;
  onUpdate?: (node: GraphNode) => void;
}

export function NodeEditor({ node, onClose }: NodeEditorProps) {
  return (
    <Card className="w-80">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg">{node.id}</CardTitle>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <label className="text-sm font-medium">Type</label>
          <div className="mt-1">
            <Badge
              variant={
                node.type === "worker"
                  ? "default"
                  : node.type === "router"
                    ? "secondary"
                    : "outline"
              }
            >
              {node.type}
            </Badge>
          </div>
        </div>

        <div>
          <label className="text-sm font-medium">Agent</label>
          <p className="mt-1 text-sm text-muted-foreground">{node.agent}</p>
        </div>

        {node.skills && node.skills.length > 0 && (
          <div>
            <label className="text-sm font-medium">Skills</label>
            <div className="mt-1 flex flex-wrap gap-1">
              {node.skills.map((skill) => (
                <Badge key={skill} variant="outline">
                  {skill}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {node.depends_on.length > 0 && (
          <div>
            <label className="text-sm font-medium">Dependencies</label>
            <div className="mt-1 flex flex-wrap gap-1">
              {node.depends_on.map((dep) => (
                <Badge key={dep} variant="secondary">
                  {dep}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {node.tasks && node.tasks.length > 0 && (
          <div>
            <label className="text-sm font-medium">Tasks</label>
            <ul className="mt-1 space-y-1">
              {node.tasks.map((task, i) => (
                <li key={i} className="text-sm text-muted-foreground">
                  - {task}
                </li>
              ))}
            </ul>
          </div>
        )}

        {node.config && (
          <div>
            <label className="text-sm font-medium">Config</label>
            <div className="mt-1 space-y-1 text-sm text-muted-foreground">
              {node.config.isolation && (
                <p>Isolation: {node.config.isolation}</p>
              )}
              {node.config.retry !== undefined && (
                <p>Retry: {node.config.retry}</p>
              )}
            </div>
          </div>
        )}

        {node.wait && (
          <div>
            <label className="text-sm font-medium">Wait Mode</label>
            <p className="mt-1 text-sm text-muted-foreground">{node.wait}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
