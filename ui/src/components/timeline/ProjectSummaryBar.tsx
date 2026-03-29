"use client";

import useSWR from "swr";
import { Card } from "@/components/ui/card";

interface ConfigData {
  defaults?: {
    bundle?: string;
    locale?: string;
  };
}

interface GraphData {
  nodes: Array<{ id: string; agent: string; type: string }>;
}

interface AidlcStage {
  name: string;
  status: "pending" | "active" | "complete";
}

interface AidlcStateResponse {
  stages: AidlcStage[];
  found: boolean;
}

const fetcher = (url: string) =>
  fetch(url).then((res) => (res.ok ? res.json() : null));

export function ProjectSummaryBar() {
  const { data: config } = useSWR<ConfigData>("/api/config", fetcher);
  const { data: graph } = useSWR<GraphData>("/api/graph", fetcher);
  const { data: aidlc } = useSWR<AidlcStateResponse>(
    "/api/aidlc/state",
    fetcher
  );

  const bundleName = config?.defaults?.bundle || "미설정";
  const agentCount = graph?.nodes?.length || 0;

  const designTotal = aidlc?.stages?.length || 0;
  const designCompleted =
    aidlc?.stages?.filter((s) => s.status === "complete").length || 0;
  const designProgress =
    designTotal > 0 ? Math.round((designCompleted / designTotal) * 100) : 0;
  const hasDesignData = aidlc?.found !== false && designTotal > 0;

  return (
    <Card className="p-4" data-testid="project-summary-bar">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex items-center gap-4 flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-xl filled">
              groups
            </span>
            <span className="text-sm font-bold text-slate-900 truncate">
              {bundleName}
            </span>
          </div>
          <span className="text-xs text-slate-400">|</span>
          <span className="text-xs text-slate-500">
            에이전트 {agentCount}개
          </span>
          {hasDesignData && (
            <>
              <span className="text-xs text-slate-400">|</span>
              <span className="text-xs text-slate-500">
                설계 {designCompleted}/{designTotal}
              </span>
            </>
          )}
        </div>

        {hasDesignData && (
          <div className="flex items-center gap-2 sm:w-48">
            <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-500 rounded-full"
                style={{ width: `${designProgress}%` }}
              />
            </div>
            <span className="text-[10px] font-bold text-primary whitespace-nowrap">
              {designProgress}%
            </span>
          </div>
        )}
      </div>
    </Card>
  );
}
