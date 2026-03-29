import { NextResponse } from "next/server";
import { loadConfig } from "@/lib/data";

export async function GET() {
  try {
    const config = await loadConfig();
    return NextResponse.json(config);
  } catch (error) {
    console.error("Error loading config:", error);
    return NextResponse.json({}, { status: 200 });
  }
}
