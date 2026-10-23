import "server-only";

import { academyDirections, academyDisplayTitle, preferredAcademyRecords } from "@/data/academy/catalog";
import { MONITORING_CATALOG } from "@/data/assessments/catalog";
import { coreServiceOffers } from "@/data/core-service-offers";
import { books } from "@/data/library";
import { localizedBookText } from "@/data/library-localization";
import { personalServiceCopy, personalServicePaths } from "@/data/personal-service-pages";
import { loadPublicLibraryFeed } from "@/lib/public-library-feed";
import type { PublicLocale } from "@/lib/public-locales";
import { searchPublicItems } from "@/lib/public-site-search.mjs";

export type SiteSearchKind = "service" | "course" | "test" | "material" | "article" | "video";
export type SiteSearchResult = { kind: SiteSearchKind; title: string; description: string; href: string };
type SearchEntry = SiteSearchResult & { keywords?: string };

const staticIndexes = new Map<PublicLocale, SearchEntry[]>();
type PublicFeed = Awaited<ReturnType<typeof loadPublicLibraryFeed>>;
const publicFeeds = new Map<PublicLocale, { at: number; feed: PublicFeed }>();
const feedTtlMs = 60_000;

const curated: Record<PublicLocale, Array<{ title: string; description: string; path: string; kind: SiteSearchKind; keywords: string }>> = {
  en: [
    { title: "Free wellbeing and personality tests", description: "Find a free self-check for stress, sleep, feelings, relationships and personal strengths.", path: "tests", kind: "test", keywords: "questionnaires psychoprofile assessment" },
    { title: "OPORA · Free anti-stress course", description: "Practical self-support, grounding and stress relief lessons.", path: "courses/antistress", kind: "course", keywords: "anxiety relaxation support" },
    { title: "Free Reiki Practitioner Course", description: "Five lessons with Tantra Reiki, Kundalini Reiki and Yggdrasil.", path: "academy/principles-of-energywork", kind: "course", keywords: "tantra kundalini yggdrasil initiation" },
    { title: "Kundalini Reiki", description: "Energywork lessons and introductory Reiki training.", path: "academy/reiki/kundalini-reiki", kind: "course", keywords: "kundalini attunement" },
    { title: "Business & career development", description: "Business courses, growth programs and personal consultations.", path: "explore/business", kind: "course", keywords: "career strategy founder coaching" },
    { title: "Remote energy support", description: "Explore Reiki support with a practitioner online.", path: "services/remote-energy-support", kind: "service", keywords: "healing energy reiki" },
    { title: "Holistic House Library", description: "Published educational videos, articles, books and practical guides.", path: "library", kind: "material", keywords: "books guides materials video journal" },
  ],
  ru: [
    { title: "Бесплатные тесты самочувствия и личности", description: "Поиск тестов: стресс, сон, отношения, ресурсы, тревога и личность.", path: "tests", kind: "test", keywords: "диагностика психопрофиль опросники" },
    { title: "ОПОРА · бесплатный курс антистресс", description: "Практики поддержки, заземления и восстановления.", path: "courses/antistress", kind: "course", keywords: "стресс тревога расслабление" },
    { title: "Практик Рейки · бесплатный курс", description: "Пять уроков Тантра Рейки, Кундалини Рейки и Иггдрасиль.", path: "academy/principles-of-energywork", kind: "course", keywords: "инициация обучение tantra reiki" },
    { title: "Кундалини Рейки", description: "Обучение и вводные практики энергетической системы.", path: "academy/reiki/kundalini-reiki", kind: "course", keywords: "kundalini reiki инициация" },
    { title: "Бизнес и карьера", description: "Курсы развития и консультации по бизнесу.", path: "explore/business", kind: "course", keywords: "коучинг предпринимательство стратегия" },
    { title: "Дистанционная энергетическая поддержка", description: "Выбор практики Рейки и онлайн-формата.", path: "services/remote-energy-support", kind: "service", keywords: "энергия рейки" },
    { title: "Библиотека Holistic House", description: "Опубликованные видео, статьи, книги и методички.", path: "library", kind: "material", keywords: "материалы справочники" },
  ],
  es: [
    { title: "Tests gratuitos de bienestar y personalidad", description: "Tests sobre estrés, sueño, relaciones y recursos personales.", path: "tests", kind: "test", keywords: "cuestionarios evaluación" },
    { title: "OPORA · Curso gratis para el estrés", description: "Lecciones de apoyo personal y autorregulación.", path: "courses/antistress", kind: "course", keywords: "ansiedad calma" },
    { title: "Curso gratis Reiki Practitioner", description: "Lecciones de Tantra Reiki, Kundalini Reiki y Yggdrasil.", path: "academy/principles-of-energywork", kind: "course", keywords: "reiki iniciación" },
    { title: "Kundalini Reiki", description: "Cursos y prácticas introductorias de energía.", path: "academy/reiki/kundalini-reiki", kind: "course", keywords: "reiki kundalini" },
    { title: "Negocios y desarrollo profesional", description: "Cursos y sesiones sobre estrategia y carrera.", path: "explore/business", kind: "course", keywords: "empresas coaching" },
    { title: "Apoyo energético a distancia", description: "Sesiones y prácticas de Reiki en línea.", path: "services/remote-energy-support", kind: "service", keywords: "energía" },
    { title: "Biblioteca Holistic House", description: "Vídeos públicos, artículos, libros y guías.", path: "library", kind: "material", keywords: "materiales lectura" },
  ],
};

