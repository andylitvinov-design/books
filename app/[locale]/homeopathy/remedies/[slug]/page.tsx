import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { RemedyPage } from "@/components/remedy-page";
import { getRemedy, getRemedyRouteParams, isSupportedLocale } from "@/data/remedies";
import { metadataBaseFor } from "@/data/site-metadata";

type PageProps = { params: Promise<{ locale: string; slug: string }> };

export const dynamicParams = false;
export function generateStaticParams() { return getRemedyRouteParams(); }

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale, slug } = await params;
  const remedy = getRemedy(locale, slug);
  if (!remedy || !isSupportedLocale(locale)) return { title: "Not found" };
  return {
    metadataBase: metadataBaseFor(),
    title: locale === "ru" ? `${remedy.canonical_latin_name} — Гомеопатия` : `${remedy.canonical_latin_name} — Homeopathy`,
    description: remedy.description.slice(0, 155),
    alternates: { canonical: `/${locale}/homeopathy/remedies/${slug}`, languages: { ru: `/ru/homeopathy/remedies/${slug}`, en: `/en/homeopathy/remedies/${slug}` } },
  };
}

export default async function RemedyDetailPage({ params }: PageProps) {
  const { locale, slug } = await params;
  if (!isSupportedLocale(locale)) notFound();
  const remedy = getRemedy(locale, slug);
  if (!remedy) notFound();
  return <RemedyPage locale={locale} remedy={remedy} />;
}
