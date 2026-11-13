import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PublicSiteHeader } from "@/components/public-site-header";
import { RemedyAttunementsDirectory } from "@/components/remedy-attunements-directory";
import { getAttunementDirectory } from "@/data/remedy-attunements";
import { isSupportedLocale } from "@/data/remedies";
import type { Locale } from "@/data/remedies";
import { metadataBaseFor } from "@/data/site-metadata";

type PageProps = { params: Promise<{ locale: string }> };
const copy = {
  ru: { title: "Стихи-настройки препаратов — Алхимия Души", description: "Поиск авторских стихов-настроек и описаний препаратов.", eyebrow: "Алхимия Души · авторская библиотека", heading: "Стихи-настройки препаратов", lead: "Оригинальные стихотворные настройки из авторского архива. Для каждого препарата — две отдельные ссылки: описание и стих. Если стихов несколько, они собраны вместе.", back: "← Каталог препаратов", note: "Поэзия — символический образовательный материал. Она не является медицинским назначением." },
  en: { title: "Remedy poems — Alchemy of the Soul", description: "Original poetic remedy attunements linked to descriptions.", eyebrow: "Alchemy of the Soul · original archive", heading: "Remedy poems and attunements", lead: "Original poems in Russian, preserved without translation. Every remedy has a separate description and a direct link to its poems.", back: "← Remedy directory", note: "Original Russian texts. Symbolic poetry, not medical advice." },
};
export function generateStaticParams() { return [{ locale: "ru" }, { locale: "en" }]; }
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  if (!isSupportedLocale(locale)) return { title: "Not found" };
  const c = copy[locale as Locale];
  return { metadataBase: metadataBaseFor(), title: c.title, description: c.description, alternates: {
    canonical: `/${locale}/homeopathy/attunements`,
    languages: { ru: "/ru/homeopathy/attunements", en: "/en/homeopathy/attunements", "x-default": "/en/homeopathy/attunements" },
  } };
}
export default async function AttunementIndexPage({ params }: PageProps) {
  const { locale } = await params;
  if (!isSupportedLocale(locale)) notFound();
  const c = copy[locale as Locale];
  return (
    <main className="homeopathy-shell hh-design-surface">
      <PublicSiteHeader locale={locale} />
      <header className="mx-auto max-w-6xl px-4 pb-8 pt-8 sm:pt-12">
        <Link className="mb-5 inline-flex min-h-11 items-center font-semibold text-[#067a67]" href={`/${locale}/homeopathy/remedies`}>{c.back}</Link>
        <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-[#966a1f]">{c.eyebrow}</p>
        <h1 className="mb-5 max-w-4xl text-3xl font-semibold text-[#17334b] sm:text-5xl">{c.heading}</h1>
        <p className="max-w-3xl text-lg leading-relaxed text-[#5d6a71]">{c.lead}</p>
      </header>
      <RemedyAttunementsDirectory locale={locale as Locale} entries={getAttunementDirectory(locale as Locale)} />
      <p className="mx-auto max-w-6xl px-4 pb-12 text-sm leading-relaxed text-[#5d6a71]">{c.note}</p>
    </main>
  );
}
