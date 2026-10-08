import psimasterMedia from "./psimaster-media.generated.json";
import type { PublicLocale } from "@/lib/public-locales";

/**
 * Original public Russian-language lessons, already recovered from PsiMaster.
 * The stage page shows each YouTube video once, even if the historic catalog
 * cross-listed it in multiple meditation collections.
 */
type PsimasVideo = {
  logicalId: string;
  videoId: string;
  mediaUrl: string;
  status: string;
  sourceUrl: string;
  order: number;
  lessonTitle: string;
  lessonTitleEn: string;
};

const series = [
  { key: "videos/greek-mysteries-demeter", stage: "greek", title: "Греческие мистерии — Деметра" },
  { key: "videos/greek-mysteries-dionysus", stage: "greek", title: "Мистерии Диониса" },
  { key: "videos/egypt-osiris", stage: "egypt", title: "Египетские мистерии — Осирис" },
  { key: "videos/maya-archetypes", stage: "traditions", title: "Архетипы Майя и ацтеков" },
  { key: "videos/planetary-power", stage: "symbols", title: "Сила планет" },
  { key: "videos/strength-protection", stage: "symbols", title: "Медитации силы и защиты" },
  { key: "videos/energy-pump-ups", stage: "initiation", title: "Практики энергоподдержки" },
] as const;

const sourceVideos: PsimasVideo[] = psimasterMedia;

export function templeVideoCollections(stage: string, locale: PublicLocale) {
  const seen = new Set<string>();
  return series.filter((course) => course.stage === stage).map((course) => {
    const videos = sourceVideos
      .filter((media) =>
        media.logicalId === course.key &&
        media.status === "verified_legacy_public_embed" &&
        /^[A-Za-z0-9_-]{11}$/.test(media.videoId) &&
        media.mediaUrl.includes("/embed/" + media.videoId),
      )
      .sort((a, b) => a.order - b.order)
      .filter((media) => {
        if (seen.has(media.videoId)) return false;
        seen.add(media.videoId);
        return true;
      })
      .map((media) => ({
        id: media.videoId,
        title: locale === "ru" ? media.lessonTitle : media.lessonTitleEn || media.lessonTitle,
        originalTitle: media.lessonTitle,
        order: media.order,
      }));

    const provenance = sourceVideos.find((media) => media.logicalId === course.key);
    return { key: course.key, title: course.title, sourceUrl: provenance?.sourceUrl ?? "", videos };
  }).filter((course) => course.videos.length > 0);
}
