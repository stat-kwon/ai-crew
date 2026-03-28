"use client";

import useSWR from "swr";

interface StateData {
  bundleName: string;
  intent?: string;
  phase?: string;
}

const fetcher = (url: string) => fetch(url).then((res) => (res.ok ? res.json() : null));

export function Header() {
  const { data: state } = useSWR<StateData>("/api/state", fetcher, {
    refreshInterval: 5000,
  });

  return (
    <header className="flex h-16 items-center justify-between border-b border-border bg-card px-6">
      <div className="flex items-center gap-4">
        {state?.bundleName && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">번들:</span>
            <span className="font-medium">{state.bundleName}</span>
          </div>
        )}
        {state?.phase && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">단계:</span>
            <span className="rounded-full bg-secondary px-2 py-0.5 text-xs font-medium">
              {state.phase}
            </span>
          </div>
        )}
      </div>
      <div className="flex items-center gap-2">
        {state?.intent && (
          <span className="text-sm text-muted-foreground">{state.intent}</span>
        )}
      </div>
    </header>
  );
}
