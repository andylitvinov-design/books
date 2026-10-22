/** Owner-supplied Reiki Practitioner lesson recordings, 22 October 2026.
 * These IDs came from the provided YouTube /live/ links. Titles are editorial
 * labels; video metadata and embedding rights have not been independently checked.
 * Existing English source meditations stay in english-guided-meditations.ts.
 */
export const reikiPractitionerLessonVideos = [
  { slideId: "flight-02", lesson: 1, youtubeId: "lOo93GuzeJ0",
    title: { en: "Lesson 1 · Flight to the Sun", ru: "Урок 1 · Полёт к Солнцу" } },
  { slideId: "tan-02", lesson: 2, youtubeId: "yH_M6If8VLk",
    title: { en: "Lesson 2 · Tantra Reiki", ru: "Урок 2 · Тантра Рейки" } },
  { slideId: "kun-02", lesson: 3, youtubeId: "KK1IgvDTrhU",
    title: { en: "Lesson 3 · Kundalini Reiki", ru: "Урок 3 · Кундалини Рейки" } },
  { slideId: "ygg-02", lesson: 4, youtubeId: "y3MDcqwlC-w",
    title: { en: "Lesson 4 · Reiki Yggdrasil", ru: "Урок 4 · Рейки Иггдрасиль" } },
] as const;

export type ReikiPractitionerLessonVideo = (typeof reikiPractitionerLessonVideos)[number];
