"use client";

import { Sidebar } from "./Sidebar";
import { TopNav } from "./TopNav";

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="min-h-screen bg-[#f1f5f9]">
      <Sidebar />
      <TopNav />
      <main className="ml-64 pt-20 p-6 min-h-screen">
        {children}
      </main>

      {/* Decorative Background Glow */}
      <div className="fixed top-[-10%] right-[-5%] w-[40%] h-[40%] bg-primary/5 blur-[120px] pointer-events-none -z-10" />
      <div className="fixed bottom-[-10%] left-[20%] w-[30%] h-[30%] bg-indigo-500/5 blur-[100px] pointer-events-none -z-10" />
    </div>
  );
}
