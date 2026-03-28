"use client";

import useSWR from "swr";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { X, Bot, Zap, GitBranch } from "lucide-react";

interface BundleDetail {
  plugin: {
    id: string;
    name: string;
    description: string;
    version: string;
  };
  defaults?: {
    model?: string;
    isolation?: string;
  };
  includes?: {
    agents?: string[];
    skills?: string[];
    commands?: string[];
  };
  graph?: {
    nodes: Array<{ id: string; type: string }>;
  };
}

const fetcher = (url: string) => fetch(url).then((res) => {
  if (!res.ok) throw new Error("API 요청 실패");
  return res.json();
});

interface BundlePreviewProps {
  bundleName: string;
  onClose: () => void;
}

export function BundlePreview({ bundleName, onClose }: BundlePreviewProps) {
  const { data, error } = useSWR<BundleDetail>(
    `/api/bundles/${bundleName}`,
    fetcher
  );

  if (error) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>오류</CardTitle>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">번들 상세 정보를 불러올 수 없습니다</p>
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <p className="text-muted-foreground">로딩 중...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>{data.plugin?.name || bundleName}</CardTitle>
          <CardDescription>{data.plugin?.description}</CardDescription>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <Badge variant="secondary">v{data.plugin?.version}</Badge>
        </div>

        {data.defaults && (
          <div>
            <h4 className="mb-2 text-sm font-medium">기본값</h4>
            <div className="space-y-1 text-sm text-muted-foreground">
              {data.defaults.model && <p>모델: {data.defaults.model}</p>}
              {data.defaults.isolation && (
                <p>격리: {data.defaults.isolation}</p>
              )}
            </div>
          </div>
        )}

        {data.includes?.agents && data.includes.agents.length > 0 && (
          <div>
            <h4 className="mb-2 flex items-center gap-2 text-sm font-medium">
              <Bot className="h-4 w-4" />
              에이전트 ({data.includes.agents.length})
            </h4>
            <div className="flex flex-wrap gap-1">
              {data.includes.agents.map((agent) => (
                <Badge key={agent} variant="outline">
                  {agent}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {data.includes?.skills && data.includes.skills.length > 0 && (
          <div>
            <h4 className="mb-2 flex items-center gap-2 text-sm font-medium">
              <Zap className="h-4 w-4" />
              스킬 ({data.includes.skills.length})
            </h4>
            <div className="flex flex-wrap gap-1">
              {data.includes.skills.map((skill) => (
                <Badge key={skill} variant="outline">
                  {skill}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {data.graph?.nodes && data.graph.nodes.length > 0 && (
          <div>
            <h4 className="mb-2 flex items-center gap-2 text-sm font-medium">
              <GitBranch className="h-4 w-4" />
              그래프 노드 ({data.graph.nodes.length})
            </h4>
            <div className="flex flex-wrap gap-1">
              {data.graph.nodes.map((node) => (
                <Badge key={node.id} variant="secondary">
                  {node.id}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
