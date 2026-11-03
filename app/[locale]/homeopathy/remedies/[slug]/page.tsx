import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { RemedyPage } from "@/components/remedy-page";
import { getRemedy, getRemedyRouteParams, isSupportedLocale } from "@/data/remedies";
import { metadataBaseFor } from "@/data/site-metadata";
import { getSpanishRemedy } from "@/data/remedies-es";
import { remedySeoDescription } from "@/lib/seo-descriptions";

type PageProps = { params: Promise<{ locale: string; slug: string }> };

export const revalidate = 3600;
export const dynamicParams = false;
export function generateStaticParams() { return getRemedyRouteParams(); }

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale, slug } = await params;
  const remedy = getRemedy(locale, slug);
  if (!remedy || !isSupportedLocale(locale)) return { title: "Not found" };
  const title = locale === "ru" ? `${remedy.canonical_latin_name} — Препараты` : `${remedy.canonical_latin_name} — Remedies`;
  const description = remedySeoDescription(remedy.canonical_latin_name, remedy.description, locale);
  const image = "/images/holistic-house/andy-about.png";
  return {
    metadataBase: metadataBaseFor(),
    title,
    description,
    openGraph: { type: "article", title, description, locale: locale === "ru" ? "ru_RU" : "en_CA",
      images: [{ url: image, alt: "Holistic House — " + remedy.canonical_latin_name }] },
    twitter: { card: "summary_large_image", title, description, images: [image] },
    alternates: { canonical: `/${locale}/homeopathy/remedies/${slug}`, languages: { ru: `/ru/homeopathy/remedies/${slug}`, en: `/en/homeopathy/remedies/${slug}`, ...(getSpanishRemedy(slug) ? { es: `/es/homeopathy/remedies/${slug}` } : {}), "x-default": `/en/homeopathy/remedies/${slug}` } },
  };
}

export default async function RemedyDetailPage({ params }: PageProps) {
  const { locale, slug } = await params;
  if (!isSupportedLocale(locale)) notFound();
  const remedy = getRemedy(locale, slug);
  if (!remedy) notFound();
  return <RemedyPage locale={locale} remedy={remedy} />;
}
