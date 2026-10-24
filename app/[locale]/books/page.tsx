import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { BookCatalog } from "@/components/book-catalog";
import { IdeasNewsFeed } from "@/components/ideas-news-feed";
import { PageVideo } from "@/components/page-video";
import { PublicConsultationCta } from "@/components/public-consultation-cta";
import { books } from "@/data/library";
import { isSupportedLocale } from "@/data/remedies";
import type { Locale } from "@/data/remedies";
import { metadataBaseFor } from "@/data/site-metadata";

// A removed or unpublished item must not linger in a public cached feed.
export const dynamic = "force-dynamic";
export const revalidate = 0;

type PageProps = {
  params: Promise<{ locale: string }>;
};

const meta = {
  ru: {
    title: "Идеи и коучинг — бесплатная сессия, Дао и книги | Holistic House",
    description: "Выберите бесплатную самостоятельную коуч-сессию или даосскую подсказку. Ниже — афоризмы, книги и методички Holistic House.",
  },
  en: {
    title: "Ideas & Coaching — free sessions, insights & books | Holistic House",
    description: "Choose a free self-guided coaching session or Taoist insight, then explore aphorisms and the Holistic House book library.",
  },
} as const;

export function generateStaticParams() {
  return [{ locale: "ru" }, { locale: "en" }];
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  if (!isSupportedLocale(locale)) return { title: "Not found" };
  const current = meta[locale];
  return {
    metadataBase: metadataBaseFor(),
    title: current.title,
    description: current.description,
    alternates: {
      canonical: "/" + locale + "/books",
      languages: { ru: "/ru/books", en: "/en/books", es: "/es/books", "x-default": "/en/books" },
    },
  };
}

export default async function LocalizedBooksPage({ params }: PageProps) {
  const { locale } = await params;
  if (!isSupportedLocale(locale)) notFound();

  return (
    <>
      <BookCatalog
        books={books}
        locale={locale as Locale}
        video={<PageVideo slot="books-intro" locale={locale} />}
      />
      <PublicConsultationCta locale={locale as Locale} />
      <IdeasNewsFeed locale={locale as Locale} />
    </>
  );
}
