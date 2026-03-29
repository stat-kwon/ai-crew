"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Activity, History, FileText, Settings, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
  description: string;
}

const navItems: NavItem[] = [
  { href: "/", label: "홈", icon: Home, description: "프로젝트 개요" },
  { href: "/current", label: "현재 상태", icon: Activity, description: "실행 흐름 추적" },
  { href: "/history", label: "히스토리", icon: History, description: "런 스냅샷 탐색" },
  { href: "/docs", label: "설계 문서", icon: FileText, description: "최신 AI-DLC 문서" },
  { href: "/settings", label: "설정", icon: Settings, description: "읽기 전용 구성" },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-80 shrink-0 border-r border-sidebar-border/80 bg-sidebar/92 backdrop-blur xl:flex xl:flex-col">
      <div className="px-6 pt-6">
        <div className="panel-surface overflow-hidden rounded-[28px] bg-sidebar px-5 py-5 shadow-none">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/80 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5" />
            Studio Console
          </div>
          <h1 className="text-[22px] font-semibold tracking-tight text-sidebar-foreground">AI-Crew Studio</h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            CLI 중심 워크플로를 해치지 않으면서 현재 상태와 과거 변화를 빠르게 읽는 프로젝트 메모리 뷰어.
          </p>
        </div>
      </div>

      <nav className="flex-1 px-4 py-6">
        <div className="mb-3 px-3 text-[11px] font-medium uppercase tracking-[0.2em] text-muted-foreground">
          Navigation
        </div>
        <ul className="space-y-2">
          {navItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
            const Icon = item.icon;

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-label={item.label}
                  className={cn(
                    "group flex items-center gap-3 rounded-2xl border px-3.5 py-3 transition-all",
                    isActive
                      ? "border-sidebar-primary/15 bg-primary/95 text-sidebar-primary-foreground shadow-sm"
                      : "border-transparent text-sidebar-foreground hover:border-border/80 hover:bg-background/85"
                  )}
                >
                  <div
                    className={cn(
                      "flex h-10 w-10 items-center justify-center rounded-xl border transition-colors",
                      isActive
                        ? "border-white/10 bg-white/10"
                        : "border-border/70 bg-muted/45 text-muted-foreground group-hover:bg-background"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium tracking-tight">{item.label}</div>
                    <div className={cn("truncate text-xs", isActive ? "text-sidebar-primary-foreground/70" : "text-muted-foreground")}>
                      {item.description}
                    </div>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="px-6 pb-6 pt-2">
        <div className="panel-subtle px-4 py-4">
          <div className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">Workspace mode</div>
          <div className="mt-2 text-sm font-medium text-sidebar-foreground">읽기 전용 관찰 모드</div>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            UI는 실행 상태와 문서 스냅샷만 보여주며, 원본 파일은 직접 수정하지 않습니다.
          </p>
        </div>
      </div>
    </aside>
  );
}
