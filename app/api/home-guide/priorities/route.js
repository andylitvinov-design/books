import { NextResponse } from "next/server";
import { getAppConfig } from "@/lib/app/config";
import { getHomeGuidePriorities } from "@/lib/app/home-guide-quality";

export const runtime = "nodejs";
export const preferredRegion = "yul1";
export const dynamic = "force-dynamic";
export const revalidate = 0;

// Read-only aggregate; no chat message, account, query text, or small counts.
const HEADERS = {
  "Cache-Control": "public, max-age=300, s-maxage=3600",
  "X-Robots-Tag": "noindex, nofollow",
  "X-Content-Type-Options": "nosniff",
};
export async function GET() {
  try {
    const categories = await getHomeGuidePriorities(getAppConfig());
    return NextResponse.json({ categories }, { headers: HEADERS });
  } catch {
    // Fallback to curated static ordering. Never report backend internals.
    return NextResponse.json({ categories: [] }, { headers: HEADERS });
  }
}
