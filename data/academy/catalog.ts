import sources from "./sources.generated.json";
import media from "./media.generated.json";
import type { PublicLocale } from "@/lib/public-locales";

export type AcademyDirectionId = "reiki" | "mysteries" | "symbolic" | "applied" | "school" | "archive";
export type AcademyView = "programs" | "videos";
export type AcademyStatus = "current" | "historical" | "availability_unknown" | "archive_only" | "needs_review";
export type AcademyBlock = { type: "h1" | "h2" | "h3" | "h4" | "p" | "li"; text: string };

export type AcademySourceRecord = {
  sourceUrl: string;
  path: string;
  linkText: string;
  classification: string;
  routeKey: string;
  direction: AcademyDirectionId | "videos";
  logicalId: string;
  sourceLocale: "en" | "ru";
  sourceTitle?: string;
  title: string;
  content: AcademyBlock[];
  contentHash?: string | null;
  hashAlgorithm?: string;
  reviewState?: string;
  status: AcademyStatus;
  httpStatus?: number | null;
  finalUrl?: string;
  skippedRiskyBlocks?: number;
};

export type AcademyMediaRecord = {
  sourceUrl: string;
  mediaUrl: string;
  logicalId: string;
  status: string;
};

export const academyDirections: Array<{
  id: AcademyDirectionId;
  path: string;
  image: string;
  title: Record<PublicLocale, string>;
  description: Record<PublicLocale, string>;
}> = [
  { id: "reiki", path: "reiki", image: "/images/holistic-house/hero-olive-incense.webp", title: { en: "Reiki & Energy Systems", ru: "Рейки и энергетические системы", es: "Reiki y sistemas energéticos" }, description: { en: "Yggdrasil, Tantra Reiki, shamanic and energy-work study paths.", ru: "Иггдрасиль, Тантра Рейки, шаманские и энергетические учебные программы.", es: "Yggdrasil, Tantra Reiki y programas históricos de trabajo energético." } },
  { id: "mysteries", path: "mysteries", image: "/library/maya-mysteries/media/post-244-1.jpg", title: { en: "Mysteries & Ancient Traditions", ru: "Мистерии и древние традиции", es: "Misterios y tradiciones antiguas" }, description: { en: "Greek, Egyptian, Maya and archetypal study material.", ru: "Греческие, египетские, майянские и архетипические материалы.", es: "Materiales griegos, egipcios, mayas y arquetípicos." } },
  { id: "symbolic", path: "symbolic", image: "/library/maya-egregor-gods/media/post-203-1.jpg", title: { en: "Runes, Elements & Symbolic Arts", ru: "Руны, стихии и символические искусства", es: "Runas, elementos y artes simbólicas" }, description: { en: "Runes, elements, water, talismans and symbolic practice.", ru: "Руны, стихии, вода, талисманы и символические практики.", es: "Runas, elementos, agua, talismanes y práctica simbólica." } },
  { id: "applied", path: "applied", image: "/images/holistic-house/video-posters/constellations-en-v1.webp", title: { en: "Applied Archetypal Practice", ru: "Прикладная архетипическая практика", es: "Práctica arquetípica aplicada" }, description: { en: "Applied attunement and archetypal-method learning material.", ru: "Прикладные настройки и обучение архетипическим методам.", es: "Material aplicado sobre sintonización y métodos arquetípicos." } },
  { id: "school", path: "path", image: "/images/holistic-house/andy-about.png", title: { en: "Academy Path & School", ru: "Путь Академии и школа", es: "Trayectoria y escuela de la Academia" }, description: { en: "Long-form study paths, school structure and historical faculties.", ru: "Долгие учебные пути, структура школы и исторические факультеты.", es: "Trayectorias largas, estructura de la escuela y facultades históricas." } },
  { id: "archive", path: "archive", image: "/images/holistic-house/books-library.webp", title: { en: "Archive", ru: "Архив", es: "Archivo" }, description: { en: "Historical programs, festivals and previous Academy material.", ru: "Исторические программы, фестивали и прежние материалы Академии.", es: "Programas históricos, festivales y materiales anteriores de la Academia." } },
];

