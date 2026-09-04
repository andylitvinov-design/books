import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { SiteNavigation } from "@/components/site-navigation";
import { getHomeopathyLocaleParams, isSupportedLocale } from "@/data/remedies";
import type { Locale } from "@/data/remedies";
import { metadataBaseFor } from "@/data/site-metadata";

type PageProps = { params: Promise<{ locale: string }> };

const copy = {
  ru: { title: "Гомеопатия — библиотека авторских материалов", description: "Отдельный раздел библиотеки с источниковыми описаниями 38 подтверждённых препаратов Андрея Литвинова.", kicker: "Отдельный раздел библиотеки", heading: "Гомеопатия", lead: "38 подтверждённых препаратов из существующих материалов Андрея Литвинова. Тексты сохранены как образовательный архив с указанием источника.", cta: "Открыть указатель препаратов", note: "Здесь нет автоматически добавленных названий: повторяющиеся и групповые исходные заголовки не превращены в отдельные карточки." },
  en: { title: "Homeopathy — author-source library", description: "A dedicated library section with source-based descriptions for 38 confirmed remedies by Andrii Litvinov.", kicker: "A dedicated library section", heading: "Homeopathy", lead: "38 confirmed remedies from existing Andrii Litvinov materials. The texts are preserved as an educational archive with their source reference.", cta: "Open remedy directory", note: "No titles have been added automatically: duplicate and grouped source headings were not turned into individual cards." },
} as const;

export function generateStaticParams() { return getHomeopathyLocaleParams(); }

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  if (!isSupportedLocale(locale)) return { title: "Not found" };
  const current = copy[locale];
  return { metadataBase: metadataBaseFor(), title: current.title, description: current.description, alternates: { canonical: `/${locale}/homeopathy`, languages: { ru: "/ru/homeopathy", en: "/en/homeopathy" } } };
}

export default async function HomeopathyPage({ params }: PageProps) {
  const { locale } = await params;
  if (!isSupportedLocale(locale)) notFound();
  const current = copy[locale as Locale];
  return (
    <main className="homeopathy-shell">
      <SiteNavigation locale={locale} />
      <section className="homeopathy-intro">
        <p className="homeopathy-kicker">{current.kicker}</p><h1>{current.heading}</h1><p>{current.lead}</p>
        <Link className="homeopathy-primary-link" href={`/${locale}/homeopathy/remedies`}>{current.cta}</Link>
        <p className="homeopathy-source-note">{current.note}</p>
      </section>
    </main>
  );
}
