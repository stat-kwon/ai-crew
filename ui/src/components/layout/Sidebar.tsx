"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import useSWR from "swr";
import { cn } from "@/lib/utils";

interface NavItem {
  href: string;
  label: string;
  icon: string;
}

const navItems: NavItem[] = [
  { href: "/", label: "대시보드", icon: "dashboard" },
  { href: "/design", label: "설계 단계", icon: "architecture" },
  { href: "/team", label: "팀 편집", icon: "group_add" },
  { href: "/preflight", label: "환경 점검", icon: "fact_check" },
  { href: "/develop", label: "개발 진행", icon: "engineering" },
  { href: "/bundles", label: "팀 템플릿", icon: "dashboard_customize" },
  { href: "/settings", label: "설정", icon: "settings" },
];

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function Sidebar() {
  const pathname = usePathname();
  const { data: config } = useSWR("/api/config", fetcher);
  const bundleName = config?.bundle || "미설정";

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 z-40 bg-white border-r border-slate-200 flex flex-col py-6 font-[var(--font-headline)] antialiased tracking-tight">
      {/* Logo */}
      <div className="px-6 mb-8 flex items-center gap-2">
        <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-white">
          <span className="material-symbols-outlined text-xl filled">diamond</span>
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tighter">AI-Crew Studio</h1>
          <p className="text-[10px] text-slate-500 font-medium uppercase tracking-widest">The Cognitive Architect</p>
        </div>
      </div>

      {/* CTA Button */}
      <div className="px-4 mb-6">
        <Link
          href="/bundles"
          className="w-full bg-gradient-to-br from-primary to-primary-container text-white py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 active:scale-[0.98] transition-all shadow-lg shadow-primary/20 hover:opacity-90"
        >
          <span className="material-symbols-outlined text-lg">add</span>
          신규 프로젝트
        </Link>
      </div>

      {/* Nav Section Label */}
      <div className="px-6 mb-2">
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">개발 흐름</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-0.5">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/" && pathname.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-4 py-3 transition-all",
                isActive
                  ? "bg-indigo-50/50 text-indigo-600 border-l-[3px] border-indigo-600 font-semibold"
                  : "text-slate-600 hover:bg-slate-50 border-l-[3px] border-transparent"
              )}
            >
              <span
                className={cn(
                  "material-symbols-outlined text-xl",
                  isActive && "filled"
                )}
              >
                {item.icon}
              </span>
              <span className="text-sm">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Footer Badge */}
      <div className="mt-auto px-4 pt-4 border-t border-slate-100">
        <div className="flex items-center gap-3 px-4 py-2 bg-slate-50 rounded-full">
          <span className="material-symbols-outlined text-primary">groups</span>
          <span className="text-xs font-semibold text-slate-700">{bundleName}</span>
        </div>
      </div>
    </aside>
  );
}
