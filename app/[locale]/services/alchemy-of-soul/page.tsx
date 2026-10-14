import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PublicSiteHeader } from "@/components/public-site-header";
import { AlchemySoulLanding } from "@/components/alchemy-soul-landing";
import { isSupportedLocale } from "@/data/remedies";
import type { Locale } from "@/data/remedies";
import { metadataBaseFor } from "@/data/site-metadata";

type Props = { params: Promise<{ locale: string }> };

export function generateStaticParams() {
  return [{ locale: "en" }, { locale: "ru" }];
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!isSupportedLocale(locale)) return { title: "Not found", robots: { index: false } };
  const isRu = locale === "ru";
  return {
    metadataBase: metadataBaseFor(),
    title: isRu
      ? "Алхимия души — личные сессии и психогомеопатия | Holistic House"
      : "Alchemy of the Soul — Personal Sessions | Holistic House",
    description: isRu
      ? "Исследуйте повторяющиеся сценарии, внутренние блоки и свои ресурсы через авторскую работу с образами и расстановками. Личная сессия €100/60 мин или экспресс €50/30 мин."
      : "Explore recurring patterns, inner blocks and resources through personal imagery and constellation work. Personal sessions €100/60 min or express €50/30 min.",
    alternates: {
      canonical: "/" + locale + "/services/alchemy-of-soul",
      languages: {
        en: "/en/services/alchemy-of-soul",
        ru: "/ru/services/alchemy-of-soul",
      },
    },
  };
}

export default async function AlchemySoulPage({ params }: Props) {
  const { locale } = await params;
  if (!isSupportedLocale(locale)) notFound();
  return (
    <>
      <PublicSiteHeader locale={locale as Locale} />
      <AlchemySoulLanding locale={locale as Locale} />
    </>
  );
}
