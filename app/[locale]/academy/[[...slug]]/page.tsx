import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { AcademyDirection, AcademyHub, AcademyPrefixDirectory } from "@/components/academy-hub";
import { AcademyRecordPage, makeFacultiesRecord } from "@/components/academy-record-page";
import { academyCopy, academyDirections, academyDisplayTitle, findAcademyRecord, isPublicLocale, type AcademyDirectionId, type AcademyView } from "@/data/academy/catalog";
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
    en: { title: "Runes", description: "Runic study programs from the PsiTrends teaching archive." },
    ru: { title: "Руны", description: "Учебные программы по рунам из архива PsiTrends." },
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
function pageTitle(locale: PublicLocale, slug: string[] | undefined) {
  if (!slug?.length) return academyCopy[locale].title;
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
  const description = routeKey(slug) === "reiki/yggdrasil"
    ? locale === "ru"
      ? "Полная актуальная структура Reiki Yggdrasil: 7 уровней, 37 ступеней, 177 настроек и архив видеолекций."
      : locale === "es"
        ? "Estructura actual completa de Reiki Yggdrasil: 7 niveles, 37 etapas, 177 sintonizaciones y archivo de videoclases."
        : "Complete current Reiki Yggdrasil curriculum: 7 levels, 37 steps, 177 attunements and the video lecture archive."
    : academyCopy[locale].lead;
  return { metadataBase: metadataBaseFor(), title: title + " — Holistic House", description, alternates: { canonical: path, languages: { en: "/en/academy" + languageSuffix, ru: "/ru/academy" + languageSuffix, es: "/es/academy" + languageSuffix } } };
}

export default async function AcademyPage({ params, searchParams }: Props) {
  const [{ locale: rawLocale, slug }, query] = await Promise.all([params, searchParams]);
  if (!isPublicLocale(rawLocale)) notFound();
  const locale = rawLocale;
  const key = routeKey(slug);

  if (!slug?.length) {
    const rawView = Array.isArray(query.view) ? query.view[0] : query.view;
    const view: AcademyView = rawView === "videos" ? "videos" : "programs";
    return <AcademyHub locale={locale} view={view} />;
  }
  if (slug.length === 1 && slug[0] === "videos") return <AcademyHub locale={locale} view="videos" />;
  if (slug.length === 1 && directionPath[slug[0]]) return <AcademyDirection locale={locale} direction={directionPath[slug[0]]} />;
  if (slug.length === 1 && prefixCopy[slug[0]]) { const copy = prefixCopy[slug[0]][locale]; return <AcademyPrefixDirectory locale={locale} prefix={slug[0]} title={copy.title} description={copy.description} />; }
  if (key === "history/faculties") { const history = findAcademyRecord("history", locale); if (!history) notFound(); return <AcademyRecordPage locale={locale} record={makeFacultiesRecord(history, locale)} />; }
  const record = findAcademyRecord(key, locale);
  if (!record) notFound();
  return <AcademyRecordPage locale={locale} record={record} />;
}