export const academyCopy = {
  en: { title: "Academy", lead: "Structured learning paths from the PsiTrends teaching archive, now organized inside Holistic House.", programs: "Programs", videos: "Videos", allPrograms: "Learning directions", videoCollections: "Video courses & meditations", back: "Academy", source: "Original PsiTrends source", sourceLanguage: "Original material in", en: "English", ru: "Russian", historical: "Historical program", availability_unknown: "Availability unknown", current: "Current", archive_only: "Archive only", needs_review: "Needs review", filtered: "Legacy prices, registration or claims were omitted from the public migration.", reading: "Library & reading", services: "Individual work", noContent: "The source page is preserved in the migration manifest, but its body needs manual review before publication." },
  ru: { title: "Академия", lead: "Учебные направления из архива PsiTrends, теперь структурированные внутри Holistic House.", programs: "Программы", videos: "Видео", allPrograms: "Направления обучения", videoCollections: "Видео-курсы и медитации", back: "Академия", source: "Оригинальный источник PsiTrends", sourceLanguage: "Оригинальный материал на", en: "английском", ru: "русском", historical: "Историческая программа", availability_unknown: "Актуальность уточняется", current: "Актуальная", archive_only: "Только архив", needs_review: "Требует проверки", filtered: "Старые цены, регистрационные блоки и спорные заявления не перенесены в публичный текст.", reading: "Библиотека и материалы", services: "Индивидуальная работа", noContent: "Источник сохранён в манифесте миграции, но текст требует ручной проверки перед публикацией." },
  es: { title: "Academia", lead: "Rutas de aprendizaje del archivo de PsiTrends, ahora organizadas dentro de Holistic House.", programs: "Programas", videos: "Videos", allPrograms: "Áreas de aprendizaje", videoCollections: "Videocursos y meditaciones", back: "Academia", source: "Fuente original de PsiTrends", sourceLanguage: "Material original en", en: "inglés", ru: "ruso", historical: "Programa histórico", availability_unknown: "Disponibilidad por confirmar", current: "Actual", archive_only: "Solo archivo", needs_review: "Pendiente de revisión", filtered: "Los precios, formularios de inscripción y afirmaciones antiguas se omitieron de la migración pública.", reading: "Biblioteca y lecturas", services: "Trabajo individual", noContent: "La fuente está preservada en el manifiesto de migración, pero el texto requiere revisión manual antes de publicarse." },
} as const;

const sourceRecords = sources as AcademySourceRecord[];
const mediaRecords = media as AcademyMediaRecord[];

export function isPublicLocale(value: string): value is PublicLocale { return value === "en" || value === "ru" || value === "es"; }
export function getAcademyRecords(): AcademySourceRecord[] { return sourceRecords; }
function localeRank(record: AcademySourceRecord, locale: PublicLocale) { if (locale !== "es" && record.sourceLocale === locale) return 0; if (record.sourceLocale === "en") return 1; return 2; }
export function preferredAcademyRecords(locale: PublicLocale, filter?: (record: AcademySourceRecord) => boolean) {
  const byId = new Map<string, AcademySourceRecord[]>();
  for (const record of sourceRecords) { if (filter && !filter(record)) continue; const list = byId.get(record.logicalId) ?? []; list.push(record); byId.set(record.logicalId, list); }
  return [...byId.values()].map((list) => [...list].sort((a, b) => localeRank(a, locale) - localeRank(b, locale))[0]).sort((a, b) => a.routeKey.localeCompare(b.routeKey));
}
export function recordsForDirection(direction: AcademyDirectionId, locale: PublicLocale) { return preferredAcademyRecords(locale, (record) => record.direction === direction); }
export function videoRecords(locale: PublicLocale) { return preferredAcademyRecords(locale, (record) => record.direction === "videos"); }
export function findAcademyRecord(routeKey: string, locale: PublicLocale) { const matches = sourceRecords.filter((record) => record.routeKey === routeKey); if (!matches.length) return undefined; return [...matches].sort((a, b) => localeRank(a, locale) - localeRank(b, locale))[0]; }
export function mediaForRecord(record: AcademySourceRecord) { return mediaRecords.filter((item) => item.logicalId === record.logicalId && item.sourceUrl === record.sourceUrl); }
export function youtubeIdFromUrl(url: string) { const match = url.match(/youtube\.com\/embed\/([A-Za-z0-9_-]{6,})/); return match?.[1]; }
export function sourceLanguageNotice(record: AcademySourceRecord, locale: PublicLocale) { if (locale !== "es" && record.sourceLocale === locale) return null; return academyCopy[locale].sourceLanguage + " " + academyCopy[locale][record.sourceLocale] + "."; }
