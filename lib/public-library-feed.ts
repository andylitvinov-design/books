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


/** MyTube is multilingual regardless of the interface language. Public
 * publication gates remain enforced by listPublicLibraryVideos for each locale.
 * Fail each locale independently so one unavailable source cannot hide the rest.
 * Private client media never enters this read-only discovery feed.
 */
export async function loadPublicMyTubeVideos(): Promise<LibraryPublicVideo[]> {
  try {
    const config = getAppConfig();
    const results = await Promise.allSettled(
      (["ru", "en", "es"] as const).map(language => listPublicLibraryVideos(config, language)),
    );
    return results.flatMap(result => result.status === "fulfilled" ? result.value : []);
  } catch {
    return [];
  }
}
