import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PublicSiteHeader } from "@/components/public-site-header";
import { CoreServiceDetail, coreOfferDetailData } from "@/components/core-service-detail";
import { isSupportedLocale } from "@/data/remedies";
import type { Locale } from "@/data/remedies";
import { metadataBaseFor } from "@/data/site-metadata";

type Props = { params: Promise<{ locale: string }> };
const kind = "hypnotherapy" as const;

export function generateStaticParams() { return [{ locale: "en" }, { locale: "ru" }]; }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!isSupportedLocale(locale)) return { title: "Not found", robots: { index: false } };
  const t = coreOfferDetailData(locale as Locale, kind);
  return {
    metadataBase: metadataBaseFor(),
    title: t.title + " — Holistic House",
    description: t.lead,
    alternates: {
      canonical: "/" + locale + "/services/hypnotherapy-course",
      languages: { en: "/en/services/hypnotherapy-course", ru: "/ru/services/hypnotherapy-course" },
    },
  };
}

export default async function CoreServicePage({ params }: Props) {
  const { locale } = await params;
  if (!isSupportedLocale(locale)) notFound();
  return (
    <>
      <PublicSiteHeader locale={locale as Locale} />
      <CoreServiceDetail locale={locale as Locale} kind={kind} />
    </>
  );
}
