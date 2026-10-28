import type { Metadata } from "next";
import { notFound } from "next/navigation";


import { HolisticSupportMobile, type SupportMobileVideo, type SupportMobileProgram, type SupportMobileTopic } from "@/components/holistic-support-mobile";
import { englishGuidedMeditations } from "@/data/academy/english-guided-meditations";
import { freeMeditationVideos } from "@/data/academy/holistic-support-meditations";
import psimasterMedia from "@/data/academy/psimaster-media.generated.json";
import { isPublicLocale } from "@/data/academy/catalog";
import { metadataBaseFor } from "@/data/site-metadata";

type Props = { params: Promise<{ locale: string }> };

// These four English originals are already published in the Academy. The
// current Support page curates only Sun Flight; the alternate screen presents
// the other three existing, verified recordings without rendering new media.
const englishThemes: Record<string, SupportMobileTopic[]> = {
  "flight-to-sun": ["business", "love", "energy", "goals"],
  "tantra-reiki": ["love", "energy", "goals"],
  "reiki-yggdrasil": ["energy", "goals"],
  "kundalini-reiki": ["energy", "goals"],
};

// Use only the existing public, source-verified PsiMaster collections.
// The original soundtrack is Russian even on English / Spanish pages.
type ArchiveRecording = {
  logicalId: string; order: number; videoId: string; lessonTitle: string;
  lessonTitleEn?: string; status: string;
};
const traditionCourses: ReadonlyArray<{
  id: string; program: SupportMobileProgram; topics: SupportMobileTopic[];
}> = [
  { id: "videos/egypt-osiris", program: "egypt", topics: ["goals"] },
  { id: "videos/greek-mysteries-demeter", program: "greek-demeter", topics: ["goals", "love"] },
  { id: "videos/greek-mysteries-dionysus", program: "greek-dionysus", topics: ["goals", "love"] },
  { id: "videos/maya-archetypes", program: "maya", topics: ["goals"] },
];
const youtubeIdPattern = /^[A-Za-z0-9_-]{11}$/;

function magicCourseVideos(locale: "en" | "ru" | "es"): SupportMobileVideo[] {
  const manifest = psimasterMedia as ArchiveRecording[];
  const seen = new Set<string>();
  return traditionCourses.flatMap(course => manifest
    .filter(record => record.logicalId === course.id
      && record.status === "verified_legacy_public_embed"
      && youtubeIdPattern.test(record.videoId))
    .sort((a, b) => a.order - b.order)
    .flatMap(record => {
      if (seen.has(record.videoId)) return [];
      seen.add(record.videoId);
      return [{
        id: record.videoId,
        title: locale === "ru" ? record.lessonTitle : (record.lessonTitleEn || record.lessonTitle),
        topics: [...course.topics],
        program: course.program,
        author: "psimaster" as const,
        sourceLanguage: "ru" as const,
      }];
    }));
}

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

  const originalVideos: SupportMobileVideo[] = locale === "ru"
    ? freeMeditationVideos("ru").map((video, index): SupportMobileVideo => ({
      ...video,
      topics: [...video.topics.filter((topic): topic is SupportMobileTopic => topic !== "health"),
        ...(index < 3 ? ["goals" as const] : [])],
      program: index < 3 ? "sun" : "energy",
      author: "psimaster",
      sourceLanguage: "ru",
    }))
    : englishGuidedMeditations
      .filter(video => Boolean(video.youtubeId && youtubeIdPattern.test(video.youtubeId)))
      .map((video): SupportMobileVideo => ({
        id: video.youtubeId!,
        title: video.title,
        topics: englishThemes[video.key] ?? ["energy"],
        program: video.key === "flight-to-sun" ? "sun" : "reiki",
        author: "andrey",
        sourceLanguage: "en",
      }));
  // Keep the original recordings and avoid duplicated IDs across the archive groups.
  const seen = new Set<string>();
  const videos = [...originalVideos, ...magicCourseVideos(locale)].filter(video => {
    if (seen.has(video.id)) return false;
    seen.add(video.id);
    return true;
  });

  return (
    <HolisticSupportMobile locale={locale} videos={videos} />
  );
}
