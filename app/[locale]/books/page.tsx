import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { BookCatalog } from "@/components/book-catalog";
import { books } from "@/data/library";
import { isSupportedLocale } from "@/data/remedies";
import type { Locale } from "@/data/remedies";
import { metadataBaseFor } from "@/data/site-metadata";

type PageProps = { params: Promise<{ locale: string }> };

const meta = {
  ru: {
    title: "Библиотека книг — Holistic House",
    description: "Книги, справочные материалы и опубликованные тексты Holistic House.",
  },
  en: {
    title: "Books & Library — Holistic House",
    description: "Books, reference materials, and published Holistic House texts.",
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
      languages: { ru: "/ru/books", en: "/en/books" },
    },
  };
}

export default async function LocalizedBooksPage({ params }: PageProps) {
  const { locale } = await params;
  if (!isSupportedLocale(locale)) notFound();
  return <BookCatalog books={books} locale={locale as Locale} />;
}
