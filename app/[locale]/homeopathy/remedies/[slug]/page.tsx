import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { RemedyPage } from "@/components/remedy-page";
import { getRemedy, getRemedyRouteParams, isSupportedLocale } from "@/data/remedies";
import { metadataBaseFor } from "@/data/site-metadata";
import { remedySeoDescription } from "@/lib/public-seo-description";

type PageProps = { params: Promise<{ locale: string; slug: string }> };

export const dynamicParams = false;
export function generateStaticParams() { return getRemedyRouteParams(); }

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale, slug } = await params;
  const remedy = getRemedy(locale, slug);
  if (!remedy || !isSupportedLocale(locale)) return { title: "Not found" };
  const title = locale === "ru" ? `${remedy.canonical_latin_name} — Препараты` : `${remedy.canonical_latin_name} — Remedies`;
  const description = remedySeoDescription(remedy.canonical_latin_name, locale);
  return {
    metadataBase: metadataBaseFor(),
    title: locale === "ru" ? `${remedy.canonical_latin_name} — Препараты` : `${remedy.canonical_latin_name} — Remedies`,
    description,
    alternates: { canonical: `/${locale}/homeopathy/remedies/${slug}`, languages: { ru: `/ru/homeopathy/remedies/${slug}`, en: `/en/homeopathy/remedies/${slug}`, es: `/es/homeopathy/remedies/${slug}`, "x-default": `/en/homeopathy/remedies/${slug}` } },
    openGraph: { title, description, type: "article", url: `/${locale}/homeopathy/remedies/${slug}`, images: ["/images/holistic-house/andy-about.png"] },
    twitter: { card: "summary_large_image", title, description, images: ["/images/holistic-house/andy-about.png"] },
  };
}

export default async function RemedyDetailPage({ params }: PageProps) {
  const { locale, slug } = await params;
  if (!isSupportedLocale(locale)) notFound();
  const remedy = getRemedy(locale, slug);
  if (!remedy) notFound();
  return <RemedyPage locale={locale} remedy={remedy} />;
}
