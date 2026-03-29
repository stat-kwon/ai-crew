"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

interface TopBarProps {
  onSettingsOpen: () => void;
}

interface TabItem {
  href: string;
  label: string;
  icon: string;
}

const tabs: TabItem[] = [
  { href: "/", label: "타임라인", icon: "timeline" },
  { href: "/docs", label: "설계 문서", icon: "description" },
];

export function TopBar({ onSettingsOpen }: TopBarProps) {
  const pathname = usePathname();

  function isTabActive(href: string): boolean {
    if (href === "/") {
      return pathname === "/" || pathname.startsWith("/runs");
    }
    return pathname.startsWith(href);
  }

  return (
    <header className="sticky top-0 z-40 flex h-14 w-full items-center justify-between border-b border-slate-200 bg-white px-6 font-[var(--font-headline)]">
      {/* Left: Logo */}
      <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-white">
          <span className="material-symbols-outlined filled text-xl">
            diamond
          </span>
        </div>
        <div>
          <h1 className="text-lg font-bold tracking-tighter text-slate-900">
            AI-Crew Studio
          </h1>
          <p className="text-[10px] font-medium uppercase tracking-widest text-slate-500">
            The Cognitive Architect
          </p>
        </div>
      </div>

      {/* Center: Tabs */}
      <nav className="flex items-center gap-1" aria-label="메인 네비게이션">
        {tabs.map((tab) => {
          const active = isTabActive(tab.href);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                "flex items-center gap-1.5 px-4 py-3.5 text-sm transition-colors",
                active
                  ? "border-b-2 border-primary font-bold text-primary"
                  : "border-b-2 border-transparent text-slate-500 hover:text-slate-700"
              )}
              aria-current={active ? "page" : undefined}
            >
              <span
                className={cn(
                  "material-symbols-outlined text-lg",
                  active && "filled"
                )}
              >
                {tab.icon}
              </span>
              {tab.label}
            </Link>
          );
        })}
      </nav>

      {/* Right: Settings */}
      <button
        onClick={onSettingsOpen}
        className="flex items-center rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-primary"
        aria-label="설정 열기"
        data-testid="settings-toggle"
      >
        <span className="material-symbols-outlined">settings</span>
      </button>
    </header>
  );
}
