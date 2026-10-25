import psimasterMedia from "./psimaster-media.generated.json";
import { englishGuidedMeditations } from "./english-guided-meditations";
import type { PublicLocale } from "@/lib/public-locales";

// Curated viewing order only; every recording ID comes from the original
// PsiMaster source manifest. This does not create or claim standalone MP3s.
// Keep the Sun series first, then the named short practices and two historical
// Energy Pump-Ups archive references. Never merge duplicate YouTube IDs.
const selection = [
  ["videos/strength-protection", 5],
  ["videos/strength-protection", 6],
  ["videos/strength-protection", 7],
  ["videos/strength-protection", 3],
  ["videos/strength-protection", 1],
  ["videos/energy-pump-ups", 1],
  ["videos/energy-pump-ups", 2],
] as const;
const validYoutubeId = /^[A-Za-z0-9_-]{11}$/;

export function freeMeditationVideos(locale: PublicLocale) {
  // Reuse the one owner-approved Sun Flight source across locales, without
  // copying media or inventing a dubbed soundtrack.
  const englishSun = englishGuidedMeditations.find(
    item => item.key === "flight-to-sun" && item.youtubeId && validYoutubeId.test(item.youtubeId),
  );
  // The original PsiMaster archive is Russian-only. EN/ES discovery shows only
  // the original English Sun video, not Russian lessons with translated labels.
  if (locale !== "ru") {
    return englishSun?.youtubeId ? [{
      id: englishSun.youtubeId,
      title: englishSun.title + (locale === "es" ? " · audio original en inglés" : " · original English audio"),
      order: 1,
    }] : [];
  }
  const seen = new Set<string>();
  const archive = selection.flatMap(([logicalId, order]) => {
    const recording = psimasterMedia.find(
      item => item.logicalId === logicalId
        && item.order === order
        && item.status === "verified_legacy_public_embed"
        && validYoutubeId.test(item.videoId),
    );
    if (!recording || seen.has(recording.videoId)) return [];
    seen.add(recording.videoId);
    const title = locale === "ru" ? recording.lessonTitle : recording.lessonTitleEn;
    return [{
      id: recording.videoId,
      title: locale === "ru" ? title : title + (locale === "es" ? " · audio original en ruso" : " · original Russian audio"),
      // An archived source position, not the position of this curated playlist.
      order: recording.order,
    }];
  });
  // Put the owner's requested "Полёт к солнцу" video first on RU, with an
  // honest original-language label. Then retain the seven Russian recordings.
  // The shared video ID may never be inserted twice in the same playlist.
  if (englishSun?.youtubeId && !seen.has(englishSun.youtubeId)) {
    return [{
      id: englishSun.youtubeId,
      title: "Полёт к солнцу · авторская видеомедитация (звук на английском)",
      order: 0,
    }, ...archive];
  }
  return archive;
}
