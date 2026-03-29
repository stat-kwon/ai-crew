import { NextResponse } from "next/server";
import { loadAidlcDocs } from "@/lib/data";

export async function GET() {
  try {
    const docs = await loadAidlcDocs();
    return NextResponse.json(docs);
  } catch (error) {
    console.error("Error loading aidlc docs:", error);
    return NextResponse.json([], { status: 200 });
  }
}
