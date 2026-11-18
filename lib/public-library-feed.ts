import "server-only";

import { unstable_cache } from "next/cache";
import { getAppConfig } from "@/lib/app/config";
import { listPublicLibraryVideos } from "@/lib/clients/public-library-videos";
import { createArticleRepository } from "@/lib/practitioners/article-repository";
import type { LibraryPublicArticle, LibraryPublicVideo } from "@/components/library-hub";
import type { PublicLocale } from "@/lib/public-locales";

// These functions are anonymous, read-only, and strictly publication-gated.
// Cache ONLY the already-projected public snapshots, never private materials,
// authenticated accounts, draft articles, Supabase configuration or cookies.
// Locale is an explicit cache argument: RU/EN/ES never share article snapshots.
const PUBLIC_SNAPSHOT_SECONDS = 60;
const cachedPublishedVideos = unstable_cache(
  async (locale: PublicLocale): Promise<LibraryPublicVideo[]> => {
    try {
      return await listPublicLibraryVideos(getAppConfig(), locale);
    } catch {
      // An unavailable database is not permission to include unreviewed media.
      return [];
    }
  },
  ["hh-public-library-videos-v1"], { revalidate: PUBLIC_SNAPSHOT_SECONDS },
);
const cachedPublishedArticles = unstable_cache(
  async (locale: PublicLocale): Promise<LibraryPublicArticle[]> => {
    try {
      return await createArticleRepository(getAppConfig()).publicList(locale);
    } catch {
      return [];
    }
  },
  ["hh-public-library-articles-v1"], { revalidate: PUBLIC_SNAPSHOT_SECONDS },
);

/**
 * The same public snapshots feed Library and MyTube. Previous routes opened
 * fresh database transactions for every navigation (MyTube: RU + EN + ES).
 * After the first read per locale, subsequent requests reuse the bounded
 * 60-second cache without repeatedly waiting for the Supabase connection.
 * New reviewed publications become visible on cache revalidation.
 */
export async function loadPublicLibraryFeed(locale: PublicLocale): Promise<{
  videos: LibraryPublicVideo[];
  articles: LibraryPublicArticle[];
}> {
  const [videoResult, articleResult] = await Promise.allSettled([
    cachedPublishedVideos(locale),
    cachedPublishedArticles(locale),
  ]);
  return {
    videos: videoResult.status === "fulfilled" ? videoResult.value : [],
    articles: articleResult.status === "fulfilled" ? articleResult.value : [],
  };
}

/** MyTube is multilingual regardless of the interface language. Each source
 * still independently enforces status/locale/publication/YouTube URL checks.
 * Reuse the exact SAME per-locale cache as Library (no second private feed).
 */
export async function loadPublicMyTubeVideos(): Promise<LibraryPublicVideo[]> {
  const results = await Promise.allSettled(
    (["ru", "en", "es"] as const).map(locale => cachedPublishedVideos(locale)),
  );
  return results.flatMap(result => result.status === "fulfilled" ? result.value : []);
}
