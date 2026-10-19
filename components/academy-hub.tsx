import { REIKI_FREE_COURSE_PATH } from "@/lib/academy/reiki-free-course";
import Image from "next/image";
import { cardArtworkUrl, hasCardArtwork } from "@/lib/public-card-artwork";
import { AcademyVideoCourses } from "@/components/academy-video-courses";
import Link from "next/link";
import { ChevronRight } from "lucide-react";

import type { AcademyCourseItem } from "@/components/academy-course-card-list";
import { AcademyDiscovery } from "@/components/academy-discovery";
import { AcademyCourseCapture } from "@/components/academy-course-capture";
import { PublicSiteHeader } from "@/components/public-site-header";
import {
  academyCopy,
  academyDirections,
  academyDisplayTitle,
  recordsForDirection,
  mediaForRecord,
  youtubeIdFromUrl,
  type AcademyDirectionId,
  type AcademySourceRecord,
  type AcademyView,
} from "@/data/academy/catalog";
import type { PublicLocale } from "@/lib/public-locales";

type AcademyItem = { key: string; title: string; href: string; image: string; meta?: string; };

// Use each published video's own frame. For text-only archive records, rotate
// distinct locally held source images within their appropriate study direction.
const imageDeck: Record<string, readonly string[]> = {
  reiki: [
    "/academy/reiki-yggdrasil/source/basic-program.jpg",
    "/academy/reiki-yggdrasil/source/advanced-shamanic-therapy.png",
    "/academy/reiki-yggdrasil/source/eastern-tradition.png",
    "/academy/reiki-yggdrasil/source/western-tradition.png",
    "/academy/reiki-yggdrasil/source/advanced-runes.png",
    "/academy/reiki-yggdrasil/source/slavic-tradition.png",
    "/academy/reiki-yggdrasil/source/toltec-tradition.jpg",
  ],
  mysteries: [
    "/library/maya-mysteries/media/post-244-1.jpg",
    "/library/maya-mysteries/media/post-249-1.jpg",
    "/library/maya-mysteries/media/post-217-1.jpg",
    "/library/maya-mysteries/media/post-229-1.jpg",
    "/library/maya-mysteries/media/post-226-1.jpg",
    "/academy/reiki-yggdrasil/source/temple-studies.png",
  ],
  symbolic: [
    "/academy/reiki-yggdrasil/source/advanced-runes.png",
    "/academy/reiki-yggdrasil/source/western-tradition.png",
    "/academy/reiki-yggdrasil/source/slavic-tradition.png",
    "/academy/reiki-yggdrasil/source/eastern-tradition.png",
    "/academy/reiki-yggdrasil/source/temple-studies.png",
    "/library/maya-egregor-gods/media/post-203-1.jpg",
  ],
  applied: [
    "/images/holistic-house/video-posters/constellations-en-v1.webp",
    "/images/holistic-house/video-posters/hypnotherapy-en-v1.webp",
    "/academy/reiki-yggdrasil/source/advanced-shamanic-therapy.png",
    "/academy/reiki-yggdrasil/source/temple-studies.png",
    "/library/maya-mysteries/media/post-217-1.jpg",
    "/library/maya-mysteries/media/post-249-1.jpg",
  ],
  school: [
    "/academy/reiki-yggdrasil/source/school-introduction.jpg",
    "/academy/reiki-yggdrasil/source/program-overview.jpg",
    "/academy/reiki-yggdrasil/source/basic-program.jpg",
    "/academy/reiki-yggdrasil/source/temple-studies.png",
  ],
  archive: [
    "/academy/reiki-yggdrasil/source/program-overview.jpg",
    "/academy/reiki-yggdrasil/source/school-introduction.jpg",
    "/library/maya-mysteries/media/post-229-1.jpg",
    "/academy/reiki-yggdrasil/source/toltec-tradition.jpg",
    "/library/maya-mysteries/media/post-217-1.jpg",
  ],
  videos: [
    "/images/holistic-house/video-posters/home-en-v2.webp",
    "/images/holistic-house/video-posters/services-en-v2.webp",
    "/images/holistic-house/video-posters/hypnotherapy-en-v1.webp",
    "/images/holistic-house/video-posters/constellations-en-v1.webp",
    "/images/holistic-house/video-posters/homeopathy-en-v2.webp",
  ],
};

