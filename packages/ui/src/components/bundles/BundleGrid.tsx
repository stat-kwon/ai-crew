"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Package, GitBranch } from "lucide-react";

interface Bundle {
  name: string;
  version: string;
  description: string;
}

interface BundleGridProps {
  bundles: Bundle[];
  onSelect: (name: string) => void;
  selectedBundle?: string;
}

export function BundleGrid({
  bundles,
  onSelect,
  selectedBundle,
}: BundleGridProps) {
  if (bundles.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <p className="text-muted-foreground">
            No bundles found in the catalog.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {bundles.map((bundle) => (
        <Card
          key={bundle.name}
          className={`cursor-pointer transition-all hover:shadow-md ${
            selectedBundle === bundle.name ? "ring-2 ring-primary" : ""
          }`}
          onClick={() => onSelect(bundle.name)}
        >
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                <CardTitle className="text-lg">{bundle.name}</CardTitle>
              </div>
              <Badge variant="secondary">v{bundle.version}</Badge>
            </div>
            <CardDescription>{bundle.description}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <GitBranch className="h-4 w-4" />
              <span>Click to view details</span>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
