import type { PublicLocale } from "@/lib/public-locales";
import { searchSite } from "@/lib/site-search-index";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const headers = { "Cache-Control": "private, no-store", "X-Robots-Tag": "noindex, nofollow" };

export async function POST(request: Request) {
  const length = Number(request.headers.get("content-length") || 0);
  if (length > 1024) return Response.json({ results: [] }, { status: 413, headers });
  const payload: unknown = await request.json().catch(() => null);
  if (!payload || typeof payload !== "object") return Response.json({ results: [] }, { status: 400, headers });
  const { locale, query } = payload as { locale?: unknown; query?: unknown };
  if ((locale !== "en" && locale !== "ru" && locale !== "es") ||
    typeof query !== "string" || query.trim().length < 2 || query.length > 80) {
    return Response.json({ results: [] }, { status: 400, headers });
  }
  try {
    const results = await searchSite(locale as PublicLocale, query.trim());
    return Response.json({ results }, { headers });
  } catch {
    // No client-facing exception text, credentials, or raw queries in logs.
    return Response.json({ results: [], unavailable: true }, { status: 503, headers });
  }
}
