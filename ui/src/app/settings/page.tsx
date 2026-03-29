"use client";

import useSWR from "swr";
import { fetchConfig } from "@/lib/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingState } from "@/components/common/LoadingState";
import { ErrorState } from "@/components/common/ErrorState";
import { EmptyState } from "@/components/common/EmptyState";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Settings } from "lucide-react";
import yaml from "js-yaml";

export default function SettingsPage() {
  const { data: config, error, isLoading } = useSWR("config", fetchConfig);

  if (error) {
    return (
      <div className="page-shell">
        <ErrorState message={error.message} />
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="page-shell">
        <LoadingState />
      </div>
    );
  }

  if (!config || Object.keys(config).length === 0) {
    return (
      <div className="page-shell">
        <header className="page-header">
          <div className="page-kicker">Configuration</div>
          <h1 className="page-title">설정</h1>
        </header>
        <EmptyState title="설정 없음" description="config.yaml 파일이 없거나 비어 있습니다." icon={<Settings className="h-7 w-7" />} />
      </div>
    );
  }

  const yamlContent = yaml.dump(config, { indent: 2 });

  return (
    <div className="page-shell">
      <header className="page-header">
        <div className="page-kicker">Configuration</div>
        <h1 className="page-title">설정</h1>
        <p className="page-description">원본 YAML과 핵심 설정 요약을 분리해 보여주며, 수정 UI 없이 운영 정보를 빠르게 확인하는 데 집중한 읽기 전용 화면입니다.</p>
      </header>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_360px]">
        <Card className="overflow-hidden">
          <CardHeader>
            <CardTitle className="text-xl flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl border border-border/70 bg-muted/45">
                <Settings className="h-5 w-5" />
              </span>
              config.yaml
            </CardTitle>
            <CardDescription>읽기 전용 — 수정하려면 직접 파일을 편집하세요.</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[620px] rounded-2xl border border-border/70 bg-muted/35 p-4">
              <pre className="text-sm font-mono leading-7 text-foreground/85">{yamlContent}</pre>
            </ScrollArea>
          </CardContent>
        </Card>

        <div className="space-y-4">
          {config.bundle && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm uppercase tracking-[0.14em] text-muted-foreground">번들</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="font-mono text-sm text-foreground">{config.bundle}</p>
              </CardContent>
            </Card>
          )}
          {config.defaults?.model && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm uppercase tracking-[0.14em] text-muted-foreground">기본 모델</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="font-mono text-sm text-foreground">{config.defaults.model}</p>
              </CardContent>
            </Card>
          )}
          {config.defaults?.locale && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm uppercase tracking-[0.14em] text-muted-foreground">언어</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="font-mono text-sm text-foreground">{config.defaults.locale}</p>
              </CardContent>
            </Card>
          )}
          {config.defaults?.runs?.retention && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm uppercase tracking-[0.14em] text-muted-foreground">런 보관 개수</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="font-mono text-sm text-foreground">{config.defaults.runs.retention}</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
