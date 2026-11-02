import psimasterMedia from "./psimaster-media.generated.json";
import { englishGuidedMeditations } from "./english-guided-meditations";
import type { PublicLocale } from "@/lib/public-locales";

// Curated viewing order only; every recording ID comes from the original
// PsiMaster source manifest. This does not create or claim standalone MP3s.
// Keep the Sun series first, then the named short practices and two historical
// Energy Pump-Ups archive references. Never merge duplicate YouTube IDs.
export type MeditationTopic = "business" | "love" | "energy" | "health";
export type MeditationVideo = {
  id: string;
  title: string;
  description?: string;
  order: number;
  topics: MeditationTopic[];
};

// The themes are navigation hints for original recordings, not claims that
// these recordings are purpose-built business/relationship/health courses.
const allThemes: MeditationTopic[] = ["business", "love", "energy", "health"];
const originalRuThemes: MeditationTopic[][] = [
  ["business", "love", "energy", "health"], // Sun: general introductory reflection
  ["business", "love", "energy"],           // Sun series
  ["love", "energy"],                       // Sun series
  ["energy", "health"],                     // Life Force
  ["energy"],                               // Circle of Fire
  ["energy", "health"],                     // Energy practice archive
  ["energy", "health"],                     // Energy practice archive
];
const selection = [
  ["videos/strength-protection", 5],
  ["videos/strength-protection", 6],
  ["videos/strength-protection", 7],
  ["videos/strength-protection", 3],
  ["videos/strength-protection", 1],
  ["videos/energy-pump-ups", 1],
  ["videos/energy-pump-ups", 2],
] as const;
// Editorial summaries describe the source titles/series, not promised outcomes.
const originalRuDescriptions = [
  "Первая запись серии «Солнце»: медитация с образом Солнца для самостоятельного знакомства с практикой.",
  "Вторая медитация серии «Солнце» — продолжение авторского цикла.",
  "Третья запись серии «Солнце» для дальнейшего знакомства с этой практикой.",
  "Авторская медитация на тему жизненной силы и внимания к внутреннему состоянию.",
  "Медитативная практика с символическим образом круга огня.",
  "Архивная запись об онлайн-марафонах энергетических практик.",
  "Архивная практика, посвящённая работе с чакрой Аджна.",
] as const;
const validYoutubeId = /^[A-Za-z0-9_-]{11}$/;

export function freeMeditationVideos(locale: PublicLocale): MeditationVideo[] {
  // English original stays on EN/ES, with its English soundtrack disclosed.
  // The RU playlist contains ONLY verified original Russian PsiMaster recordings.
  if (locale !== "ru") {
    const englishSun = englishGuidedMeditations.find(
      item => item.key === "flight-to-sun" && item.youtubeId && validYoutubeId.test(item.youtubeId),
    );
    return englishSun?.youtubeId ? [{
      id: englishSun.youtubeId,
      title: englishSun.title + (locale === "es" ? " · audio original en inglés" : " · original English audio"),
      description: englishSun.description,
      order: 1,
      topics: [...allThemes],
    }] : [];
  }
  const seen = new Set<string>();
  return selection.flatMap(([logicalId, order], index) => {
    const recording = psimasterMedia.find(
      item => item.logicalId === logicalId
        && item.order === order
        && item.status === "verified_legacy_public_embed"
        && validYoutubeId.test(item.videoId),
    );
    if (!recording || seen.has(recording.videoId)) return [];
    seen.add(recording.videoId);
    return [{
      id: recording.videoId,
      title: recording.lessonTitle,
      description: originalRuDescriptions[index],
      // An archived source position, not the position of this curated playlist.
      order: recording.order,
      topics: [...originalRuThemes[index]],
    }];
  });
}
