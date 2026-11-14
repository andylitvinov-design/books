import {NextResponse, type NextRequest} from "next/server";
import {unstable_cache} from "next/cache";
import {
  normalizeMyTubeYouTubeScope, verifiedYouTubeMatches, youtubeSearchUrl,
  type MyTubeYouTubeShelf,
} from "@/lib/video-discovery/mytube-youtube.mjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const RESPONSE_HEADERS = {"Cache-Control": "public, s-maxage=600, stale-while-revalidate=1800"};
const DISABLED_HEADERS = {"Cache-Control": "no-store"};

async function fetchYouTubeJson(url: URL) {
  const response = await fetch(url, {signal: AbortSignal.timeout(6000), cache: "no-store"});
  if (!response.ok) throw new Error("YOUTUBE_UNAVAILABLE");
  return await response.json() as unknown;
}

// Shared by all anonymous visitors with the same PUBLIC editorial query.
// No arbitrary user-entered search strings, individual IDs, session data or
// private content enters the external search or the persistent cache key.
const cachedSearch = unstable_cache(async (scopeKey: string, query: string, queryLanguage: string, shelf: MyTubeYouTubeShelf) => {
  void scopeKey; // Stable public-only key shares cache across interface locales.
  const key = process.env.YOUTUBE_DATA_API_KEY;
  if (!key) return null;
  const searchUrl = new URL("https://www.googleapis.com/youtube/v3/search");
  searchUrl.search = new URLSearchParams({
    key, part: "snippet", type: "video", q: query,
    maxResults: "50", safeSearch: "moderate", videoEmbeddable: "true",
    videoSyndicated: "true", relevanceLanguage: queryLanguage,
  }).toString();
  try {
    const search = await fetchYouTubeJson(searchUrl) as {items?: Array<{id?:{videoId?:string}}>};
    const ids = [...new Set((Array.isArray(search?.items) ? search.items : [])
      .map(item => item.id?.videoId).filter((id): id is string => Boolean(id) && /^[A-Za-z0-9_-]{11}$/.test(id!)))].slice(0, 50);
    if (!ids.length) return [];
    const detailsUrl = new URL("https://www.googleapis.com/youtube/v3/videos");
    detailsUrl.search = new URLSearchParams({key, part: "snippet,contentDetails,status", id: ids.join(",")}).toString();
    const details = await fetchYouTubeJson(detailsUrl);
    return verifiedYouTubeMatches(search, details, shelf);
  } catch {
    // Do not record provider URLs: the API key appears in query params.
    throw new Error("YOUTUBE_UNAVAILABLE");
  }
}, ["mytube-youtube-continuation-v2"], {revalidate: 86400});

export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const allowed = new Set(["shelf", "locale", "language", "category", "collection", "goal"]);
  if ([...url.searchParams.keys()].some(key => !allowed.has(key)) ||
      [...allowed].some(key => url.searchParams.getAll(key).length > 1)) {
    return NextResponse.json({error: "INVALID_FILTER"}, {status: 400, headers: DISABLED_HEADERS});
  }
  const scope = normalizeMyTubeYouTubeScope(Object.fromEntries(url.searchParams));
  if (!scope) return NextResponse.json({error: "INVALID_FILTER"}, {status: 400, headers: DISABLED_HEADERS});
  const searchUrl = youtubeSearchUrl(scope);
  const ready = process.env.HH_MYTUBE_YOUTUBE_ENABLED === "true" &&
    process.env.HH_MYTUBE_YOUTUBE_FREE_QUOTA_CONFIRMED === "true" &&
    Boolean(process.env.YOUTUBE_DATA_API_KEY);
  if (!ready) return NextResponse.json({source: "youtube", videos: [], searchUrl, mode: "fallback"},
    {headers: DISABLED_HEADERS});
  try {
    const videos = await cachedSearch(scope.key, scope.query, scope.queryLanguage, scope.shelf);
    if (videos === null) return NextResponse.json({source: "youtube", videos: [], searchUrl, mode: "fallback"},
      {headers: DISABLED_HEADERS});
    return NextResponse.json({source: "youtube", videos, searchUrl, mode: "ok"},
      {headers: RESPONSE_HEADERS});
  } catch {
    return NextResponse.json({source: "youtube", videos: [], searchUrl, mode: "fallback"},
      {headers: DISABLED_HEADERS});
  }
}
