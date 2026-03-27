"use client";

import { useEffect } from "react";
import "@cloudscape-design/global-styles/index.css";

interface CloudscapeProviderProps {
  children: React.ReactNode;
}

export function CloudscapeProvider({ children }: CloudscapeProviderProps) {
  useEffect(() => {
    // Apply Cloudscape visual mode
    document.body.classList.add("awsui-visual-refresh");
  }, []);

  return <>{children}</>;
}
