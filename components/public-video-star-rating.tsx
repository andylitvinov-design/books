"use client";

import type { PublishedSiteVideo } from "@/lib/site-videos/model";
import { CatalogStarRating, useCatalogRatings } from "@/components/catalog-star-rating";

export function PublicVideoStarRating({ video, locale }: {video:PublishedSiteVideo;locale:"en"|"ru"|"es"}) {
  // Provider-independent when a YouTube mirror has not been approved yet.
  const key = video.youtubeId || (video.heygenId ? "heygen:" + video.heygenId : "");
  const stars = useCatalogRatings("video",key ? [key] : []);
  if (!key) return null;
  return <CatalogStarRating locale={locale} summary={stars.ratings[key]} onRate={value=>stars.rate(key,value)}
    unavailable={stars.unavailable} compact/>;
}
