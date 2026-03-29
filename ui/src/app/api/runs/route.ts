import { NextResponse } from "next/server";
import { loadRegistry } from "@/lib/data";

export async function GET() {
  try {
    const registry = await loadRegistry();
    return NextResponse.json(registry);
  } catch (error) {
    console.error("Error loading runs:", error);
    return NextResponse.json(
      {
        schema: "ai-crew.runs.v1",
        current: null,
        runs: [],
        stats: { totalRuns: 0, totalCompleted: 0, totalFailed: 0 },
      },
      { status: 200 }
    );
  }
}
