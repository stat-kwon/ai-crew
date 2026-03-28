"use client";

import { useState } from "react";
import useSWR, { mutate } from "swr";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface Bundle {
  name: string;
  version: string;
  description: string;
}

interface BundleDetails {
  name: string;
  version: string;
  description: string;
  agents?: string[];
  skills?: string[];
  hooks?: string[];
  workflow?: string;
  graph?: {
    nodes: Array<{ id: string; type: string }>;
  };
}

interface BundlesResponse {
  bundles: Bundle[];
}

interface ConfigData {
  bundle?: string;
}

const fetcher = (url: string) => fetch(url).then((res) => (res.ok ? res.json() : null));

const bundleIcons: Record<string, string> = {
  fullstack: "groups",
  standard: "code",
  tdd: "science",
  advanced: "security",
  lightweight: "bolt",
  enterprise: "account_tree",
};

const bundleLabels: Record<string, { text: string; color: string }> = {
  fullstack: { text: "풀스택", color: "bg-primary text-white" },
  standard: { text: "표준", color: "bg-slate-200 text-slate-600" },
  tdd: { text: "테스트 주도", color: "bg-secondary-container text-on-secondary-container" },
  advanced: { text: "보안 포함", color: "bg-rose-100 text-rose-700" },
  lightweight: { text: "빠른 시작", color: "bg-amber-100 text-amber-700" },
  enterprise: { text: "엔터프라이즈", color: "bg-slate-800 text-white" },
};

