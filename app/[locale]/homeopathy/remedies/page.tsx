import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { RemedyDirectory } from "@/components/remedy-directory";
import { SiteNavigation } from "@/components/site-navigation";
import { getHomeopathyLocaleParams, getRemedyDirectory, isSupportedLocale } from "@/data/remedies";
import type { Locale } from "@/data/remedies";
import { metadataBaseFor } from "@/data/site-metadata";

type PageProps = { params: Promise<{ locale: string }> };

const copy = {
  ru: { title: "Препараты — Гомеопатия", description: "Поисковый и алфавитный указатель 94 подтверждённых препаратов из авторских материалов.", kicker: "Гомеопатия", heading: "Препараты", lead: "Ищите по латинскому названию, русскому исходному имени, алиасам или сокращению.", switch: "EN" },
  en: { title: "Remedies — Homeopathy", description: "A searchable and alphabetical directory of 94 confirmed remedies from author-source materials.", kicker: "Homeopathy", heading: "Remedies", lead: "Search by Latin name, Russian/source name, aliases, or abbreviation.", switch: "RU" },
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
  const otherLocale: Locale = locale === "ru" ? "en" : "ru";
  return (
    <main className="homeopathy-shell">
      <SiteNavigation locale={locale} />
      <header className="remedy-index-header"><div><p className="homeopathy-kicker">{current.kicker}</p><h1>{current.heading}</h1><p>{current.lead}</p></div><Link className="locale-link" href={`/${otherLocale}/homeopathy/remedies`} lang={otherLocale}>{current.switch}</Link></header>
      <RemedyDirectory entries={getRemedyDirectory(locale)} locale={locale} />
    </main>
  );
}
