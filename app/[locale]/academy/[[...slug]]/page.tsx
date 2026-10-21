import type { Metadata } from "next";
import "@/app/academy.css";
import "@/app/reiki-landing-screens.css";
import "@/app/yggdrasil-basic-description.css";
import "@/app/temple-studies.css";
import { notFound, permanentRedirect, redirect } from "next/navigation";

import { AcademyDirection, AcademyHub } from "@/components/academy-hub";
import { PublicGrowthCourses } from "@/components/public-growth-courses";
import PublicPractitionerCourses from "@/components/public-practitioner-courses";
import { KundaliniReikiCourse } from "@/components/kundalini-reiki-course";
import { PrinciplesOfEnergywork, KundaliniFreeInitiation } from "@/components/principles-of-energywork";
import { EnergyworkAiLearner } from "@/components/energywork-ai-learner";
import { TempleStudies } from "@/components/temple-studies";
import { templeLegacyAnchors } from "@/data/academy/temple-studies-curriculum";
import { AcademyRecordPage, makeFacultiesRecord } from "@/components/academy-record-page";
import { YggdrasilModuleLandingPage } from "@/components/yggdrasil-module-landing";
import { YggdrasilBasicCourseDescription } from "@/components/yggdrasil-basic-course-description";
import { YggdrasilSourceArchivePage } from "@/components/yggdrasil-source-archive";
import { YggdrasilFreeInitiation } from "@/components/yggdrasil-free-initiation";
import { TantraFreeInitiation } from "@/components/tantra-free-initiation";
import { ReikiReferralLanding } from "@/components/reiki-referral-landing";
import { YggdrasilSuperSkillsSourcesPage } from "@/components/yggdrasil-superskills-sources-page";
import { academyCopy, academyDirections, academyDisplayTitle, academyPublicBlocks, findAcademyRecord, isPublicLocale, mediaForRecord, youtubeIdFromUrl, type AcademyDirectionId, type AcademyView } from "@/data/academy/catalog";
import { yggdrasilModuleBySlug } from "@/data/academy/yggdrasil-module-map";
import { metadataBaseFor } from "@/data/site-metadata";
import { seoMetaForAcademyRoute } from "@/data/academy/seo-overrides";
import type { PublicLocale } from "@/lib/public-locales";

