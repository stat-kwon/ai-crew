"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Calendar, Clock, GitBranch } from "lucide-react";

interface RunEntry {
  id: string;
  intent: string;
  status: string;
  startedAt: string;
  completedAt?: string;
  nodesCompleted?: number;
  nodesFailed?: number;
  nodesTotal?: number;
}

interface RunListProps {
  runs: RunEntry[];
}

export function RunList({ runs }: RunListProps) {
  if (runs.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <p className="text-muted-foreground">
            No runs yet. Execute a workflow to see run history.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {runs.map((run) => (
        <Link key={run.id} href={`/runs/${run.id}`}>
          <Card className="cursor-pointer transition-all hover:shadow-md">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-medium">
                  {run.id}
                </CardTitle>
                <Badge
                  variant={
                    run.status === "completed"
                      ? "completed"
                      : run.status === "failed"
                        ? "failed"
                        : run.status === "running"
                          ? "running"
                          : "pending"
                  }
                >
                  {run.status}
                </Badge>
              </div>
              <CardDescription className="line-clamp-1">
                {run.intent || "No intent specified"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  <span>
                    {new Date(run.startedAt).toLocaleDateString()}
                  </span>
                </div>
                {run.completedAt && (
                  <div className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    <span>
                      {Math.round(
                        (new Date(run.completedAt).getTime() -
                          new Date(run.startedAt).getTime()) /
                          1000
                      )}
                      s
                    </span>
                  </div>
                )}
                {run.nodesTotal !== undefined && (
                  <div className="flex items-center gap-1">
                    <GitBranch className="h-4 w-4" />
                    <span>
                      {run.nodesCompleted || 0}/{run.nodesTotal} nodes
                    </span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
}
