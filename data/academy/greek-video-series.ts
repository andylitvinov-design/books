import { academyDisplayTitle, findAcademyRecord, mediaForRecord, youtubeIdFromUrl } from "@/data/academy/catalog";
import type { PublicLocale } from "@/lib/public-locales";

// One canonical pointer per historical Greek video channel. The recordings
// themselves remain in the existing PsiMaster manifest and Academy pages.
export const GREEK_VIDEO_SERIES = [
  {
    id: "greek-dionysus",
    logicalId: "videos/greek-mysteries-dionysus",
    shortTitle: "Дионис",
    title: "Канал Диониса",
  },
  {
    id: "greek-demeter",
    logicalId: "videos/greek-mysteries-demeter",
    shortTitle: "Деметра",
    title: "Канал Деметры",
  },
] as const;

export type GreekVideoSeriesId = (typeof GREEK_VIDEO_SERIES)[number]["id"];

export type GreekVideoSeriesLesson = {
  id: string;
  title: string;
  order: number;
};

export type GreekVideoSeries = (typeof GREEK_VIDEO_SERIES)[number] & {
  href: string;
  lessons: GreekVideoSeriesLesson[];
};

/** Original RU series only: source lesson order, verified URLs, no duplicate uploads. */
export function greekVideoSeries(locale: PublicLocale): GreekVideoSeries[] {
  if (locale !== "ru") return [];

  return GREEK_VIDEO_SERIES.flatMap((series): GreekVideoSeries[] => {
    const record = findAcademyRecord(series.logicalId, "ru");
    if (!record || record.sourceLocale !== "ru" || record.direction !== "videos") return [];

    const seen = new Set<string>();
    const lessons = [...mediaForRecord(record)]
      .filter(item => item.status === "verified_legacy_public_embed")
      .sort((a, b) => (a.order ?? Number.MAX_SAFE_INTEGER) - (b.order ?? Number.MAX_SAFE_INTEGER))
      .flatMap((item): GreekVideoSeriesLesson[] => {
        const id = youtubeIdFromUrl(item.mediaUrl);
        if (!id || !/^[A-Za-z0-9_-]{11}$/.test(id) || seen.has(id)) return [];
        seen.add(id);
        return [{
          id,
          title: item.lessonTitle || academyDisplayTitle(record, "ru"),
          order: item.order ?? seen.size,
        }];
      });
    return lessons.length ? [{ ...series, href: "/ru/academy/" + record.routeKey, lessons }] : [];
  });
}
