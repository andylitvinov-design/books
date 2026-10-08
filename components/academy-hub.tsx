import Image from "next/image";
import { EnglishGuidedMeditations } from "@/components/english-guided-meditations";
import Link from "next/link";
import { ChevronRight } from "lucide-react";

import { CatalogShowcase, type CatalogShowcaseItem } from "@/components/catalog-showcase";
import { PublicConsultationCta } from "@/components/public-consultation-cta";
import { PublicSiteHeader } from "@/components/public-site-header";
import {
  academyCopy,
  academyDirections,
  academyDisplayTitle,
  recordsForDirection,
  mediaForRecord,
  youtubeIdFromUrl,
  videoRecords,
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

function AcademyRecordIndex({ items, label }: { items: AcademyItem[]; label: string }) {
  return (
    <section className="library-index-grid" aria-label={label}>
      {items.map((item) => (
        <Link className="library-index-card academy-index-card" href={item.href} key={item.key}>
          <span className="library-index-photo"><Image alt="" fill sizes="(max-width: 700px) 76px, 128px" src={item.image} /></span>
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
  const items: CatalogShowcaseItem[] = view === "videos"
    ? videoRecords(locale).map((record, index) => ({
        id: "academy-video-" + record.routeKey.replace(/[^a-z0-9]+/gi, "-"),
        title: academyDisplayTitle(record, locale),
        subtitle: statusLabel(record, locale),
        description: action.videoDescription,
        href: "/" + locale + "/academy/" + record.routeKey,
        image: recordImage(record, index),
        actionLabel: action.video,
        meta: statusLabel(record, locale),
      }))
    : [
        {
          id: "academy-featured-yggdrasil",
          title: locale === "ru" ? "Дао Рейки Иггдрасиль" : "DAO Reiki Yggdrasil",
          subtitle: action.featured,
          description: locale === "ru"
            ? "Полная система обучения: карта всех модулей, отдельный Базовый курс из 5 ступеней и подробная актуальная программа."
            : locale === "es"
              ? "Sistema completo: mapa de módulos, Curso Básico de 5 niveles y currículo actual detallado."
              : "The complete learning system: all modules, a dedicated 5-level Basic Course and the detailed current curriculum.",
          href: "/" + locale + "/academy/reiki/yggdrasil",
          image: "/academy/reiki-yggdrasil/source/basic-program.jpg",
          actionLabel: action.program,
        },
        {
          id: "academy-featured-tantra-reiki",
          title: locale === "ru" ? "Тантра Рейки" : "Tantra Reiki",
          subtitle: action.featured,
          description: locale === "ru"
            ? "Отдельная девятиступенчатая программа Тантра Рейки из архива школы, собранная в одном последовательном учебном маршруте."
            : locale === "es"
              ? "Programa independiente de Tantra Reiki en nueve niveles, organizado como una ruta formativa coherente."
              : "A separate nine-level Tantra Reiki program, organized as one coherent study path.",
          href: "/" + locale + "/academy/reiki/tantra-reiki",
          image: "/library/maya-mysteries/media/post-217-1.jpg",
          actionLabel: action.program,
        },
        {
          id: "academy-featured-temple-studies",
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
      <PublicSiteHeader locale={locale} />
      <nav className="library-media-switch" aria-label={text.title}>
        <Link aria-current={view === "programs" ? "page" : undefined} href={"/" + locale + "/academy"}>{text.programs}</Link>
        <Link aria-current={view === "videos" ? "page" : undefined} href={"/" + locale + "/academy?view=videos"}>{text.videos}</Link>
      </nav>
      <header className="library-heading">
        <p className="homeopathy-kicker">Holistic House</p>
        <h1>{text.title}</h1>
        <p>{text.lead}</p>
      </header>
      {locale === "en" && view === "videos" ? <EnglishGuidedMeditations /> : null}
      <CatalogShowcase items={items} label={view === "videos" ? text.videoCollections : text.allPrograms} />
      {view === "programs" ? (
        <p className="academy-archive-nav">
          <Link href={"/" + locale + "/academy/archive"}>
            {locale === "ru" ? "Архив прежних программ и мероприятий →" : locale === "es" ? "Archivo de programas y eventos anteriores →" : "Archive of past programs and events →"}
          </Link>
        </p>
      ) : null}
      <PublicConsultationCta locale={locale} />
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
      const rank = (id: string) => id === "reiki/yggdrasil" ? 0 : id === "reiki/tantra-reiki" ? 1 : 2;
      return rank(a.logicalId) - rank(b.logicalId);
    });
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
        <h1>{info.title[locale]}</h1>
        <p>{info.description[locale]}</p>
      </header>
      <AcademyRecordIndex items={items} label={info.title[locale]} />
      <PublicConsultationCta locale={locale} />
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
      <PublicConsultationCta locale={locale} />
    </main>
  );
}
