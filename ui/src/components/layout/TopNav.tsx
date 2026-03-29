"use client";

import { usePathname } from "next/navigation";

const pageTitles: Record<string, string> = {
  "/": "대시보드",
  "/docs": "설계 문서",
  "/team": "팀 편집",
  "/preflight": "환경 점검",
  "/develop": "개발 진행",
  "/bundles": "팀 템플릿",
  "/settings": "설정",
};

export function TopNav() {
  const pathname = usePathname();
  const title = pageTitles[pathname] || "AI-Crew Studio";

  return (
    <header className="fixed top-0 right-0 left-64 h-16 z-30 bg-[#f6fafe]/80 backdrop-blur-md flex justify-between items-center px-8 font-[var(--font-body)] text-sm font-medium border-b border-slate-100">
      <div className="flex items-center gap-4">
        <h2 className="text-lg font-bold text-slate-900 font-[var(--font-headline)]">{title}</h2>
      </div>

      <div className="flex items-center gap-6">
        {/* Search */}
        <div className="flex items-center bg-slate-50 px-4 py-2 rounded-xl w-72 border border-slate-100">
          <span className="material-symbols-outlined text-slate-400 mr-2 text-lg">search</span>
          <input
            className="bg-transparent border-none focus:ring-0 focus:outline-none text-sm w-full p-0 placeholder:text-slate-400"
            placeholder="검색..."
            type="text"
          />
        </div>

        {/* Actions */}
        <div className="flex items-center gap-4 text-slate-500">
          <button className="hover:text-primary transition-colors flex items-center">
            <span className="material-symbols-outlined">notifications</span>
          </button>
          <button className="hover:text-primary transition-colors flex items-center">
            <span className="material-symbols-outlined">help_outline</span>
          </button>
          <span className="text-slate-300">|</span>
          <a
            href="https://github.com/anthropics/claude-code"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-primary transition-colors text-xs font-medium"
          >
            문서 보기
          </a>
        </div>

        {/* User Profile */}
        <div className="flex items-center gap-3 border-l border-slate-200 pl-6">
          <div className="text-right hidden lg:block">
            <p className="text-xs font-bold text-slate-900">개발자</p>
            <p className="text-[10px] text-slate-500">ai-crew.local</p>
          </div>
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary to-primary-container flex items-center justify-center text-white font-bold text-sm">
            AC
          </div>
        </div>
      </div>
    </header>
  );
}