function staticPublicEntries(locale: PublicLocale): SearchEntry[] {
  const cached = staticIndexes.get(locale);
  if (cached) return cached;
  const entries: SearchEntry[] = [];
  const add = (entry: SearchEntry) => {
    if (entry.title && entry.href) entries.push(entry);
  };
  for (const item of curated[locale]) {
    add({ title: item.title, description: item.description, keywords: item.keywords, href: "/" + locale + "/" + item.path, kind: item.kind });
  }
  for (const offer of coreServiceOffers(locale)) {
    add({ kind: "service", title: offer.title, description: offer.promise, href: offer.href, keywords: offer.label + " " + offer.benefit });
  }
  for (const [key, path] of Object.entries(personalServicePaths)) {
    const copy = personalServiceCopy[key as keyof typeof personalServicePaths][locale];
    add({ kind: "service", title: copy.title, description: copy.description, href: "/" + locale + "/services/" + path,
      keywords: copy.headline + " " + copy.questions.join(" ") });
  }
  for (const book of books) {
    if (book.status !== "published") continue;
    // Books presently have full reading pages in EN/RU; Spanish queries may still
    // match the public English edition without linking to a nonexistent ES edition.
    const bookLocale = locale === "es" ? "en" : locale;
    const copy = localizedBookText(book, bookLocale);
    add({ kind: "material", title: copy.title, description: copy.description,
      href: "/" + bookLocale + "/books/" + encodeURIComponent(book.id),
      keywords: [book.title, book.description, book.category, ...(book.tags || []),
        ...book.chapters.map(chapter => chapter.title)].join(" ") });
  }
  for (const direction of academyDirections) {
    add({ kind: "course", title: direction.title[locale], description: direction.description[locale],
      href: "/" + locale + "/academy/" + direction.path, keywords: direction.title.en + " " + direction.title.ru });
  }
  for (const record of preferredAcademyRecords(locale)) {
    // Archive previews explicitly requiring review must not be advertised as
    // searchable published training materials.
    if (record.status === "needs_review" || !/^[a-z0-9/-]+$/u.test(record.routeKey)) continue;
    const title = academyDisplayTitle(record, locale);
    add({ kind: record.direction === "videos" ? "video" : "course", title,
      description: record.linkText || record.sourceTitle || "",
      href: "/" + locale + "/academy/" + record.routeKey,
      keywords: [record.title, record.sourceTitle, record.direction, record.status].filter(Boolean).join(" ") });
  }
  for (const test of MONITORING_CATALOG) {
    if (test.startable !== true || test.rightsStatus === "review_required") continue;
    const title = test.title?.[locale] || test.title?.en;
    if (!title) continue;
    const description = test.description?.[locale] || test.description?.en || "";
    add({ kind: "test", title, description, href: "/" + (locale === "es" ? "en" : locale) + "/client/tests?catalog=full",
      keywords: [test.key, ...(test.topics || [])].join(" ") });
  }
  staticIndexes.set(locale, entries);
  return entries;
}

async function publicFeed(locale: PublicLocale): Promise<PublicFeed> {
  const cached = publicFeeds.get(locale);
  if (cached && Date.now() - cached.at < feedTtlMs) return cached.feed;
  const feed = await loadPublicLibraryFeed(locale);
  publicFeeds.set(locale, { feed, at: Date.now() });
  return feed;
}

export async function searchSite(locale: PublicLocale, query: string): Promise<SiteSearchResult[]> {
  if (query.trim().length < 2 || query.length > 80) return [];
  const entries = [...staticPublicEntries(locale)];
  const { videos, articles } = await publicFeed(locale);
  for (const article of articles) {
    const title = article.published?.title;
    if (!title || !article.slug) continue;
    entries.push({ kind: "article", title, description: article.published.excerpt || "",
      href: "/" + locale + "/articles/" + encodeURIComponent(article.slug), keywords: article.practitionerName });
  }
  for (const video of videos) {
    if (!/^[A-Za-z0-9_-]{11}$/u.test(video.youtubeId)) continue;
    entries.push({ kind: "video", title: video.title, description: video.description || "",
      href: "https://www.youtube.com/watch?v=" + video.youtubeId });
  }
  // The index is limited to explicit public catalogs. No CRM, client reports,
  // session uploads, test answers, private course progression or owner drafts.
  return searchPublicItems(entries, query, 12) as SiteSearchResult[];
}
