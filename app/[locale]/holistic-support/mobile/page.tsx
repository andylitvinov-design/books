import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PublicSiteHeader } from "@/components/public-site-header";
import { HolisticSupportMobile, type SupportMobileVideo } from "@/components/holistic-support-mobile";
import { englishGuidedMeditations } from "@/data/academy/english-guided-meditations";
import { freeMeditationVideos, type MeditationTopic } from "@/data/academy/holistic-support-meditations";
import { isPublicLocale } from "@/data/academy/catalog";
import { metadataBaseFor } from "@/data/site-metadata";

type Props = { params: Promise<{ locale: string }> };

// These four English originals are already published in the Academy. The
// current Support page curates only Sun Flight; the alternate screen presents
// the other three existing, verified recordings without rendering new media.
const englishThemes: Record<string, MeditationTopic[]> = {
  "flight-to-sun": ["business", "love", "energy", "health"],
  "tantra-reiki": ["love", "energy"],
  "reiki-yggdrasil": ["energy", "health"],
  "kundalini-reiki": ["energy", "health"],
};

const pageTitle = {
  en: "Holistic Support · Mobile",
  ru: "Холистическая поддержка · Мобильная версия",
  es: "Apoyo holístico · Móvil",
} as const;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!isPublicLocale(locale)) return { title: "Not found", robots: { index: false } };
  return {
    metadataBase: metadataBaseFor(),
    title: pageTitle[locale] + " | Holistic House",
    description: locale === "ru" ? "Личный фокус, медитации, тесты, талисманы и поддержка в одном мобильном пространстве." :
      locale === "es" ? "Tu enfoque, meditaciones, autoevaluación, talismanes y apoyo en una sola pantalla." :
      "Choose a focus, watch original meditations and explore existing support in one mobile space.",
    robots: { index: false, follow: true }, // an alternative UI, not a competing SEO page
    alternates: {
      canonical: "/" + locale + "/holistic-support/mobile",
      languages: {
        en: "/en/holistic-support/mobile",
        ru: "/ru/holistic-support/mobile",
        es: "/es/holistic-support/mobile",
        "x-default": "/en/holistic-support/mobile",
      },
    },
  };
}

export default async function HolisticSupportMobilePage({ params }: Props) {
  const { locale } = await params;
  if (!isPublicLocale(locale)) notFound();

  const videos: SupportMobileVideo[] = locale === "ru"
    ? freeMeditationVideos("ru").map((video, index): SupportMobileVideo => ({
      ...video,
      program: index < 3 ? "sun" : "energy",
      author: "psimaster",
      sourceLanguage: "ru",
    }))
    : englishGuidedMeditations
      .filter(video => Boolean(video.youtubeId && /^[A-Za-z0-9_-]{11}$/.test(video.youtubeId)))
      .map((video): SupportMobileVideo => ({
        id: video.youtubeId!,
        title: video.title,
        topics: englishThemes[video.key] ?? ["energy"],
        program: video.key === "flight-to-sun" ? "sun" : "reiki",
        author: "andrey",
        sourceLanguage: "en",
      }));

  return (
    <>
      <PublicSiteHeader locale={locale} />
      <HolisticSupportMobile locale={locale} videos={videos} />
    </>
  );
}
