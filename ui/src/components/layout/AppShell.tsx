"use client";

import { useState } from "react";
import { TopBar } from "./TopBar";
import { SettingsDrawer } from "./SettingsDrawer";

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  return (
    <div className="flex min-h-screen flex-col bg-[#f1f5f9]">
      <TopBar onSettingsOpen={() => setIsSettingsOpen(true)} />
      <main className="flex-1 p-6">{children}</main>
      <SettingsDrawer
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />

      {/* Decorative Background Glow */}
      <div className="fixed top-[-10%] right-[-5%] w-[40%] h-[40%] bg-primary/5 blur-[120px] pointer-events-none -z-10" />
      <div className="fixed bottom-[-10%] left-[20%] w-[30%] h-[30%] bg-indigo-500/5 blur-[100px] pointer-events-none -z-10" />
    </div>
  );
}
