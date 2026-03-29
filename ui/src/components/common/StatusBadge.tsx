import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type Status =
  | "pending"
  | "running"
  | "completed"
  | "failed"
  | "skipped"
  | "preparing"
  | "archived";

interface StatusBadgeProps {
  status: Status;
  className?: string;
}

const statusConfig: Record<
  Status,
  { label: string; className: string }
> = {
  pending: { label: "대기", className: "border-border bg-background text-muted-foreground" },
  running: { label: "진행 중", className: "border-transparent bg-primary text-primary-foreground" },
  completed: { label: "완료", className: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-300" },
  failed: { label: "실패", className: "border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/60 dark:text-red-300" },
  skipped: { label: "건너뜀", className: "border-border bg-muted/50 text-muted-foreground" },
  preparing: { label: "준비 중", className: "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900 dark:bg-blue-950/60 dark:text-blue-300" },
  archived: { label: "보관됨", className: "border-zinc-200 bg-zinc-100 text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300" },
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status] ?? statusConfig.pending;

  return (
    <Badge variant="outline" className={cn("h-7 rounded-full px-3 text-[11px] font-semibold tracking-[0.12em] uppercase", config.className, className)}>
      {config.label}
    </Badge>
  );
}
