import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { LibraryHub, libraryCopy, type LibraryView } from "@/components/library-hub";
import { metadataBaseFor } from "@/data/site-metadata";
import { getHomeopathyLocaleParams, isSupportedLocale } from "@/data/remedies";

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
    description: libraryCopy[locale].lead,
    alternates: {
      canonical: `/${locale}/library`,
      languages: { en: "/en/library", ru: "/ru/library", es: "/es/library" },
    },
  };
}

export default async function LibraryPage({ params, searchParams }: Props) {
  const [{ locale }, query] = await Promise.all([params, searchParams]);
  if (!isSupportedLocale(locale)) notFound();

  const rawView = Array.isArray(query.view) ? query.view[0] : query.view;
  const view: LibraryView = rawView === "videos" ? "videos" : "books";

  return <LibraryHub locale={locale} view={view} />;
}
