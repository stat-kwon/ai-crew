"use client";

import { cn } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Circle, Loader2 } from "lucide-react";

interface Task {
  text: string;
  done: boolean;
}

interface StageCardProps {
  name: string;
  status: "pending" | "active" | "complete";
  tasks: Task[];
  onClick?: () => void;
  isSelected?: boolean;
}

export function StageCard({
  name,
  status,
  tasks,
  onClick,
  isSelected,
}: StageCardProps) {
  const completedTasks = tasks.filter((t) => t.done).length;
  const progress = tasks.length > 0 ? (completedTasks / tasks.length) * 100 : 0;

  return (
    <Card
      className={cn(
        "cursor-pointer transition-all hover:shadow-md",
        isSelected && "ring-2 ring-primary",
        status === "complete" && "border-green-200 bg-green-50/50",
        status === "active" && "border-blue-200 bg-blue-50/50"
      )}
      onClick={onClick}
    >
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">{name}</CardTitle>
          {status === "complete" ? (
            <CheckCircle className="h-5 w-5 text-green-500" />
          ) : status === "active" ? (
            <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
          ) : (
            <Circle className="h-5 w-5 text-gray-300" />
          )}
        </div>
        <CardDescription>
          {completedTasks} / {tasks.length} tasks
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
            <div
              className={cn(
                "h-full transition-all",
                status === "complete"
                  ? "bg-green-500"
                  : status === "active"
                    ? "bg-blue-500"
                    : "bg-gray-300"
              )}
              style={{ width: `${progress}%` }}
            />
          </div>
          <Badge
            variant={
              status === "complete"
                ? "completed"
                : status === "active"
                  ? "running"
                  : "pending"
            }
          >
            {status}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}
