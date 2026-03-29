import { NextRequest, NextResponse } from "next/server";
import { loadAidlcDocContent } from "@/lib/data";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const { path: pathSegments } = await params;
    const decodedPath = pathSegments.map((segment) => decodeURIComponent(segment)).join("/");
    const content = await loadAidlcDocContent(decodedPath);

    if (!content) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    return NextResponse.json({ path: decodedPath, content });
  } catch (error) {
    console.error("Error loading aidlc doc:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
