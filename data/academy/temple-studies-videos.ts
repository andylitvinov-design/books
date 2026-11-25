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
  { key: "videos/greek-mysteries-demeter", stage: "greek", title: "Курс Греческие Мистерии. Канал Деметры.", description: "Пять уроков о ритуалах, мифах и символах Деметры." },
  { key: "videos/greek-mysteries-dionysus", stage: "greek", title: "Курс Мистерии Диониса", description: "Семь видеовстреч в рамках исторического курса Диониса." },
  { key: "videos/egypt-osiris", stage: "egypt", title: "Курс Жречество Египта. Осирис", description: "Семь последовательных занятий о египетских мистериях Осириса." },
  { key: "videos/maya-archetypes", stage: "traditions", title: "Архетипы Майя (видео)", description: "Шесть записей о мифологии Майя и образах Пернатого Змея." },
  { key: "videos/planetary-power", stage: "symbols", title: "Курс Сила Планет", description: "Медитации и практики с планетарными и стихийными образами." },
  { key: "videos/strength-protection", stage: "symbols", title: "Медитации Силы и Защиты", description: "Отдельная авторская подборка: часть записей также входит в «Силу Планет»." },
  { key: "videos/energy-pump-ups", stage: "initiation", title: "Практики энергоподдержки", description: "Две сохранившиеся записи из архива бесплатных энергетических практик." },
] as const;

const sourceVideos: PsimasVideo[] = psimasterMedia;

export function templeVideoCollections(stage: string, locale: PublicLocale) {
  const seen = new Set<string>();
  return series.filter((course) => course.stage === stage).map((course) => {
    const originals = sourceVideos
      .filter((media) =>
        media.logicalId === course.key &&
        media.status === "verified_legacy_public_embed" &&
        /^[A-Za-z0-9_-]{11}$/.test(media.videoId) &&
        media.mediaUrl.includes("/embed/" + media.videoId),
      )
      .sort((a, b) => a.order - b.order);
    const videos = originals
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
    return { key: course.key, title: course.title, description: course.description, sourceUrl: provenance?.sourceUrl ?? "", videos, originalCount: originals.length, repeatedCount: originals.length - videos.length };
  }).filter((course) => course.videos.length > 0);
}
