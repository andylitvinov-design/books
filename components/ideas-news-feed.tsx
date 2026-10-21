import Link from "next/link";
import { ArrowRight, Newspaper } from "lucide-react";

import { LibraryFeed } from "@/components/library-feed";
import { buildLibraryFeedItems } from "@/components/library-hub";
import { loadPublicLibraryFeed } from "@/lib/public-library-feed";
import type { PublicLocale } from "@/lib/public-locales";

const copy = {
  en: {
    eyebrow: "HOLISTIC HOUSE JOURNAL",
    heading: "Latest posts and videos",
    description: "Fresh published articles and videos, followed by selected educational materials. Explore the stream, search topics or open a video right here.",
    all: "See the full library feed",
  },
  ru: {
    eyebrow: "ЖУРНАЛ HOLISTIC HOUSE",
    heading: "Лента публикаций и видео",
    description: "Новые статьи и опубликованные видео, затем подборка полезных материалов. Ищите темы, смотрите видео и открывайте публикации прямо здесь.",
    all: "Вся лента библиотеки",
  },
  es: {
    eyebrow: "REVISTA HOLISTIC HOUSE",
    heading: "Publicaciones y vídeos recientes",
    description: "Nuevos artículos y vídeos publicados, seguidos de materiales educativos seleccionados. Busca temas y abre los vídeos aquí mismo.",
    all: "Ver todas las publicaciones",
  },
} as const;

export async function IdeasNewsFeed({ locale }: { locale: PublicLocale }) {
  const { videos, articles } = await loadPublicLibraryFeed(locale);
  const { feedItems } = buildLibraryFeedItems(locale, videos, articles);
  const text = copy[locale];

  return (
    <section
      id="latest-publications"
      aria-labelledby="ideas-news-title"
      className="mx-auto mb-10 mt-8 w-[calc(100%-24px)] max-w-5xl rounded-[22px] border border-teal-100 bg-gradient-to-b from-[#f0faf8] via-white to-[#f8fcfb] px-3 py-6 shadow-sm sm:px-8 sm:py-9"
      lang={locale}
    >
      <header className="mx-auto mb-5 flex max-w-[780px] flex-wrap items-end justify-between gap-3">
        <div className="max-w-xl">
          <p className="mb-2 flex items-center gap-2 text-[11px] font-bold tracking-[.11em] text-teal-700">
            <Newspaper size={15} aria-hidden="true" /> {text.eyebrow}
          </p>
          <h2 id="ideas-news-title" className="font-serif text-[clamp(26px,4vw,36px)] leading-tight text-[#184b4b]">
            {text.heading}
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-[#54716d]">{text.description}</p>
        </div>
        <Link href={"/" + locale + "/library"} className="inline-flex min-h-10 items-center gap-2 rounded-full border border-teal-200 bg-white px-4 text-xs font-bold text-teal-800 hover:bg-teal-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600">
          {text.all}<ArrowRight size={15} aria-hidden="true" />
        </Link>
      </header>
      <LibraryFeed locale={locale} items={feedItems} timeline />
    </section>
  );
}