export default function BundlesPage() {
  const [selectedBundle, setSelectedBundle] = useState<string | null>(null);
  const [filterText, setFilterText] = useState("");
  const [applying, setApplying] = useState(false);
  const [applySuccess, setApplySuccess] = useState(false);
  const [applyError, setApplyError] = useState<string | null>(null);

  const { data: bundlesData } = useSWR<BundlesResponse>("/api/bundles", fetcher);
  const { data: configData } = useSWR<ConfigData>("/api/config", fetcher);
  const { data: bundleDetails, isLoading: detailsLoading } = useSWR<BundleDetails>(
    selectedBundle ? `/api/bundles/${selectedBundle}` : null,
    fetcher
  );

  const bundles = bundlesData?.bundles || [];
  const currentBundle = configData?.bundle;
  const filteredBundles = bundles.filter(
    (b) =>
      b.name.toLowerCase().includes(filterText.toLowerCase()) ||
      b.description.toLowerCase().includes(filterText.toLowerCase())
  );

  const handleApplyBundle = async (bundleName: string) => {
    setApplying(true);
    setApplyError(null);
    setApplySuccess(false);

    try {
      const response = await fetch(`/api/bundles/${bundleName}/apply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || "적용에 실패했습니다");
      }

      setApplySuccess(true);
      mutate("/api/graph");
      mutate("/api/config");
      mutate("/api/state");
    } catch (err) {
      setApplyError(err instanceof Error ? err.message : "적용에 실패했습니다");
    } finally {
      setApplying(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-4xl font-extrabold text-slate-900 tracking-tight mb-2 font-[var(--font-headline)]">
            번들 목록
          </h2>
          <p className="text-lg text-slate-500 font-medium">프로젝트에 맞는 에이전트 팀 구성을 선택하세요</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="relative">
            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
              search
            </span>
            <Input
              className="pl-12 w-64"
              placeholder="번들 검색..."
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Alerts */}
      {applySuccess && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-emerald-600 filled">check_circle</span>
            <p className="text-sm font-medium text-emerald-700">번들이 성공적으로 적용되었습니다.</p>
          </div>
          <button onClick={() => setApplySuccess(false)} className="text-emerald-600 hover:text-emerald-700">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
      )}

      {applyError && (
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-rose-600 filled">error</span>
            <p className="text-sm font-medium text-rose-700">{applyError}</p>
          </div>
          <button onClick={() => setApplyError(null)} className="text-rose-600 hover:text-rose-700">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
      )}

      {/* Bundle Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {filteredBundles.length === 0 ? (
          <div className="col-span-full text-center py-16 text-slate-400">
            <span className="material-symbols-outlined text-6xl mb-4">inventory_2</span>
            <p className="text-lg font-medium">사용 가능한 번들이 없습니다</p>
          </div>
        ) : (
          filteredBundles.map((bundle) => {
            const isActive = bundle.name === currentBundle;
            const isSelected = bundle.name === selectedBundle;
            const icon = bundleIcons[bundle.name] || "package_2";
            const labelConfig = bundleLabels[bundle.name] || { text: bundle.name, color: "bg-slate-100 text-slate-600" };
            const nodeCount = bundleDetails?.graph?.nodes?.length || (isSelected ? "..." : "?");

            return (
              <Card
                key={bundle.name}
                className={`p-8 relative overflow-hidden transition-all cursor-pointer ${
                  isActive
                    ? "border-primary/30 card-shadow"
                    : isSelected
                      ? "border-primary/20 ring-2 ring-primary/10"
                      : "hover:shadow-md hover:-translate-y-0.5"
                }`}
                onClick={() => setSelectedBundle(bundle.name)}
              >
                {isActive && <div className="absolute top-0 left-0 w-1.5 h-full bg-primary" />}

                <div className="flex justify-between items-start mb-6">
                  <div>
                    <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-3 inline-block ${labelConfig.color}`}>
                      {isActive ? "사용 중" : labelConfig.text}
                    </span>
                    <h3 className="text-2xl font-bold text-slate-900">{bundle.name}</h3>
                  </div>
                  <div className="text-right">
                    <span className={`font-bold block text-lg leading-none ${isActive ? "text-primary" : "text-slate-500"}`}>
                      {isSelected && bundleDetails ? bundleDetails.graph?.nodes?.length || 0 : "?"} 노드
                    </span>
                    <span className="text-[10px] text-slate-400 font-bold uppercase">v{bundle.version}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 mb-8 py-4 px-3 bg-slate-50 rounded-lg">
                  <span className={`material-symbols-outlined text-sm ${isActive ? "text-primary" : "text-slate-400"}`}>
                    {icon}
                  </span>
                  <div className="flex-1 h-px bg-slate-200" />
                  <span className={`w-3 h-3 rounded-full ${isActive ? "bg-primary" : "bg-slate-300"}`} />
                </div>

                <p className="text-slate-500 text-sm mb-10 leading-relaxed line-clamp-2">{bundle.description}</p>

                {isActive ? (
                  <Button className="w-full" disabled>
                    <span className="material-symbols-outlined mr-1 filled">check_circle</span>
                    현재 사용중
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleApplyBundle(bundle.name);
                    }}
                    disabled={applying}
                  >
                    {applying ? (
                      <>
                        <span className="material-symbols-outlined animate-spin mr-1">progress_activity</span>
                        적용 중...
                      </>
                    ) : (
                      "적용하기"
                    )}
                  </Button>
                )}
              </Card>
            );
          })
        )}
      </div>

      {/* Bundle Details Panel */}
      {selectedBundle && bundleDetails && (
        <Card className="p-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-2xl font-bold text-slate-900">{bundleDetails.name}</h3>
              <p className="text-sm text-slate-500 mt-1">{bundleDetails.description}</p>
            </div>
            <Button onClick={() => handleApplyBundle(selectedBundle)} disabled={applying || selectedBundle === currentBundle}>
              {selectedBundle === currentBundle ? "현재 사용중" : "이 번들 적용"}
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Agents */}
            {bundleDetails.agents && bundleDetails.agents.length > 0 && (
              <div>
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">에이전트</h4>
                <div className="flex flex-wrap gap-2">
                  {bundleDetails.agents.map((agent) => (
                    <Badge key={agent} variant="default" size="sm">
                      {agent}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Skills */}
            {bundleDetails.skills && bundleDetails.skills.length > 0 && (
              <div>
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">스킬</h4>
                <div className="flex flex-wrap gap-2">
                  {bundleDetails.skills.map((skill) => (
                    <Badge key={skill} variant="secondary" size="sm">
                      {skill}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Graph Nodes */}
            {bundleDetails.graph?.nodes && (
              <div>
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">그래프 노드</h4>
                <div className="flex flex-wrap gap-2">
                  {bundleDetails.graph.nodes.map((node) => (
                    <Badge
                      key={node.id}
                      size="sm"
                      variant={node.type === "worker" ? "default" : node.type === "aggregator" ? "success" : "warning"}
                    >
                      {node.id}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Featured Banner */}
      <div className="rounded-2xl bg-gradient-to-br from-primary to-primary-container p-12 text-white flex flex-col md:flex-row items-center gap-12 overflow-hidden relative">
        <div className="relative z-10 flex-1">
          <h3 className="text-3xl font-extrabold mb-4">나만의 맞춤형 번들이 필요하신가요?</h3>
          <p className="text-lg opacity-90 mb-8 max-w-lg">
            에이전트 노드 구성부터 워크플로우 로직까지, 당신의 프로젝트에 최적화된 AI 팀을 직접 설계해보세요.
          </p>
          <Button variant="secondary" size="lg" className="bg-white text-primary hover:bg-slate-50">
            커스텀 스튜디오 열기
          </Button>
        </div>
        <div className="relative z-10 w-full md:w-1/3">
          <div className="aspect-square rounded-xl bg-white/10 flex items-center justify-center">
            <span className="material-symbols-outlined text-white/50" style={{ fontSize: "120px" }}>
              dashboard_customize
            </span>
          </div>
        </div>
        <div className="absolute -right-20 -bottom-20 w-96 h-96 bg-white/10 rounded-full blur-3xl" />
      </div>
    </div>
  );
}
