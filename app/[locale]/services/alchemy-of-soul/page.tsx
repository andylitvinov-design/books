import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PublicSiteHeader } from "@/components/public-site-header";
import { DistanceHomeopathyGuide } from "@/components/distance-homeopathy-guide";
import { AlchemySoulLanding } from "@/components/alchemy-soul-landing";
import { isSupportedLocale } from "@/data/remedies";
import type { Locale } from "@/data/remedies";
import { metadataBaseFor } from "@/data/site-metadata";
import styles from "@/components/alchemy-soul-landing.module.css";

type Props = { params: Promise<{ locale: string }> };
export function generateStaticParams() { return [{ locale: "en" }, { locale: "ru" }]; }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!isSupportedLocale(locale)) return { title: "Not found", robots: { index: false } };
  const ru = locale === "ru";
  const description = ru
    ? "Алхимия души: расстановочная диагностика, образная гипнотерапия, дополнительная психогомеопатия. Личные сессии с Андреем Литвиновым."
    : "Alchemy of the Soul: systemic constellations, guided-imagery hypnotherapy and optional psycho-homeopathy. Personal sessions with Andrey Litvinov.";
  return {
    metadataBase: metadataBaseFor(),
    title: (ru ? "Алхимия души · Психогомеопатия" : "Alchemy of the Soul · Psycho-homeopathy") + " — Holistic House",
    description,
    alternates: {
      canonical: "/" + locale + "/services/alchemy-of-soul",
      languages: { en: "/en/services/alchemy-of-soul", ru: "/ru/services/alchemy-of-soul", es: "/es/services/alchemy-of-soul" },
    },
    openGraph: {
      title: ru ? "Алхимия души · Психогомеопатия" : "Alchemy of the Soul · Psycho-homeopathy",
      description,
      images: [{ url: "/images/holistic-house/andy-about.png", alt: "Andrey Litvinov — Holistic House" }],
    },
  };
}

export default async function AlchemyOfTheSoulPage({ params }: Props) {
  const { locale } = await params;
  if (!isSupportedLocale(locale)) notFound();
  return (
    <>
      <PublicSiteHeader locale={locale as Locale} />
      <AlchemySoulLanding locale={locale as Locale} />
      <details className={styles.guideDisclosure} data-alchemy-extended-guide>
        <summary>{locale === "ru" ? "Дополнительно: полная статья о дистанционной гомеопатии" : "Optional reading: full distance-homeopathy guide"}</summary>
        <DistanceHomeopathyGuide locale={locale as Locale} embedded />
      </details>
    </>
  );
}
