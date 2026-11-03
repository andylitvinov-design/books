import "server-only";

import { getAppConfig } from "@/lib/app/config";
import { listPublicLibraryVideos } from "@/lib/clients/material-library";
import { createArticleRepository } from "@/lib/practitioners/article-repository";
import type { LibraryPublicArticle, LibraryPublicVideo } from "@/components/library-hub";
import type { PublicLocale } from "@/lib/public-locales";

/** Read only deliberately public, published content; never query private client media here. */
export async function loadPublicLibraryFeed(locale: PublicLocale): Promise<{
  videos: LibraryPublicVideo[];
  articles: LibraryPublicArticle[];
}> {
  let videos: LibraryPublicVideo[] = [];
  let articles: LibraryPublicArticle[] = [];
  try {
    const config = getAppConfig();
    const [videoResult, articleResult] = await Promise.allSettled([
      listPublicLibraryVideos(config, locale),
      createArticleRepository(config).publicList(locale),
    ]);
    if (videoResult.status === "fulfilled") videos = videoResult.value;
    if (articleResult.status === "fulfilled") articles = articleResult.value;
  } catch {
    // Both pages retain the existing curated public items if a data source is unavailable.
  }
  return { videos, articles };
}
