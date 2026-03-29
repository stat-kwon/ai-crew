import { NextRequest, NextResponse } from "next/server";
import { loadRunManifest } from "@/lib/data";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ runId: string }> }
) {
  try {
    const { runId } = await params;
    const manifest = await loadRunManifest(runId);

    if (!manifest) {
      return NextResponse.json({ error: "Run not found" }, { status: 404 });
    }

    return NextResponse.json(manifest);
  } catch (error) {
    console.error("Error loading run:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
