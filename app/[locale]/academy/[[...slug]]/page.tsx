import type { Metadata } from "next";
import { notFound, permanentRedirect, redirect } from "next/navigation";

import { AcademyDirection, AcademyHub } from "@/components/academy-hub";
import { TempleStudies } from "@/components/temple-studies";
import { templeLegacyAnchors } from "@/data/academy/temple-studies-curriculum";
import { AcademyRecordPage, makeFacultiesRecord } from "@/components/academy-record-page";
import { YggdrasilModuleLandingPage } from "@/components/yggdrasil-module-landing";
import { YggdrasilBasicCourseDescription } from "@/components/yggdrasil-basic-course-description";
import { YggdrasilSourceArchivePage } from "@/components/yggdrasil-source-archive";
import { YggdrasilFreeInitiation } from "@/components/yggdrasil-free-initiation";
import { YggdrasilSuperSkillsSourcesPage } from "@/components/yggdrasil-superskills-sources-page";
import { academyCopy, academyDirections, academyDisplayTitle, academyPublicBlocks, findAcademyRecord, isPublicLocale, mediaForRecord, youtubeIdFromUrl, type AcademyDirectionId, type AcademyView } from "@/data/academy/catalog";
import { yggdrasilModuleBySlug } from "@/data/academy/yggdrasil-module-map";
import { metadataBaseFor } from "@/data/site-metadata";
import type { PublicLocale } from "@/lib/public-locales";

type Props = { params: Promise<{ locale: string; slug?: string[] }>; searchParams: Promise<{ view?: string | string[] }> };

const directionPath: Record<string, AcademyDirectionId> = { reiki: "reiki", mysteries: "mysteries", symbolic: "symbolic", applied: "applied", path: "school", archive: "archive" };
const prefixCopy: Record<string, Record<PublicLocale, { title: string; description: string }>> = {
  traditions: {
    en: { title: "Ancient traditions", description: "Historical teaching material organized by cultural tradition." },
    ru: { title: "Древние традиции", description: "Исторические учебные материалы, собранные по культурным традициям." },
    es: { title: "Tradiciones antiguas", description: "Material histórico organizado por tradición cultural." },
  },
  runes: {
    en: { title: "Runes", description: "Runic study programs preserved from the Academy teaching archives." },
    ru: { title: "Руны", description: "Учебные программы по рунам из архивов Академии." },
    es: { title: "Runas", description: "Programas de estudio de runas del archivo de PsiTrends." },
  },
  elements: {
    en: { title: "Elements", description: "Elemental and water-study programs from the historical Academy." },
    ru: { title: "Стихии", description: "Программы по стихиям и воде из исторической Академии." },
    es: { title: "Elementos", description: "Programas históricos sobre elementos y agua." },
  },
};

function routeKey(slug: string[] | undefined) { return (slug ?? []).join("/"); }
function canonicalPath(locale: PublicLocale, slug: string[] | undefined) { const suffix = slug?.length ? "/" + slug.join("/") : ""; return "/" + locale + "/academy" + suffix; }
function yggdrasilChild(slug: string[] | undefined) { return slug?.length === 3 && slug[0] === "reiki" && slug[1] === "yggdrasil" ? slug[2] : null; }