function recordImage(record: AcademySourceRecord, index = 0) {
  const videoId = mediaForRecord(record)
    .map((item) => youtubeIdFromUrl(item.mediaUrl))
    .find((id): id is string => Boolean(id));
  if (videoId) return "https://i.ytimg.com/vi/" + videoId + "/hqdefault.jpg";
  const deck = imageDeck[record.direction];
  return deck?.[index % deck.length] ??
    academyDirections.find((item) => item.id === record.direction)?.image ??
    "/academy/reiki-yggdrasil/source/program-overview.jpg";
}

const academyActionCopy: Record<PublicLocale, { direction: string; video: string; program: string; videoDescription: string; featured: string }> = {
  en: {
    direction: "Explore this direction",
    video: "Open this video course",
    program: "Open program",
    videoDescription: "Open the preserved Academy video material, context and source notes.",
    featured: "Featured study program",
  },
  ru: {
    direction: "Открыть это направление",
    video: "Открыть видео-курс",
    program: "Открыть программу",
    videoDescription: "Откройте сохранённый видео-материал Академии, его контекст и информацию об источнике.",
    featured: "Основная программа обучения",
  },
  es: {
    direction: "Explorar esta área",
    video: "Abrir este videocurso",
    program: "Abrir programa",
    videoDescription: "Abre el material de video preservado de la Academia, su contexto y las notas de la fuente.",
    featured: "Programa formativo destacado",
  },
};

const academyCourseHints = {
  "en": {
    "opora": "Fourteen gentle daily practices help you notice tension and find moments of calm. Begin with three free check-ins to understand how you feel, then move through the lessons at your own pace.",
    "practitioner": "Follow five lessons: Flight to the Sun, Tantra Reiki, Kundalini Reiki, Reiki Yggdrasil and preparation for personal initiation. Try the guided meditations and request one introductory Level 1 as a gift; initiation is arranged separately with Andrey.",
    "tantraIntro": "Begin Tantra Reiki Level 1, Spring of Life, with an original guided meditation, a simple practice and seven study questions. The introduction is free; personal initiation is arranged separately with Andrey.",
    "yggdrasilIntro": "Discover Reiki Yggdrasil, its World Tree inspiration and introductory preparation practice. Study the materials for free, then discuss any personal Level 1 initiation directly with Andrey.",
    "yggdrasilFull": "Explore the full Reiki Yggdrasil pathway, including the five-level Basic Course and further study modules. See how the levels fit together, read the materials and choose where to continue.",
    "tantraFull": "A connected nine-level journey through Tantra Reiki, beginning with Spring of Life and moving toward deeper awareness and personal practice. Review the topics and materials for each level.",
    "kundaliniFull": "A three-level Kundalini Reiki path with introductory practices and original Paul Crick study materials. Start with Level 1, learn how the stages connect and arrange any teacher-led initiation separately.",
    "temple": "Seven connected stages explore ancient mystery traditions, myths, runes, Tarot and archetypal imagery. Learn their cultural background and use symbolic reflection to explore your own questions."
  },
  "ru": {
    "opora": "14 дней коротких практик помогут замечать напряжение и мягко возвращаться к спокойствию. Начните с трёх бесплатных проверок состояния, а затем проходите уроки в удобном для себя темпе.",
    "practitioner": "Пять последовательных уроков: «Полёт к Солнцу», Тантра Рейки, Кундалини Рейки, Рейки Иггдрасиль и подготовка к личной инициации. Попробуйте медитации и выберите одну вводную ступень в подарок; инициация согласуется с Андреем отдельно.",
    "tantraIntro": "Начните с первой ступени Тантра Рейки «Родник жизни»: авторская медитация, простая практика и семь вопросов по материалу. Введение бесплатно; личная инициация согласуется с Андреем отдельно.",
    "yggdrasilIntro": "Познакомьтесь с Рейки Иггдрасиль, образом Мирового дерева и подготовкой к первой практике. Вводные материалы бесплатны; личную инициацию первой ступени нужно согласовать с Андреем.",
    "yggdrasilFull": "Полная программа Рейки Иггдрасиль с базовым курсом из пяти ступеней и отдельными модулями дальнейшего обучения. Посмотрите последовательность, материалы и выберите следующий шаг.",
    "tantraFull": "Девять ступеней Тантра Рейки в едином учебном маршруте: от «Родника жизни» к дальнейшим практикам внимания и внутреннего опыта. Изучите описание и материалы каждой ступени.",
    "kundaliniFull": "Три ступени Кундалини Рейки, вводные практики и оригинальные материалы Пола Крика. Начните с первой ступени и при желании отдельно согласуйте личную инициацию.",
    "temple": "Семь взаимосвязанных этапов: древние мистерии, мифы, руны, Таро и архетипические образы. Изучайте традиции и используйте символическое исследование для осмысления личных вопросов."
  },
  "es": {
    "opora": "Catorce prácticas breves te ayudan a reconocer la tensión y volver poco a poco a la calma. Empieza con tres chequeos gratuitos de tu estado y avanza por las lecciones a tu ritmo.",
    "practitioner": "Recorre cinco lecciones: Vuelo hacia el Sol, Tantra Reiki, Kundalini Reiki, Reiki Yggdrasil y preparación para la iniciación personal. Prueba las meditaciones y solicita un Nivel 1 introductorio de regalo; la iniciación se acuerda con Andrey por separado.",
    "tantraIntro": "Comienza el Nivel 1 de Tantra Reiki, Manantial de Vida, con una meditación original, una práctica sencilla y siete preguntas. La introducción es gratuita; la iniciación personal se acuerda por separado.",
    "yggdrasilIntro": "Descubre Reiki Yggdrasil, su inspiración en el Árbol del Mundo y una preparación inicial para practicar. Estudia gratis los materiales y acuerda cualquier iniciación personal de Nivel 1 con Andrey.",
    "yggdrasilFull": "Explora Reiki Yggdrasil completo: un Curso Básico de cinco niveles y otros módulos de formación. Conoce las etapas, los materiales y el siguiente paso en tu camino.",
    "tantraFull": "Un recorrido de nueve niveles de Tantra Reiki: desde Manantial de Vida hacia prácticas de atención y exploración interior. Consulta los temas y materiales de cada nivel.",
    "kundaliniFull": "Un recorrido de tres niveles de Kundalini Reiki con prácticas iniciales y materiales originales de Paul Crick. Empieza por el Nivel 1 y acuerda cualquier iniciación personal por separado.",
    "temple": "Siete etapas conectan antiguas tradiciones, mitos, runas, Tarot e imágenes arquetípicas. Conoce su contexto cultural y explora tus preguntas mediante la reflexión simbólica."
  }
} as const satisfies Record<PublicLocale, Record<string, string>>;

