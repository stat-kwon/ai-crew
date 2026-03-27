import { NextResponse } from "next/server";
import { join } from "path";
import { existsSync } from "fs";

export async function GET() {
  try {
    const { listBundles, getCatalogDir } = await import("ai-crew");

    // First try default getCatalogDir
    let bundles = await listBundles();

    // If empty, fallback to known workspace paths
    if (bundles.length === 0) {
      const fallbackPaths = [
        // pnpm workspace symlink path
        join(process.cwd(), "node_modules", "ai-crew", "catalog", "bundles"),
        // Direct package path
        join(process.cwd(), "..", "core", "catalog", "bundles"),
        // Root workspace path
        join(process.cwd(), "..", "..", "catalog", "bundles"),
      ];

      for (const bundlesDir of fallbackPaths) {
        if (existsSync(bundlesDir)) {
          bundles = await listBundles(bundlesDir);
          if (bundles.length > 0) break;
        }
      }
    }

    return NextResponse.json({ bundles });
  } catch (error) {
    console.error("Error listing bundles:", error);
    return NextResponse.json(
      { error: "Failed to list bundles", details: String(error) },
      { status: 500 }
    );
  }
}
