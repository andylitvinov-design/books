import psimasterMedia from "./psimaster-media.generated.json";
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
  const seen = new Set<string>();
  return selection.flatMap(([logicalId, order]) => {
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
}
