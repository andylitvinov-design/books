import type { Metadata } from "next";
import { notFound } from "next/navigation";


import { HolisticSupportMobile, type SupportMobileCourse, type SupportMobileVideo, type SupportMobileChoice } from "@/components/holistic-support-mobile";
import { englishGuidedMeditations } from "@/data/academy/english-guided-meditations";
import { freeMeditationVideos, type MeditationTopic } from "@/data/academy/holistic-support-meditations";
import { academyDisplayTitle, findAcademyRecord, isPublicLocale, mediaForRecord, youtubeIdFromUrl } from "@/data/academy/catalog";
import { metadataBaseFor } from "@/data/site-metadata";

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<{ view?: string | string[] }> };

// These recordings are attributed to Andrey in the existing approved sources:
// English guided meditations and the historical PsiMaster / Andrey archive.
// Link to his existing published practitioner profile; do not create a duplicate.
function andreyMasterProfile(locale: "en" | "ru" | "es") {
  return {
    slug: "andy-litvinov",
    name: locale === "ru" ? "Андрей Литвинов" : "Andrey Litvinov",
    image: "/images/holistic-house/portrait-static/andy-192-86e7f5b9ca61.webp",
  };
}

// These four English originals are already published in the Academy. The
// current Support page curates only Sun Flight; the alternate screen presents
// the other three existing, verified recordings without rendering new media.
const englishThemes: Record<string, MeditationTopic[]> = {
  "flight-to-sun": ["business", "love", "energy", "health"],
  "tantra-reiki": ["love", "energy"],
  "reiki-yggdrasil": ["energy", "health"],
  "kundalini-reiki": ["energy", "health"],
};

// Source pointers only: curricula and video chapters already live in Academy.
 // Do not clone the original course, media or enrolment records here.
const mysteryCollections = [
  {
    id: "maya",
    programId: "mysteries/maya-aztec/feathered-serpent",
    videoIds: ["videos/maya-archetypes"],
    shortTitle: "Майя",
    topics: ["energy", "business"],
  },
  {
    id: "egypt",
    programId: "mysteries/egypt/high-wisdom",
    videoIds: ["videos/egypt-osiris"],
    shortTitle: "Египет",
    topics: ["energy", "health"],
  },
  {
    id: "greek",
    programId: "mysteries/greece-rome/beauty-and-power",
    videoIds: ["videos/greek-mysteries-demeter", "videos/greek-mysteries-dionysus"],
    shortTitle: "Греция",
    topics: ["love", "energy"],
  },
] as const;

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
    description: locale === "ru" ? "Оцени четыре сферы, подбери оригинальные медитации по минимальным оценкам и исследуй поддержку." :
      locale === "es" ? "Valora cuatro áreas y descubre meditaciones originales según tus puntuaciones más bajas." :
      "Rate four life areas and explore original meditations ranked by your lowest self-ratings.",
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

export default async function HolisticSupportMobilePage({ params, searchParams }: Props) {
  const { locale } = await params;
  if (!isPublicLocale(locale)) notFound();
  // Internal journeys from Mandala open the same new-design experience.
  // Ignore unknown query values instead of forwarding an untrusted route.
  const requestedView = (await searchParams).view;
  const availableViews: SupportMobileChoice[] = ["meditation", "consultation", "talisman", "pump", "healing", "masters", "tests"];
  const initialChoice = availableViews.find(view => view === requestedView) ?? "meditation";

  const originalMysteryCourses: SupportMobileCourse[] = [];

  // Russian original audio is discoverable only in RU. Each course and lesson
  // resolves from the already-preserved source manifests, not a second catalogue.
  if (locale === "ru") {
    for (const entry of mysteryCollections) {
      const curriculum = findAcademyRecord(entry.programId, "ru");
      if (!curriculum || curriculum.sourceLocale !== "ru") continue;
      const courseVideos: SupportMobileVideo[] = [];
      const videoGroups: SupportMobileCourse["videoGroups"] = [];
      for (const logicalId of entry.videoIds) {
        const record = findAcademyRecord(logicalId, "ru");
        if (!record || record.sourceLocale !== "ru") continue;
        const seen = new Set<string>();
        const sourceMedia = [...mediaForRecord(record)].sort((a, b) => (a.order ?? 999) - (b.order ?? 999));
        for (const media of sourceMedia) {
          const id = youtubeIdFromUrl(media.mediaUrl);
          if (!id || !/^[A-Za-z0-9_-]{11}$/.test(id) || seen.has(id)) continue;
          seen.add(id);
          courseVideos.push({
            id,
            title: media.lessonTitle || academyDisplayTitle(record, "ru"),
            topics: [...entry.topics],
            program: entry.id,
            author: "psimaster",
            sourceLanguage: "ru",
            masterProfile: andreyMasterProfile("ru"),
          });
        }
        if (seen.size) videoGroups.push({
          title: academyDisplayTitle(record, "ru"),
          href: "/ru/academy/" + record.routeKey,
          count: seen.size,
        });
      }
      if (!courseVideos.length) continue;
      originalMysteryCourses.push({
        id: entry.id,
        title: academyDisplayTitle(curriculum, "ru"),
        shortTitle: entry.shortTitle,
        // A verified first lesson provides a truthful source thumbnail.
        poster: "https://i.ytimg.com/vi/" + encodeURIComponent(courseVideos[0].id) + "/hqdefault.jpg",
        href: "/ru/academy/" + curriculum.routeKey,
        videoCount: courseVideos.length,
        videoGroups,
        videos: courseVideos,
      });
    }
  }

  // Verified English originals are available in RU/EN/ES, retaining Russian meditations.
  const englishVideos: SupportMobileVideo[] = englishGuidedMeditations
    .filter(video => Boolean(video.youtubeId && /^[A-Za-z0-9_-]{11}$/.test(video.youtubeId)))
    .map((video): SupportMobileVideo => ({
      id: video.youtubeId!,
      title: video.title,
      topics: englishThemes[video.key] ?? ["energy"],
      program: video.key === "flight-to-sun" ? "sun" : "reiki",
      author: "andrey",
      sourceLanguage: "en",
      courseKey: video.key,
      masterProfile: andreyMasterProfile(locale),
    }));
  const russianVideos: SupportMobileVideo[] = locale === "ru"
    ? freeMeditationVideos("ru").map((video, index): SupportMobileVideo => ({
        ...video,
        program: index < 3 ? "sun" : "energy",
        author: "psimaster",
        sourceLanguage: "ru",
        masterProfile: andreyMasterProfile("ru"),
      }))
    : [];
  const englishIds = new Set(englishVideos.map(video => video.id));
  const videos: SupportMobileVideo[] = [
    ...russianVideos.filter(video => !englishIds.has(video.id)), ...englishVideos,
  ];

  return (
    <HolisticSupportMobile locale={locale} videos={videos} courses={originalMysteryCourses} initialChoice={initialChoice} />
  );
}