type Props = { params: Promise<{ locale: string; slug?: string[] }>; searchParams: Promise<{ view?: string | string[]; start?: string | string[] }> };

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
  if (routeKey(slug) === "free-ai-courses") return locale === "ru" ? "Бесплатные ИИ-курсы" : locale === "es" ? "Cursos de IA gratuitos" : "Free AI Courses";
  if (routeKey(slug) === "principles-of-energywork/learn") return locale === "ru" ? "Практик Рейки — бесплатный интерактивный курс" : locale === "es" ? "Reiki Practitioner — curso interactivo gratis" : "Reiki Practitioner — free interactive course";
  if (routeKey(slug) === "principles-of-energywork") return locale === "ru" ? "Бесплатный курс «Практик Рейки»: обучение и инициация" : locale === "es" ? "Curso gratis Reiki Practitioner: estudio e iniciación" : "Free Course Reiki Practitioner: Study & Initiation";
  if (routeKey(slug) === "reiki/kundalini-reiki/free-initiation") return locale === "ru" ? "Кундалини Рейки — бесплатная инициация 1-й ступени" : locale === "es" ? "Kundalini Reiki — iniciación gratis Nivel 1" : "Kundalini Reiki — Free Level 1 Initiation";
  if (routeKey(slug) === "temple-studies") return locale === "ru" ? "Temple Studies — Храмовые традиции" : locale === "es" ? "Temple Studies — Tradiciones del Templo" : "Temple Studies";
  if (routeKey(slug) === "reiki/kundalini-reiki") return locale === "ru" ? "Кундалини Рейки — 3 ступени" : locale === "es" ? "Kundalini Reiki — 3 niveles" : "Kundalini Reiki — 3 levels";
  const child = yggdrasilChild(slug);
  if (routeKey(slug) === "reiki/yggdrasil/basic-course/description") return locale === "ru" ? "Рейки Иггдрасиль — книга базового курса I–V ступени" : locale === "es" ? "Libro: Reiki Yggdrasil — Curso Básico I–V" : "Reiki Yggdrasil — Basic Course Book I–V";
  if (routeKey(slug) === "reiki/free-practitioner-course") return locale === "ru" ? "Тантра Рейки и энергетические практики — бесплатный курс и инициация" : locale === "es" ? "Tantra Reiki — curso gratis e iniciación de Nivel 1" : "Tantra Reiki & Energywork — Free Course and Level 1 Initiation";
  if (routeKey(slug) === "reiki/tantra-reiki/free-initiation") return locale === "ru" ? "Тантра Рейки — бесплатная инициация 1-й ступени" : locale === "es" ? "Tantra Reiki — iniciación gratuita de Nivel 1" : "Tantra Reiki — Free Level 1 Initiation";
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
  const description = routeKey(slug) === "principles-of-energywork/learn"
    ? locale === "ru" ? "Бесплатный интерактивный курс «Практик Рейки»: пять уроков, авторские медитации и практические задания." : locale === "es" ? "Curso interactivo gratis Reiki Practitioner: cinco lecciones, meditaciones originales y ejercicios." : "Free Reiki Practitioner study course: five lessons, original guided meditations and practical exercises."
    : routeKey(slug) === "free-ai-courses"
    ? locale === "ru" ? "Бесплатные образовательные курсы Holistic House: ОПОРА Антистресс, 14 занятий и личный прогресс в кабинете." : locale === "es" ? "Cursos gratuitos de Holistic House: OPORA Antiestrés, 14 lecciones y seguimiento personal." : "Free Holistic House courses: OPORA Stress Relief, 14 lessons, guided practices and your private course progress."
    : routeKey(slug) === "principles-of-energywork"
    ? locale === "ru" ? "Бесплатный курс «Практик Рейки»: пять уроков Тантра Рейки, Кундалини Рейки и Рейки Иггдрасиль, медитации и возможность согласовать вводную инициацию первой ступени." : locale === "es" ? "Reiki Practitioner gratis: cinco lecciones de Tantra, Kundalini y Yggdrasil Reiki y solicitud de iniciación introductoria de Nivel 1 previa confirmación." : "Free Reiki Practitioner: five lessons in Tantra, Kundalini and Yggdrasil Reiki, original meditations and a personally arranged introductory Level 1 initiation."
    : routeKey(slug) === "reiki/kundalini-reiki/free-initiation"
    ? locale === "ru" ? "Бесплатная вводная первая ступень Кундалини Рейки: обучение по исходной методичке Пола Крика и заявка Андрею без email и регистрации." : locale === "es" ? "Kundalini Reiki Nivel 1: materiales originales, manual de Paul Crick y solicitud gratuita de iniciación introductoria con Andrey." : "Kundalini Reiki free Level 1 introduction: study the original Paul Crick manual and ask Andrey for a teacher-guided initiation; no signup required."
    : routeKey(slug) === "reiki/free-practitioner-course"
    ? locale === "ru" ? "Бесплатный курс практик Рейки: пять уроков с Андреем Литвиновым, Тантра Рейки, Кундалини Рейки и Рейки Иггдрасиль. Бесплатная вводная инициация I ступени после курса по согласованию." : locale === "es" ? "Curso gratuito de Tantra Reiki y energía: cinco lecciones con Andrey Litvinov e iniciación introductoria gratuita de Nivel 1 previa confirmación." : "Free five-lesson Tantra Reiki and energywork course with Andrey Litvinov. Practise three Reiki systems and arrange a free introductory Level 1 initiation after completion."
    : routeKey(slug) === "reiki/tantra-reiki/free-initiation"
    ? locale === "ru" ? "Тантра Рейки: бесплатная или личная инициация первой ступени, 7 вопросов, оригинальная практика Андрея, 9 ступеней и PDF." : locale === "es" ? "Tantra Reiki: iniciación gratis o personal, siete preguntas, vídeo original de Andrey, nueve niveles y PDF." : "Tantra Reiki Level 1: free or personal initiation, seven study questions, Andrey’s original video, nine levels and PDF."
    : routeKey(slug) === "reiki/kundalini-reiki"
    ? locale === "ru" ? "Кундалини Рейки — базовый курс 1–3 ступени. Исходная методичка Kundalini Reiki Manual, Paul Crick, 24 страницы, PDF." : locale === "es" ? "Kundalini Reiki 1–3. Kundalini Reiki Manual de Paul Crick, PDF original de 24 páginas." : "Kundalini Reiki 1–3. Original Kundalini Reiki Manual by Paul Crick, 24-page PDF, extra attunements and Boosters."
    : child === "superskills-sources"
    ? locale === "ru" ? "Упорядоченная библиотека 19 исходных материалов SuperSkills: базовый и инструкторский курсы, практика, FAQ, отзывы, инициация." : locale === "es" ? "Biblioteca de 19 fuentes Reiki Yggdrasil, organizadas por cursos, ejercicios, iniciación y testimonios." : "Nineteen original SuperSkills source pages organized by Basic Course, Instructor Course, exercises, FAQ, initiation and testimonials."
    : child === "free-initiation"
    ? locale === "ru" ? "Рейки Иггдрасиль: почему начать, бесплатная или личная инициация, 7 вопросов, видео Андрея, материалы и единая форма заявки." : locale === "es" ? "Reiki Yggdrasil Nivel 1: iniciación gratis o personal, siete preguntas, vídeo de Andrey, materiales y formulario único." : "Reiki Yggdrasil Level 1: free or personal initiation, seven questions, Andrey’s original video, course materials and one application form."
    : routeKey(slug) === "temple-studies"
    ? locale === "ru" ? "Temple Studies: выберите традицию и канал божества. Медитация-инициация, личная или групповая мистерия-расстановка; семь дополнительных учебных глав." : locale === "es" ? "Temple Studies: elige una tradición, una deidad y meditación-iniciación, misterio personal o grupal; siete capítulos opcionales." : "Temple Studies: choose a Greek, Roman, Egyptian or other tradition, a deity channel, and a meditation-initiation, personal or group Mystery Constellation."
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
  const seoOverride = seoMetaForAcademyRoute(locale, routeKey(slug));
  const resolvedTitle = (seoOverride?.title ?? title) + " — Holistic House";
  const resolvedDescription = seoOverride?.description ?? description;
  const tantraFreeInitiation = routeKey(slug) === "reiki/tantra-reiki/free-initiation";
  const referralLanding = routeKey(slug) === "reiki/free-practitioner-course";
  const sharingImage = referralLanding ? "/images/holistic-house/reiki-approved-sunrise-v3.webp" : "/images/holistic-house/andy-about.png";
  const sharingImageAlt = referralLanding ? "Free Reiki course and introductory initiation — Holistic House" : "Andrey Litvinov — Tantra Reiki teacher";
  return {
    metadataBase: metadataBaseFor(),
    title: resolvedTitle,
    description: resolvedDescription,
    ...(routeKey(slug) === "principles-of-energywork/learn" ? { robots: { index: false, follow: false } } : {}),
    alternates: { canonical: path, languages: { en: "/en/academy" + languageSuffix, ru: "/ru/academy" + languageSuffix, es: "/es/academy" + languageSuffix, "x-default": "/en/academy" + languageSuffix } },
    ...(tantraFreeInitiation || referralLanding ? {
      openGraph: {
        type: "website" as const,
        url: path,
        siteName: "Holistic House",
        locale: locale === "ru" ? "ru_RU" : locale === "es" ? "es_ES" : "en_US",
        title: resolvedTitle,
        description: resolvedDescription,
        images: [{ url: sharingImage, alt: sharingImageAlt }],
      },
      twitter: {
        card: "summary_large_image" as const,
        title: resolvedTitle,
        description: resolvedDescription,
        images: [sharingImage],
      },
    } : {}),
  };
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

  if (key === "free-ai-courses") return <><PublicGrowthCourses locale={locale} /><PublicPractitionerCourses locale={locale} /></>;
  if (key === "reiki/free-practitioner-course") return <ReikiReferralLanding locale={locale} />;
  if (key === "principles-of-energywork/learn") return <EnergyworkAiLearner locale={locale === "ru" ? "ru" : "en"} startAtExperience={query.start === "1"} />;
  if (key === "principles-of-energywork") return <PrinciplesOfEnergywork locale={locale} />;
  if (key === "reiki/kundalini-reiki/free-initiation") return <KundaliniFreeInitiation locale={locale} />;
  if (key === "temple-studies") return <TempleStudies locale={locale} />;
  if (key === "reiki/kundalini-reiki") return <KundaliniReikiCourse locale={locale} />;
  if (key === "reiki/tantra-reiki/free-initiation") return <TantraFreeInitiation locale={locale} />;
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
