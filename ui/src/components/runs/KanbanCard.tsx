"use client";

import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Clock, CheckCircle, XCircle, Circle, Loader2 } from "lucide-react";

interface KanbanCardProps {
  id: string;
  status: "pending" | "running" | "completed" | "failed";
  startedAt?: string;
  completedAt?: string;
  onClick?: () => void;
}

export function KanbanCard({
  id,
  status,
  startedAt,
  completedAt,
  onClick,
}: KanbanCardProps) {
  const duration =
    startedAt && completedAt
      ? Math.round(
          (new Date(completedAt).getTime() - new Date(startedAt).getTime()) /
            1000
        )
      : null;

  const statusIcons = {
    pending: <Circle className="h-4 w-4 text-gray-400" />,
    running: <Loader2 className="h-4 w-4 animate-spin text-blue-500" />,
    completed: <CheckCircle className="h-4 w-4 text-green-500" />,
    failed: <XCircle className="h-4 w-4 text-red-500" />,
  };

  return (
    <Card
      className={cn(
        "cursor-pointer transition-all hover:shadow-md",
        status === "completed" && "border-green-200",
        status === "failed" && "border-red-200",
        status === "running" && "border-blue-200"
      )}
      onClick={onClick}
    >
      <CardContent className="p-3">
        <div className="flex items-center justify-between">
          <span className="font-medium">{id}</span>
          {statusIcons[status]}
        </div>
        {duration !== null && (
          <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            <span>{duration}s</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