function pageTitle(locale: PublicLocale, slug: string[] | undefined) {
  if (!slug?.length) return academyCopy[locale].title;
  if (routeKey(slug) === "temple-studies") return locale === "ru" ? "Temple Studies — Храмовые традиции" : locale === "es" ? "Temple Studies — Tradiciones del Templo" : "Temple Studies";
  const child = yggdrasilChild(slug);
  if (routeKey(slug) === "reiki/yggdrasil/basic-course/description") return locale === "ru" ? "Рейки Иггдрасиль — книга базового курса I–V ступени" : locale === "es" ? "Libro: Reiki Yggdrasil — Curso Básico I–V" : "Reiki Yggdrasil — Basic Course Book I–V";
  if (child === "free-initiation") return locale === "ru" ? "Как получить бесплатную инициацию 1-й ступени Рейки Иггдрасиль" : locale === "es" ? "Cómo recibir la iniciación gratis de Reiki Yggdrasil Nivel 1" : "How to receive free Reiki Yggdrasil Level 1 initiation";
  if (child === "superskills-sources") return locale === "ru" ? "Первоисточники SuperSkills — Рейки Иггдрасиль" : locale === "es" ? "Fuentes originales de SuperSkills · Reiki Yggdrasil" : "Reiki Yggdrasil · Original SuperSkills resources";
  if (child === "archive") return locale === "ru" ? "Рейки Иггдрасиль — полный исторический текст" : locale === "es" ? "Reiki Yggdrasil — fuente histórica completa" : "Reiki Yggdrasil — Complete Historical Source";
  if (child) {
    const courseModule = yggdrasilModuleBySlug(child);
    if (courseModule) return courseModule.title[locale];
  }
  if (slug.length === 1 && directionPath[slug[0]]) return academyDirections.find((item) => item.id === directionPath[slug[0]])?.title[locale] ?? academyCopy[locale].title;
  if (slug.length === 1 && prefixCopy[slug[0]]) return prefixCopy[slug[0]][locale].title;
  if (slug.length === 1 && slug[0] === "videos") return academyCopy[locale].videoCollections;
  const record = findAcademyRecord(routeKey(slug), locale);
  if (record) return academyDisplayTitle(record, locale);
  if (routeKey(slug) === "history/faculties") return locale === "ru" ? "Исторические факультеты и традиции" : locale === "es" ? "Facultades y tradiciones históricas" : "Historical faculties & traditions";
  return academyCopy[locale].title;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale: rawLocale, slug } = await params;
  if (!isPublicLocale(rawLocale)) return { title: "Not found" };
  const locale = rawLocale;
  const path = canonicalPath(locale, slug);
  const title = pageTitle(locale, slug);
  const languageSuffix = slug?.length ? "/" + slug.join("/") : "";
  const child = yggdrasilChild(slug);
  const courseModule = child ? yggdrasilModuleBySlug(child) : null;
  const description = child === "superskills-sources"
    ? locale === "ru" ? "Упорядоченная библиотека 19 исходных материалов SuperSkills: базовый и инструкторский курсы, практика, FAQ, отзывы, инициация." : locale === "es" ? "Biblioteca de 19 fuentes Reiki Yggdrasil, organizadas por cursos, ejercicios, iniciación y testimonios." : "Nineteen original SuperSkills source pages organized by Basic Course, Instructor Course, exercises, FAQ, initiation and testimonials."
    : child === "free-initiation"
    ? locale === "ru" ? "Как бесплатно получить инициацию 1-й ступени Рейки Иггдрасиль: 3 варианта, материалы для чтения, 7 контрольных вопросов и запись к преподавателю." : locale === "es" ? "Guía de iniciación gratuita Reiki Yggdrasil Nivel 1: tres formas de empezar, lecturas y siete preguntas." : "Free Level 1 Reiki Yggdrasil initiation: three ways to study, reading materials, seven preparation questions and teacher contact."
    : routeKey(slug) === "temple-studies"
    ? locale === "ru" ? "Единый курс Temple Studies из семи этапов: основы мистерий, Греция, Египет, традиции мира, руны и Таро, инициации, архетипическая практика и интеграция." : locale === "es" ? "Temple Studies: siete etapas de misterios antiguos, runas, Tarot y práctica arquetípica integrada." : "Temple Studies: a seven-stage journey from ancient mysteries and runes to archetypal practice and personal integration."
    : routeKey(slug) === "reiki/yggdrasil/basic-course/description"
    ? locale === "ru" ? "Полная книга-методичка по базовому курсу Рейки Иггдрасиль I–V: все 38 страниц, настройки и упражнения." : locale === "es" ? "Libro completo del Curso Básico de Reiki Yggdrasil, niveles I–V, en ruso original, con índice; resumen en español." : "Complete original Russian Reiki Yggdrasil Basic Course book, Levels I–V, with all attunements and exercises; English overview."
    : courseModule
    ? courseModule.lead[locale]
    : routeKey(slug) === "reiki/yggdrasil"
      ? locale === "ru"
        ? "Полная актуальная структура Reiki Yggdrasil: 7 модулей, 37 ступеней, 177 настроек, отдельные лендинги и архив видеолекций."
        : locale === "es"
          ? "Estructura actual completa de Reiki Yggdrasil: 7 módulos, 37 etapas, 177 sintonizaciones y páginas separadas."
          : "Complete current Reiki Yggdrasil curriculum: 7 modules, 37 steps, 177 attunements, separate landing pages and the video archive."
      : academyCopy[locale].lead;
  return { metadataBase: metadataBaseFor(), title: title + " — Holistic House", description, alternates: { canonical: path, languages: { en: "/en/academy" + languageSuffix, ru: "/ru/academy" + languageSuffix, es: "/es/academy" + languageSuffix } } };
}

