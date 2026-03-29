import { NextResponse } from "next/server";
import { loadGraphState, loadGraphDefinition, loadScratchpads } from "@/lib/data";
import type { CurrentStateResponse } from "@/types";

export async function GET() {
  try {
    const [state, graph, scratchpads] = await Promise.all([
      loadGraphState(),
      loadGraphDefinition(),
      loadScratchpads(),
    ]);

    const response: CurrentStateResponse = {
      state,
      graph,
      runId: state?.runId ?? null,
      scratchpads,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error loading current state:", error);
    return NextResponse.json(
      {
        state: null,
        graph: null,
        runId: null,
        scratchpads: {},
      } satisfies CurrentStateResponse,
      { status: 200 }
    );
  }
}
