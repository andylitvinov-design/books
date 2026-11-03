import { AcademyVideoLibraryClient, type AcademyVideoCourse, type AcademyVideoGroup, type AcademyVideoLesson, type AcademyVideoProgram } from "@/components/academy-video-library-client";
import { academyDisplayTitle, mediaForRecord, videoRecords, youtubeIdFromUrl, type AcademySourceRecord } from "@/data/academy/catalog";
import { englishGuidedMeditations } from "@/data/academy/english-guided-meditations";
import yggdrasilCurriculum from "@/data/academy/yggdrasil-curriculum.json";
import type { PublicLocale } from "@/lib/public-locales";
import { REIKI_FREE_COURSE_PATH } from "@/lib/academy/reiki-free-course";

const validVideoId = /^[A-Za-z0-9_-]{11}$/;

const labels = {
  en: {
    tantra: "Tantra Reiki",
    yggdrasil: "Reiki Yggdrasil",
    kundalini: "Kundalini Reiki",
    tantraIntro: "Free Tantra Reiki lesson: presence and connection. Original video in English.",
    kundaliniIntro: "Free Kundalini Reiki lesson: grounding and reflection. Original video in English.",
    yggdrasilIntro: "Free Reiki Yggdrasil lesson: World Tree imagery. Original video in English.",
    temple: "Temple Studies",
    energy: "Energy practices",
    levelOne: "Level 1 · guided meditation",
    guidedClass: "Guided class",
    greek: "Greek mysteries",
    egypt: "Egyptian mysteries",
    maya: "Maya & Aztec traditions",
    planets: "Planetary practices",
    protection: "Strength & protection",
    energyPractice: "Energy support",
    recordings: "Original recordings",
    level: "Level",
    clip: "Recording",
    englishIntro: "Original English guided practices",
    russianIntro: "Russian-language lesson recordings from the teaching archive",
  },
  ru: {
    tantra: "Тантра Рейки",
    yggdrasil: "Рейки Иггдрасиль",
    kundalini: "Кундалини Рейки",
    tantraIntro: "Бесплатный урок Тантра Рейки: присутствие и контакт. Видео на английском.",
    kundaliniIntro: "Бесплатный урок Кундалини Рейки: опора и энергия. Видео на английском.",
    yggdrasilIntro: "Бесплатный урок Рейки Иггдрасиль: Древо Миров. Видео на английском.",
    temple: "Temple Studies · Храмовые традиции",
    energy: "Энергетические практики",
    levelOne: "1 ступень · медитация",
    guidedClass: "Практическая медитация",
    greek: "Греческие мистерии",
    egypt: "Египетские мистерии",
    maya: "Традиции Майя и Ацтеков",
    planets: "Практики планет",
    protection: "Сила и защита",
    energyPractice: "Энергоподдержка",
    recordings: "Оригинальные записи",
    level: "Ступень",
    clip: "Запись",
    englishIntro: "Оригинальные авторские медитации на английском",
    russianIntro: "Русскоязычные учебные записи из архива Академии",
  },
  es: {
    tantra: "Tantra Reiki",
    yggdrasil: "Reiki Yggdrasil",
    kundalini: "Kundalini Reiki",
    tantraIntro: "Lección gratis de Tantra Reiki. Vídeo en inglés.",
    kundaliniIntro: "Lección gratis de Kundalini Reiki. Vídeo en inglés.",
    yggdrasilIntro: "Lección gratis de Reiki Yggdrasil. Vídeo en inglés.",
    temple: "Temple Studies · Tradiciones del templo",
    energy: "Prácticas energéticas",
    levelOne: "Nivel 1 · meditación guiada",
    guidedClass: "Meditación guiada",
    greek: "Misterios griegos",
    egypt: "Misterios egipcios",
    maya: "Tradiciones mayas y aztecas",
    planets: "Prácticas planetarias",
    protection: "Fuerza y protección",
    energyPractice: "Prácticas energéticas",
    recordings: "Grabaciones originales",
    level: "Nivel",
    clip: "Grabación",
    englishIntro: "Prácticas guiadas originales en inglés",
    russianIntro: "Lecciones originales en ruso del archivo de la Academia",
  },
} as const;

