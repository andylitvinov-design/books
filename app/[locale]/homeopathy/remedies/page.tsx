import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { RemedyDirectory } from "@/components/remedy-directory";
import { PublicSiteHeader } from "@/components/public-site-header";
import { getHomeopathyLocaleParams, getRemedyDirectory, isSupportedLocale } from "@/data/remedies";
import type { Locale } from "@/data/remedies";
import { metadataBaseFor } from "@/data/site-metadata";

type PageProps = { params: Promise<{ locale: string }> };

const copy = {
  ru: { title: "Все препараты — Holistic House", description: "Поисковый и алфавитный указатель 94 подтверждённых препаратов из авторских материалов.", kicker: "Препараты", heading: "Все препараты", lead: "Ищите по латинскому названию, русскому исходному имени, алиасам или сокращению." },
  en: { title: "All remedies — Holistic House", description: "A searchable and alphabetical directory of 94 confirmed remedies from author-source materials.", kicker: "Remedies", heading: "All remedies", lead: "Search by Latin name, Russian/source name, aliases, or abbreviation." },
} as const;

export function generateStaticParams() { return getHomeopathyLocaleParams(); }

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  if (!isSupportedLocale(locale)) return { title: "Not found" };
  const current = copy[locale];
  return { metadataBase: metadataBaseFor(), title: current.title, description: current.description, alternates: { canonical: `/${locale}/homeopathy/remedies`, languages: { ru: "/ru/homeopathy/remedies", en: "/en/homeopathy/remedies" } } };
}

export default async function RemediesPage({ params }: PageProps) {
  const { locale } = await params;
  if (!isSupportedLocale(locale)) notFound();
  const current = copy[locale as Locale];
  return (
    <main className="homeopathy-shell">
      <PublicSiteHeader locale={locale} />
      <header className="remedy-index-header"><div><p className="homeopathy-kicker">{current.kicker}</p><h1>{current.heading}</h1><p>{current.lead}</p></div></header>
      <Suspense fallback={<p className="remedy-result-count">{current.lead}</p>}><RemedyDirectory entries={getRemedyDirectory(locale)} locale={locale} /></Suspense>
    </main>
  );
}
