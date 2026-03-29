"use client";

interface DateDividerProps {
  date: string;
}

export function DateDivider({ date }: DateDividerProps) {
  return (
    <div className="flex items-center gap-3 py-3" data-testid="date-divider">
      <div className="h-px flex-1 bg-slate-200" />
      <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider whitespace-nowrap">
        {date}
      </span>
      <div className="h-px flex-1 bg-slate-200" />
    </div>
  );
}
