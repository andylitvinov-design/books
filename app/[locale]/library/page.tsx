import type { Metadata } from "next";
import { getAppConfig } from "@/lib/app/config";
import { listPublicLibraryVideos } from "@/lib/clients/material-library";
import { createArticleRepository } from "@/lib/practitioners/article-repository";
import { notFound } from "next/navigation";

import { LibraryHub, libraryCopy, type LibraryView, type LibraryPublicVideo, type LibraryPublicArticle } from "@/components/library-hub";
import { metadataBaseFor } from "@/data/site-metadata";
import { getHomeopathyLocaleParams, isSupportedLocale } from "@/data/remedies";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ view?: string | string[] }>;
};

export function generateStaticParams() {
  return getHomeopathyLocaleParams();
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!isSupportedLocale(locale)) return { title: "Not found" };
  return {
    metadataBase: metadataBaseFor(),
    title: `${libraryCopy[locale].title} — Holistic House`,
    description: { en: "Read the latest Holistic House articles, watch educational videos and explore practical guides in our regularly updated library.", ru: "Лента новых материалов Holistic House: видео, статьи, методички и практические руководства. Все публикации в одном месте.", es: "Nuevas publicaciones de Holistic House: vídeos, artículos y guías para aprender y explorar." }[locale],
    alternates: {
      canonical: `/${locale}/library`,
      languages: { en: "/en/library", ru: "/ru/library", es: "/es/library", "x-default": "/en/library" },
    },
  };
}

export default async function LibraryPage({ params, searchParams }: Props) {
  const [{ locale }, query] = await Promise.all([params, searchParams]);
  if (!isSupportedLocale(locale)) notFound();

  const rawView = Array.isArray(query.view) ? query.view[0] : query.view;
  const view: LibraryView = rawView === "videos" || rawView === "books" || rawView === "dao" ? rawView : "latest";
  let videos: LibraryPublicVideo[] = [];
  let articles: LibraryPublicArticle[] = [];
  if (view !== "books" && view !== "dao") {
    try {
      const config = getAppConfig();
      const results = await Promise.allSettled([
        listPublicLibraryVideos(config, locale),
        createArticleRepository(config).publicList(locale),
      ]);
      if (results[0].status === "fulfilled") videos = results[0].value;
      if (results[1].status === "fulfilled") articles = results[1].value;
    } catch {
      // The curated public collection stays available if app data is temporarily offline.
    }
  }
  return <LibraryHub locale={locale} view={view} publishedVideos={videos} articles={articles} />;
}
