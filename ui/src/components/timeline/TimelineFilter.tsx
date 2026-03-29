"use client";

export type RunStatusFilter = "all" | "running" | "completed" | "failed";

interface TimelineFilterProps {
  statusFilter: RunStatusFilter;
  searchQuery: string;
  onStatusFilterChange: (filter: RunStatusFilter) => void;
  onSearchQueryChange: (query: string) => void;
}

const filterOptions: { value: RunStatusFilter; label: string }[] = [
  { value: "all", label: "전체" },
  { value: "running", label: "진행 중" },
  { value: "completed", label: "완료" },
  { value: "failed", label: "실패" },
];

export function TimelineFilter({
  statusFilter,
  searchQuery,
  onStatusFilterChange,
  onSearchQueryChange,
}: TimelineFilterProps) {
  return (
    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
      <div className="relative flex-1">
        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg">
          search
        </span>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchQueryChange(e.target.value)}
          placeholder="런 검색..."
          aria-label="런 검색"
          className="w-full pl-10 pr-4 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 placeholder:text-slate-400"
          data-testid="timeline-search"
        />
      </div>
      <select
        value={statusFilter}
        onChange={(e) => onStatusFilterChange(e.target.value as RunStatusFilter)}
        aria-label="상태 필터"
        className="px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 text-slate-700"
        data-testid="timeline-status-filter"
      >
        {filterOptions.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}
