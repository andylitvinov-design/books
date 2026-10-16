import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { BookCatalog } from "@/components/book-catalog";
import { PageVideo } from "@/components/page-video";
import { PublicConsultationCta } from "@/components/public-consultation-cta";
import { books } from "@/data/library";
import { isSupportedLocale } from "@/data/remedies";
import type { Locale } from "@/data/remedies";
import { metadataBaseFor } from "@/data/site-metadata";

type PageProps = {
  params: Promise<{ locale: string }>;
};

const meta = {
  ru: {
    title: "Библиотека книг — Holistic House",
    description: "Книги, справочники и авторские методические материалы Holistic House: оригинальные тексты, путеводитель по чтению и связанные статьи.",
  },
  en: {
    title: "Books & Library — Holistic House",
    description: "Explore books, reference materials and practical guides from the Holistic House author library, including original sources and recommended reading paths.",
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
    openGraph: { type: "website", title: current.title, description: current.description, url: "/" + locale + "/books", images: ["/images/holistic-house/books-library.webp"] },
    twitter: { card: "summary_large_image", title: current.title, description: current.description, images: ["/images/holistic-house/books-library.webp"] },
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
    </>
  );
}