function AcademyRecordIndex({ items, label }: { items: AcademyItem[]; label: string }) {
  return (
    <section className="library-index-grid" aria-label={label}>
      {items.map((item) => (
        <Link className="library-index-card academy-index-card" href={item.href} key={item.key}>
          <span className="library-index-photo"><Image alt="" fill sizes="(max-width: 700px) 76px, 128px" src={cardArtworkUrl(item.image)} unoptimized={hasCardArtwork(item.image)} /></span>
          <span className="academy-index-copy">
            <span className="library-index-title">{item.title}</span>
            {item.meta ? <small>{item.meta}</small> : null}
          </span>
          <ChevronRight aria-hidden="true" />
        </Link>
      ))}
    </section>
  );
}

function statusLabel(record: AcademySourceRecord, locale: PublicLocale) {
  return academyCopy[locale][record.status] ?? academyCopy[locale].historical;
}

export function AcademyBackLink({ locale }: { locale: PublicLocale }) {
  return <Link className="library-back-link" href={"/" + locale + "/academy"}>← {academyCopy[locale].back}</Link>;
}

export function AcademyHub({ locale, view = "programs" }: { locale: PublicLocale; view?: AcademyView }) {
  const text = academyCopy[locale];
  const action = academyActionCopy[locale];
  const hints = academyCourseHints[locale];
  const items: AcademyCourseItem[] = [
    {
      id: "academy-free-opora",
      detailsHint: hints.opora,
      title: locale === "ru" ? "ОПОРА · Антистресс" : locale === "es" ? "OPORA · Antiestrés" : "OPORA · Stress Relief",
      subtitle: locale === "ru" ? "14 КОРОТКИХ ЗАНЯТИЙ" : locale === "es" ? "14 LECCIONES" : "14 GENTLE LESSONS",
      description: locale === "ru" ? "14 коротких занятий: мягко замечать напряжение и находить свои способы восстановления." : locale === "es" ? "14 lecciones cortas para afrontar el estrés cotidiano con pasos sencillos." : "14 gentle lessons to notice everyday stress and practise small steps towards calm.",
      href: "/" + locale + "/courses/antistress",
      courseHref: "/" + (locale === "es" ? "en" : locale) + "/app/course?program=stress",
      image: "/images/holistic-house/course-focus-mountain-boy.webp",
      duration: locale === "ru" ? "14 дней · в своём темпе" : locale === "es" ? "14 días · a tu ritmo" : "14 days · at your pace",
      free: true,
      actionLabel: locale === "ru" ? "Пройти курс" : locale === "es" ? "Empezar curso" : "Take course",
    },
        {
          id: "academy-featured-principles-energywork",
          detailsHint: hints.practitioner,
          title: locale === "ru" ? "Бесплатный курс «Практик Рейки»: обучение и инициация" : locale === "es" ? "Curso gratis Reiki Practitioner: estudio e iniciación" : "Free Course Reiki Practitioner: Study & Initiation",
          subtitle: locale === "ru" ? "5 УРОКОВ · 3 СИСТЕМЫ РЕЙКИ" : locale === "es" ? "5 LECCIONES · 3 SISTEMAS DE REIKI" : "5 LESSONS · 3 REIKI SYSTEMS",
          description: locale === "ru"
            ? "Пять бесплатных уроков о Тантра Рейки, Кундалини Рейки и Рейки Иггдрасиль. После обучения можно запросить одну вводную инициацию 1-й ступени в подарок — по согласованию."
            : locale === "es"
              ? "Cinco lecciones gratuitas de Tantra, Kundalini y Yggdrasil Reiki. Después podrás solicitar una iniciación introductoria de Nivel 1, previa confirmación."
              : "Five free lessons explore Tantra, Kundalini and Yggdrasil Reiki. Afterwards, request one complimentary Level 1 introduction, with personal initiation arranged separately.",
          href: "/" + locale + "/academy/principles-of-energywork",
          courseHref: REIKI_FREE_COURSE_PATH,
          free: true,
          duration: locale === "ru" ? "5 уроков · в своём темпе" : locale === "es" ? "5 lecciones · a tu ritmo" : "5 lessons · at your pace",
          image: "/academy/reiki-yggdrasil/source/program-overview.jpg",
          actionLabel: locale === "ru" ? "Начать бесплатный курс" : locale === "es" ? "Empezar gratis" : "Start the free course",
        },
        {
          id: "academy-free-tantra-introduction",
          detailsHint: hints.tantraIntro,
          title: locale === "ru" ? "Тантра Рейки · 1 ступень" : locale === "es" ? "Tantra Reiki · Nivel 1" : "Tantra Reiki · Level 1",
          subtitle: locale === "ru" ? "ВВЕДЕНИЕ · 1 СТУПЕНЬ" : locale === "es" ? "INTRODUCCIÓN · NIVEL 1" : "INTRODUCTION · LEVEL 1",
          description: locale === "ru" ? "Знакомство с практиками первой ступени. Личная инициация — по согласованию." : locale === "es" ? "Conoce las prácticas del primer nivel. La iniciación personal se confirma aparte." : "Explore the Level 1 practices. Personal initiation is arranged separately.",
          href: "/" + locale + "/academy/reiki/tantra-reiki/free-initiation",
          courseHref: REIKI_FREE_COURSE_PATH,
          free: true,
          image: "/images/holistic-house/tantra-reiki-yin-yang-cover.svg",
          actionLabel: locale === "ru" ? "Пройти курс" : locale === "es" ? "Empezar curso" : "Take course",
        },
        {
          id: "academy-free-yggdrasil-introduction",
          detailsHint: hints.yggdrasilIntro,
          title: locale === "ru" ? "Рейки Иггдрасиль · 1 ступень" : locale === "es" ? "Reiki Yggdrasil · Nivel 1" : "Reiki Yggdrasil · Level 1",
          subtitle: locale === "ru" ? "ВВЕДЕНИЕ · 1 СТУПЕНЬ" : locale === "es" ? "INTRODUCCIÓN · NIVEL 1" : "INTRODUCTION · LEVEL 1",
          description: locale === "ru" ? "Материалы первой ступени и подготовка к практике. Инициация — отдельно." : locale === "es" ? "Primeras lecciones y preparación. Iniciación personal por separado." : "Discover the first lessons and preparation. Initiation is arranged separately.",
          href: "/" + locale + "/academy/reiki/yggdrasil/free-initiation",
          courseHref: REIKI_FREE_COURSE_PATH,
          free: true,
          image: "/academy/reiki-yggdrasil/source/basic-program.jpg",
          actionLabel: locale === "ru" ? "Пройти курс" : locale === "es" ? "Empezar curso" : "Take course",
        },
        {
          id: "academy-featured-yggdrasil",
          detailsHint: hints.yggdrasilFull,
          title: locale === "ru" ? "Дао Рейки Иггдрасиль" : "DAO Reiki Yggdrasil",
          subtitle: action.featured,
          description: locale === "ru"
            ? "Полная система обучения: карта всех модулей, отдельный Базовый курс из 5 ступеней и подробная актуальная программа."
            : locale === "es"
              ? "Sistema completo: mapa de módulos, Curso Básico de 5 niveles y currículo actual detallado."
              : "The complete learning system: all modules, a dedicated 5-level Basic Course and the detailed current curriculum.",
          href: "/" + locale + "/academy/reiki/yggdrasil",
          courseHref: "/" + locale + "/academy/reiki/yggdrasil/basic-course",
          image: "/academy/reiki-yggdrasil/source/basic-program.jpg",
          actionLabel: action.program,
        },
        {
          id: "academy-featured-tantra-reiki",
          detailsHint: hints.tantraFull,
          title: locale === "ru" ? "Тантра Рейки" : "Tantra Reiki",
          subtitle: action.featured,
          description: locale === "ru"
            ? "Отдельная девятиступенчатая программа Тантра Рейки из архива школы, собранная в одном последовательном учебном маршруте."
            : locale === "es"
              ? "Programa independiente de Tantra Reiki en nueve niveles, organizado como una ruta formativa coherente."
              : "A separate nine-level Tantra Reiki program, organized as one coherent study path.",
          href: "/" + locale + "/academy/reiki/tantra-reiki",
          courseHref: REIKI_FREE_COURSE_PATH,
          image: "/images/holistic-house/tantra-reiki-yin-yang-cover.svg",
          actionLabel: action.program,
        },
        {
          id: "academy-featured-kundalini-reiki",
          detailsHint: hints.kundaliniFull,
          title: locale === "ru" ? "Кундалини Рейки" : "Kundalini Reiki",
          subtitle: action.featured,
          description: locale === "ru"
            ? "Кундалини Рейки — Базовый курс (1–3 ступень)."
            : locale === "es"
              ? "Kundalini Reiki — curso básico de tres niveles."
              : "Explore the three-level Kundalini Reiki learning path, its introductory practices and next steps.",
          href: "/" + locale + "/academy/reiki/kundalini-reiki",
          courseHref: "/" + locale + "/academy/reiki/kundalini-reiki/free-initiation",
          image: "/academy/kundalini-reiki/kundalini-manual-level-2.jpg",
          actionLabel: action.program,
        },
        {
          id: "academy-featured-temple-studies",
          detailsHint: hints.temple,
          title: locale === "ru" ? "Temple Studies — Храмовые традиции" : locale === "es" ? "Temple Studies — Tradiciones del Templo" : "Temple Studies",
          subtitle: action.featured,
          description: locale === "ru"
            ? "Единый путь из 7 этапов: от основ мистерий и культурных традиций через руны и Таро — к архетипической практике и применению к личным запросам."
            : locale === "es"
              ? "Un programa de siete etapas conectadas: misterios antiguos, runas y Tarot, experiencia arquetípica y aplicación personal."
              : "One progressive seven-stage course: from ancient mysteries and symbols to inner archetypal work and practical integration.",
          href: "/" + locale + "/academy/temple-studies",
          image: "/academy/reiki-yggdrasil/source/temple-studies.png",
          actionLabel: action.program,
        },
      ];

  return (
    <main className="library-shell academy-shell" lang={locale}>
      <PublicSiteHeader locale={locale} showAssessmentStrip={false} />
      <AcademyDiscovery locale={locale} view={view} items={items} label={text.allPrograms} />
      {view === "videos" ? (
        <section id="academy-video-courses">
          <AcademyVideoCourses locale={locale} />
        </section>
      ) : null}
      {view === "programs" ? (
        <p className="academy-archive-nav">
          <Link href={"/" + locale + "/academy/archive"}>
            {locale === "ru" ? "Архив прежних программ и мероприятий →" : locale === "es" ? "Archivo de programas y eventos anteriores →" : "Archive of past programs and events →"}
          </Link>
        </p>
      ) : null}
      <AcademyCourseCapture locale={locale} />
    </main>
  );
}