type YggdrasilCourseSource = {
  levels: Array<{
    id: number;
    title: Record<PublicLocale, string>;
    steps: Array<{
      id: string;
      number: number;
      title: Record<PublicLocale, string>;
      video?: { videos?: Array<{ youtubeId?: string; title?: string; availability?: "unavailable" }> };
    }>;
  }>;
};

function titleImage(videoId: string) {
  return "https://i.ytimg.com/vi/" + videoId + "/mqdefault.jpg";
}

function countVideos(course: AcademyVideoCourse) {
  return course.chapters.reduce((sum, chapter) => sum + chapter.videos.length, 0);
}

function findSourceCourse(
  record: AcademySourceRecord | undefined,
  locale: PublicLocale,
  section: string,
): AcademyVideoCourse | null {
  if (!record) return null;
  const seen = new Set<string>();
  const media = [...mediaForRecord(record)]
    .map((item) => ({ item, id: youtubeIdFromUrl(item.mediaUrl) }))
    .filter((entry): entry is { item: typeof entry.item; id: string } =>
      typeof entry.id === "string" && validVideoId.test(entry.id))
    .sort((a, b) => (a.item.order ?? 999) - (b.item.order ?? 999));
  const videos: AcademyVideoLesson[] = [];
  for (const { item, id } of media) {
    if (seen.has(id)) continue;
    seen.add(id);
    videos.push({
      id,
      title: (locale === "ru" ? item.lessonTitle : item.lessonTitleEn ?? item.lessonTitle)
        || academyDisplayTitle(record, locale) + " · " + (videos.length + 1),
    });
  }
  if (!videos.length) return null;
  return {
    id: record.logicalId,
    title: academyDisplayTitle(record, locale),
    category: section,
    poster: titleImage(videos[0].id),
    href: "/" + locale + "/academy/" + (record.logicalId === "videos/egypt-osiris" ? "egyptian-priesthood" : record.routeKey),
    chapters: [{ id: record.logicalId + "-lessons", title: "", videos }],
  };
}

function yggdrasilCourses(locale: PublicLocale): AcademyVideoCourse[] {
  const t = labels[locale];
  const curriculum = yggdrasilCurriculum as YggdrasilCourseSource;
  return curriculum.levels.map((module) => {
    const chapters = module.steps.flatMap((step) => {
      const found = (step.video?.videos ?? []).filter(
        (video): video is { youtubeId?: string; title?: string; availability?: "unavailable" } =>
          (typeof video.youtubeId === "string" && validVideoId.test(video.youtubeId)) || video.availability === "unavailable",
      );
      const seen = new Set<string>();
      const videos: AcademyVideoLesson[] = [];
      found.forEach((video) => {
        const id = video.youtubeId ?? "unavailable-" + step.id + "-" + videos.length;
        if (seen.has(id)) return;
        seen.add(id);
        videos.push({
          id,
          title: t.clip + " " + (videos.length + 1) + (found.length > 1 ? " / " + found.length : ""),
          unavailable: video.availability === "unavailable",
        });
      });
      return videos.length ? [{
        id: step.id,
        title: t.level + " " + step.number + " · " + step.title[locale],
        videos,
      }] : [];
    });
    const first = chapters.flatMap((chapter) => chapter.videos).find((video) => !video.unavailable)?.id;
    return {
      id: "yggdrasil-module-" + module.id,
      title: module.title[locale],
      category: String(module.id).padStart(2, "0") + " · " + t.recordings,
      poster: first ? titleImage(first) : "/academy/reiki-yggdrasil/source/basic-program.jpg",
      href: "/" + locale + "/academy/reiki/yggdrasil",
      chapters,
    };
  }).filter((course) => countVideos(course) > 0);
}

