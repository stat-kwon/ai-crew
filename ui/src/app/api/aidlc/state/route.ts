import { NextResponse } from "next/server";
import { loadAidlcState } from "@/lib/data";

export async function GET() {
  try {
    const state = await loadAidlcState();
    return NextResponse.json(state);
  } catch (error) {
    console.error("Error loading aidlc state:", error);
    return NextResponse.json(
      { phases: [], rawContent: "" },
      { status: 200 }
    );
  }
}
