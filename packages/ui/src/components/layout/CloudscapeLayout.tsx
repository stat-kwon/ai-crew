"use client";

import { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import useSWR from "swr";
import AppLayout from "@cloudscape-design/components/app-layout";
import SideNavigation, {
  type SideNavigationProps,
} from "@cloudscape-design/components/side-navigation";
import TopNavigation from "@cloudscape-design/components/top-navigation";
import Badge from "@cloudscape-design/components/badge";
import SpaceBetween from "@cloudscape-design/components/space-between";
import Box from "@cloudscape-design/components/box";

interface StateData {
  bundleName: string;
  intent?: string;
  phase?: string;
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

const navItems: SideNavigationProps.Item[] = [
  { type: "link", text: "Dashboard", href: "/" },
  { type: "link", text: "Inception", href: "/inception" },
  { type: "link", text: "Graph", href: "/graph" },
  { type: "link", text: "Runs", href: "/runs" },
  { type: "link", text: "Bundles", href: "/bundles" },
  { type: "link", text: "Config", href: "/config" },
  { type: "divider" },
  { type: "link", text: "Preflight", href: "/preflight" },
];

export function CloudscapeLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [navigationOpen, setNavigationOpen] = useState(true);
  const { data: state } = useSWR<StateData>("/api/state", fetcher, {
    refreshInterval: 5000,
  });

  const handleNavigate = (
    e: CustomEvent<SideNavigationProps.FollowDetail>
  ) => {
    e.preventDefault();
    router.push(e.detail.href);
  };

  return (
    <div style={{ minHeight: "100vh" }}>
      <TopNavigation
        identity={{
          href: "/",
          title: "AI-Crew",
          onFollow: (e) => {
            e.preventDefault();
            router.push("/");
          },
        }}
        utilities={[
          ...(state?.bundleName
            ? [
                {
                  type: "button" as const,
                  text: `Bundle: ${state.bundleName}`,
                  variant: "link" as const,
                },
              ]
            : []),
          ...(state?.phase
            ? [
                {
                  type: "button" as const,
                  text: `Phase: ${state.phase}`,
                  variant: "link" as const,
                },
              ]
            : []),
        ]}
      />
      <AppLayout
        navigation={
          <SideNavigation
            header={{ text: "Navigation", href: "/" }}
            items={navItems}
            activeHref={pathname}
            onFollow={handleNavigate}
          />
        }
        navigationOpen={navigationOpen}
        onNavigationChange={({ detail }) => setNavigationOpen(detail.open)}
        toolsHide
        content={children}
        headerSelector="#h"
        contentType="default"
      />
    </div>
  );
}