function englishPrograms(locale: PublicLocale): AcademyVideoProgram[] {
  const t = labels[locale];
  const practice = englishGuidedMeditations.find((item) => item.key === "tantra-reiki");
  const classVideo = englishGuidedMeditations.find((item) => item.key === "reiki-yggdrasil");
  const kundaliniVideo = englishGuidedMeditations.find((item) => item.key === "kundalini-reiki");

  const englishCourse = (
    source: typeof practice,
    id: string,
    title: string,
    href: string,
    description: string,
  ): AcademyVideoCourse[] => {
    if (!source?.youtubeId || !validVideoId.test(source.youtubeId)) return [];
    return [{
      id,
      title,
      category: t.recordings,
      poster: titleImage(source.youtubeId),
      href,
      description,
      freeCourseHref: REIKI_FREE_COURSE_PATH.replace(/^\/en\//, "/" + locale + "/"),
      chapters: [{
        id: id + "-guided",
        title: "",
        videos: [{ id: source.youtubeId, title: source.title }],
      }],
    }];
  };
  return [
    {
      id: "english-tantra-reiki",
      title: t.tantra,
      href: "/" + locale + "/academy/reiki/tantra-reiki",
      poster: "/images/holistic-house/tantra-reiki-yin-yang-cover.svg",
      courses: englishCourse(practice, "tantra-level-1", t.levelOne, "/" + locale + "/academy/reiki/tantra-reiki", t.tantraIntro),
    },
    {
      id: "english-reiki-yggdrasil",
      title: t.yggdrasil,
      href: "/" + locale + "/academy/reiki/yggdrasil",
      poster: "/academy/reiki-yggdrasil/source/advanced-shamanic-therapy.png",
      courses: englishCourse(classVideo, "yggdrasil-english-practice", t.guidedClass, "/" + locale + "/academy/reiki/yggdrasil", t.yggdrasilIntro),
    },
    {
      id: "english-kundalini-reiki",
      title: t.kundalini,
      href: "/" + locale + "/academy/reiki/kundalini-reiki",
      poster: "/academy/kundalini-reiki/kundalini-manual-level-2.jpg",
      courses: englishCourse(kundaliniVideo, "kundalini-level-1", t.levelOne,
        "/" + locale + "/academy/reiki/kundalini-reiki", t.kundaliniIntro),
    },
  ].filter((program) => program.courses.length > 0);
}

function russianPrograms(locale: PublicLocale): AcademyVideoProgram[] {
  const t = labels[locale];
  const records = new Map(videoRecords(locale).map((record) => [record.logicalId, record]));
  const source = (id: string, section: string) => findSourceCourse(records.get(id), locale, section);
  const templeCourses = [
    source("videos/greek-mysteries-demeter", t.greek),
    source("videos/greek-mysteries-dionysus", t.greek),
    source("videos/egypt-osiris", t.egypt),
    source("videos/maya-archetypes", t.maya),
  ].filter((course): course is AcademyVideoCourse => Boolean(course));
  const energyCourses = [
    source("videos/planetary-power", t.planets),
    source("videos/strength-protection", t.protection),
    source("videos/energy-pump-ups", t.energyPractice),
  ].filter((course): course is AcademyVideoCourse => Boolean(course));

  return [
    {
      id: "russian-reiki-yggdrasil",
      title: t.yggdrasil,
      href: "/" + locale + "/academy/reiki/yggdrasil",
      poster: "/academy/reiki-yggdrasil/source/basic-program.jpg",
      courses: yggdrasilCourses(locale),
    },
    {
      id: "russian-temple-studies",
      title: t.temple,
      href: "/" + locale + "/academy/temple-studies",
      poster: "/academy/reiki-yggdrasil/source/temple-studies.png",
      courses: templeCourses,
    },
    {
      id: "russian-energy-practices",
      title: t.energy,
      href: "/" + locale + "/academy/reiki",
      poster: "/academy/reiki-yggdrasil/source/advanced-shamanic-therapy.png",
      courses: energyCourses,
    },
  ].filter((program) => program.courses.length > 0);
}

/** A course/level index, never a collection of oversized player cards. */
export function AcademyVideoCourses({ locale }: { locale: PublicLocale }) {
  const groups: AcademyVideoGroup[] = [
    { language: "en", intro: labels[locale].englishIntro, programs: englishPrograms(locale) },
  ];
  // Audio language is not changed by a translated title or description.
  if (locale === "ru") groups.push({ language: "ru", intro: labels[locale].russianIntro, programs: russianPrograms(locale) });
  return <AcademyVideoLibraryClient locale={locale} groups={groups} />;
}