export function AcademyDirection({ locale, direction }: { locale: PublicLocale; direction: AcademyDirectionId }) {
  const info = academyDirections.find((item) => item.id === direction);
  if (!info) return null;
  const records = recordsForDirection(direction, locale)
    .filter((record) => direction !== "reiki" || record.logicalId !== "reiki/master-shamanic-healing")
    .sort((a, b) => {
      if (direction !== "reiki") return 0;
      const rank = (id: string) => id === "reiki/yggdrasil" ? 0 : id === "reiki/tantra-reiki" ? 1 : id === "reiki/kundalini-reiki" ? 2 : 3;
      return rank(a.logicalId) - rank(b.logicalId);
    });
  const items: AcademyItem[] = records.map((record, index) => ({
    key: record.logicalId,
    title: academyDisplayTitle(record, locale),
    href: "/" + locale + "/academy/" + record.routeKey,
    image: recordImage(record, index),
    meta: statusLabel(record, locale),
  }));
  if (direction === "reiki") {
    items.unshift({
      key: "principles-of-energywork",
      title: locale === "ru" ? "Бесплатный курс «Практик Рейки»: обучение и инициация" : locale === "es" ? "Curso gratis Reiki Practitioner: estudio e iniciación" : "Free Course Reiki Practitioner: Study & Initiation",
      href: "/" + locale + "/academy/principles-of-energywork",
      image: "/academy/reiki-yggdrasil/source/program-overview.jpg",
      meta: locale === "ru" ? "Бесплатный вводный курс" : locale === "es" ? "Curso introductorio gratis" : "Free introductory course",
    });
  }
  return (
    <main className="library-shell academy-shell" lang={locale}>
      <PublicSiteHeader locale={locale} /><AcademyBackLink locale={locale} />
      <header className="library-heading academy-direction-heading">
        <p className="homeopathy-kicker">{academyCopy[locale].title}</p>
        <h1>{info.title[locale]}</h1>
        <p>{info.description[locale]}</p>
      </header>
      <AcademyRecordIndex items={items} label={info.title[locale]} />
      <AcademyCourseCapture locale={locale} />
    </main>
  );
}

export function AcademyPrefixDirectory({ locale, prefix, title, description }: { locale: PublicLocale; prefix: string; title: string; description: string }) {
  const records = [...new Map(
    recordsForDirection("symbolic", locale)
      .concat(recordsForDirection("mysteries", locale))
      .concat(recordsForDirection("applied", locale))
      .filter((record) => record.routeKey.startsWith(prefix + "/"))
      .map((record) => [record.logicalId, record]),
  ).values()];
  const items = records.map((record, index) => ({
    key: record.logicalId,
    title: academyDisplayTitle(record, locale),
    href: "/" + locale + "/academy/" + record.routeKey,
    image: recordImage(record, index),
    meta: statusLabel(record, locale),
  }));
  return (
    <main className="library-shell academy-shell" lang={locale}>
      <PublicSiteHeader locale={locale} /><AcademyBackLink locale={locale} />
      <header className="library-heading academy-direction-heading">
        <p className="homeopathy-kicker">{academyCopy[locale].title}</p>
        <h1>{title}</h1>
        <p>{description}</p>
      </header>
      <AcademyRecordIndex items={items} label={title} />
      <AcademyCourseCapture locale={locale} />
    </main>
  );
}
