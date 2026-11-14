import { NextRequest, NextResponse } from "next/server";
import { buildPublicVideoDiscoveryItems } from "@/components/library-hub";
import { loadPublicMyTubeVideos } from "@/lib/public-library-feed";
import { loadApprovedVideoDiscoveries } from "@/lib/video-discovery/approved-meditations";
import type { PublicLocale } from "@/lib/public-locales";

// Public-only, read-only catalog for the mobile Assist recommendation shelf.
// There is deliberately no free-text question or personal profile in this API.
export const dynamic = "force-dynamic";
export const revalidate = 0;
export async function GET(request: NextRequest) {
  const value = request.nextUrl.searchParams.get("locale");
  const locale: PublicLocale = value === "ru" || value === "es" ? value : "en";
  const [published, approved] = await Promise.all([
    loadPublicMyTubeVideos(), loadApprovedVideoDiscoveries(),
  ]);
  const items = buildPublicVideoDiscoveryItems(locale, published, approved);
  const videos = items.filter(item => item.kind === "video" &&
    typeof item.youtubeId === "string" && /^[A-Za-z0-9_-]{11}$/.test(item.youtubeId))
    .slice(0, 500)
    .map(item => ({
      id: item.id, kind: "video" as const, youtubeId: item.youtubeId,
      title: item.title, description: (item.description || "").slice(0, 240),
      image: item.image, audioLanguage: item.audioLanguage,
      topicTags: item.topicTags, lifeAreas: item.lifeAreas, directions: item.directions,
      curation: item.curation, sourceGroup: item.sourceGroup,
      durationVerifiedSeconds: item.durationVerifiedSeconds,
    }));
  return NextResponse.json({ videos }, {
    headers: { "Cache-Control": "public, max-age=0, s-maxage=120, stale-while-revalidate=300" },
  });
}