export default async function AcademyPage({ params, searchParams }: Props) {
  const [{ locale: rawLocale, slug }, query] = await Promise.all([params, searchParams]);
  if (!isPublicLocale(rawLocale)) notFound();
  const locale = rawLocale;
  const key = routeKey(slug);
  const child = yggdrasilChild(slug);

  if (!slug?.length) {
    const rawView = Array.isArray(query.view) ? query.view[0] : query.view;
    const view: AcademyView = rawView === "videos" ? "videos" : "programs";
    return <AcademyHub locale={locale} view={view} />;
  }

  if (key === "temple-studies") return <TempleStudies locale={locale} />;
  if (key === "reiki/yggdrasil/basic-course/description") return <YggdrasilBasicCourseDescription locale={locale} />;
  if (key === "reiki/master-shamanic-healing") redirect("/" + locale + "/academy/reiki/yggdrasil/basic-course");
  if (child === "archive") return <YggdrasilSourceArchivePage locale={locale} />;
  if (child === "free-initiation") return <YggdrasilFreeInitiation locale={locale} />;
  if (child === "superskills-sources") return <YggdrasilSuperSkillsSourcesPage locale={locale} />;
  if (child) {
    const courseModule = yggdrasilModuleBySlug(child);
    if (courseModule) return <YggdrasilModuleLandingPage locale={locale} module={courseModule} />;
  }

  if (slug.length === 1 && slug[0] === "videos") return <AcademyHub locale={locale} view="videos" />;
  if (slug.length === 1 && templeLegacyAnchors[slug[0]]) permanentRedirect("/" + locale + "/academy/temple-studies#temple-" + templeLegacyAnchors[slug[0]]);
  if (slug.length === 1 && directionPath[slug[0]]) return <AcademyDirection locale={locale} direction={directionPath[slug[0]]} />;
  if (key === "history/faculties") { const history = findAcademyRecord("history", locale); if (!history) notFound(); return <AcademyRecordPage locale={locale} record={makeFacultiesRecord(history, locale)} />; }

  const record = findAcademyRecord(key, locale);
  if (!record) notFound();
  const sectionForDirection: Partial<Record<typeof record.direction, string>> = { mysteries: "traditions", symbolic: "symbols", applied: "practice", school: "path" };
  const templeAnchor = sectionForDirection[record.direction];
  const visibleBody = academyPublicBlocks(record, locale).filter((block) => block.type === "p" || block.type === "li");
  const hasVideo = mediaForRecord(record).some((item) => Boolean(youtubeIdFromUrl(item.mediaUrl)));
  if (templeAnchor && visibleBody.length < 2 && !hasVideo) permanentRedirect("/" + locale + "/academy/temple-studies#" + templeAnchor);
  return <AcademyRecordPage locale={locale} record={record} />;
}
