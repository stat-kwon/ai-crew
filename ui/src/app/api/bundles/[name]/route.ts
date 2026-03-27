import { NextRequest, NextResponse } from "next/server";

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ name: string }> }
) {
  try {
    const { name } = await context.params;

    // Try to use core's loadBundle if available
    try {
      const { loadBundle } = await import("ai-crew");
      const bundle = await loadBundle(name);
      return NextResponse.json(bundle);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      return NextResponse.json(
        { error: `Bundle not found: ${message}` },
        { status: 404 }
      );
    }
  } catch (error) {
    console.error("Error loading bundle:", error);
    return NextResponse.json(
      { error: "Failed to load bundle" },
      { status: 500 }
    );
  }
}
