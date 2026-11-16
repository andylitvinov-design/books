import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PublicSiteHeader } from "@/components/public-site-header";
import { getAttunementRouteParams, getRemedyAttunements } from "@/data/remedy-attunements";
import { getRemedy, isSupportedLocale } from "@/data/remedies";
import type { Locale } from "@/data/remedies";
import { metadataBaseFor } from "@/data/site-metadata";

type PageProps = { params: Promise<{ locale: string; slug: string }> };
const copy = {
  ru: { back: "← Все стихи-настройки", eyebrow: "Алхимия Души · поэтические настройки", description: "Описание препарата", source: "Исходная публикация", note: "Авторский символический текст, а не медицинская рекомендация. Не заменяет диагностику или лечение." },
  en: { back: "← All remedy poems", eyebrow: "Alchemy of the Soul · original poems", description: "Remedy description", source: "Original publication", note: "Original Russian symbolic poetry, not medical advice or a substitute for healthcare." },
};
export const dynamicParams = false;
export function generateStaticParams() { return getAttunementRouteParams(); }
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale, slug } = await params;
  const remedy = getRemedy(locale, slug);
  if (!isSupportedLocale(locale) || !remedy || !getRemedyAttunements(slug).length) return { title: "Not found" };
  return { metadataBase: metadataBaseFor(),
    title: `${remedy.canonical_latin_name} — ${locale === "ru" ? "стих-настройка" : "poetic attunement"}`,
    description: `${remedy.canonical_latin_name}: original remedy poetry and a separate description.`,
    alternates: { canonical: `/${locale}/homeopathy/attunements/${slug}`,
      languages: { ru: `/ru/homeopathy/attunements/${slug}`, en: `/en/homeopathy/attunements/${slug}`, "x-default": `/en/homeopathy/attunements/${slug}` } },
  };
}
export default async function AttunementDetailPage({ params }: PageProps) {
  const { locale, slug } = await params;
  if (!isSupportedLocale(locale)) notFound();
  const remedy = getRemedy(locale, slug), found = getRemedyAttunements(slug);
  if (!remedy || !found.length) notFound();
  const c = copy[locale as Locale];
  return (
    <main className="homeopathy-shell hh-design-surface">
      <PublicSiteHeader locale={locale} />
      <div className="mx-auto max-w-4xl px-4 pb-14 pt-8 sm:pt-12">
        <Link href={`/${locale}/homeopathy/attunements`} className="mb-5 inline-flex min-h-11 items-center font-semibold text-[#067a67]">{c.back}</Link>
        <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-[#966a1f]">{c.eyebrow}</p>
        <h1 className="mb-3 text-3xl font-semibold text-[#17334b] sm:text-5xl">{remedy.canonical_latin_name}</h1>
        {remedy.russian_common_name ? <p className="mb-4 text-lg text-[#5d6a71]">{remedy.russian_common_name}</p> : null}
        <Link href={`/${locale}/homeopathy/remedies/${slug}`} className="mb-10 inline-flex min-h-12 items-center rounded-xl border border-[#067a67] px-5 py-3 font-semibold text-[#067a67]">{c.description}</Link>
        <div className="space-y-9">
          {found.map((poem) => (
            <article id={poem.id} key={poem.id} className="rounded-3xl border border-[#e9dfd1] bg-[#fffcf7] px-5 py-8 shadow-sm sm:px-10 sm:py-10">
              <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-[#966a1f]">{poem.form === "poetic-meditation" ? "Медитация в стихах" : "Стих-настройка"}</p>
              <h2 className="mb-7 text-2xl font-semibold leading-snug text-[#17334b] sm:text-3xl">{poem.title}</h2>
              <div lang="ru" className="whitespace-pre-line break-words text-[18px] leading-[1.85] text-[#143d3a]">{poem.text}</div>
              <div className="mt-8 border-t border-[#e9dfd1] pt-4 text-sm text-[#5d6a71]">
                <a href={poem.source_url} rel="noopener noreferrer" target="_blank" className="inline-flex min-h-11 items-center font-semibold text-[#067a67] underline underline-offset-4">{c.source} · {poem.id}</a>
                {poem.source_date ? <span className="ml-3">{poem.source_date}</span> : null}
              </div>
            </article>
          ))}
        </div>
        <p className="mt-8 text-sm leading-relaxed text-[#5d6a71]">{c.note}</p>
      </div>
    </main>
  );
}
