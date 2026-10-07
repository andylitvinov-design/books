import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { DistanceHomeopathyGuide, distanceHomeopathyMetadata } from "@/components/distance-homeopathy-guide";
import { metadataBaseFor } from "@/data/site-metadata";
import { getHomeopathyLocaleParams, isSupportedLocale } from "@/data/remedies";

type Props = { params: Promise<{ locale: string }> };

export function generateStaticParams() {
  return getHomeopathyLocaleParams();
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!isSupportedLocale(locale)) return { title: "Not found" };
  const text = distanceHomeopathyMetadata(locale);
  return {
    metadataBase: metadataBaseFor(),
    title: `${text.title} — Holistic House`,
    description: text.description,
    alternates: {
      canonical: `/${locale}/library/distance-homeopathy`,
      languages: {
        ru: "/ru/library/distance-homeopathy",
        en: "/en/library/distance-homeopathy",
        es: "/es/library/distance-homeopathy",
      },
    },
  };
}

export default async function DistanceHomeopathyPage({ params }: Props) {
  const { locale } = await params;
  if (!isSupportedLocale(locale)) notFound();
  return <DistanceHomeopathyGuide locale={locale} />;
}
