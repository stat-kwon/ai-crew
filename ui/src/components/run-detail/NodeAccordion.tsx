"use client";

import { useState } from "react";
import useSWR from "swr";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Card } from "@/components/ui/card";

export interface NodeStatus {
  status: string;
  startedAt?: string;
  completedAt?: string;
  error?: string;
}

export interface NodeAccordionProps {
  nodeId: string;
  agent?: string;
  nodeStatus?: NodeStatus;
}

const fetcher = (url: string) =>
  fetch(url).then((res) => (res.ok ? res.json() : null));

function getStatusIcon(status: string): {
  icon: string;
  colorClass: string;
} {
  switch (status) {
    case "completed":
      return { icon: "check_circle", colorClass: "text-emerald-500" };
    case "running":
      return { icon: "progress_activity", colorClass: "text-indigo-500 animate-spin" };
    case "failed":
      return { icon: "error", colorClass: "text-rose-500" };
    default:
      return { icon: "schedule", colorClass: "text-slate-400" };
  }
}

function formatNodeDuration(
  startedAt?: string,
  completedAt?: string
): string {
  if (!startedAt) return "-";
  const start = new Date(startedAt).getTime();
  const end = completedAt ? new Date(completedAt).getTime() : Date.now();
  const diffMs = end - start;
  const minutes = Math.floor(diffMs / 60000);
  const seconds = Math.floor((diffMs % 60000) / 1000);
  if (minutes > 0) return `${minutes}분 ${seconds}초`;
  return `${seconds}초`;
}

export function NodeAccordion({
  nodeId,
  agent,
  nodeStatus,
}: NodeAccordionProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { data: scratchpadData, isLoading } = useSWR(
    isOpen ? `/api/scratchpad/${nodeId}` : null,
    fetcher
  );

  const status = nodeStatus?.status ?? "pending";
  const { icon, colorClass } = getStatusIcon(status);
  const duration = formatNodeDuration(
    nodeStatus?.startedAt,
    nodeStatus?.completedAt
  );

  const markdownContent =
    scratchpadData?.content ||
    scratchpadData?.files
      ?.map((f: { name: string; content: string }) => f.content)
      .join("\n\n---\n\n") ||
    "";

  return (
    <Card className="overflow-hidden">
      <button
        type="button"
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-slate-50 transition-colors"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        aria-controls={`node-content-${nodeId}`}
        data-testid={`node-accordion-${nodeId}`}
      >
        <div className="flex items-center gap-3">
          <span
            className={`material-symbols-outlined text-lg filled ${colorClass}`}
          >
            {icon}
          </span>
          <span className="font-bold text-sm text-slate-900">{nodeId}</span>
          {agent && (
            <>
              <span className="text-slate-300">·</span>
              <span className="text-xs text-slate-500">{agent}</span>
            </>
          )}
          <span className="text-slate-300">·</span>
          <span className="text-xs text-slate-400">{duration}</span>
        </div>
        <span
          className={`material-symbols-outlined text-slate-400 transition-transform duration-200 ${
            isOpen ? "rotate-180" : ""
          }`}
        >
          expand_more
        </span>
      </button>

      <div
        id={`node-content-${nodeId}`}
        className={`transition-all duration-200 overflow-hidden ${
          isOpen ? "max-h-[2000px] opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        <div className="px-4 pb-4 border-t border-slate-100">
          {nodeStatus?.error && (
            <div className="mt-3 p-3 bg-rose-50 rounded-lg text-sm text-rose-700">
              {nodeStatus.error}
            </div>
          )}
          {isOpen && isLoading && (
            <div className="py-6 text-center text-sm text-slate-400">
              결과물을 불러오는 중...
            </div>
          )}
          {isOpen && !isLoading && markdownContent ? (
            <div className="mt-3 prose prose-slate max-w-none prose-sm">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {markdownContent}
              </ReactMarkdown>
            </div>
          ) : isOpen && !isLoading ? (
            <div className="py-6 text-center text-sm text-slate-400">
              결과물이 없습니다
            </div>
          ) : null}
        </div>
      </div>
    </Card>
  );
}
