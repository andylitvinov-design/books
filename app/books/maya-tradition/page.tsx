import type { Metadata } from "next";
import Link from "next/link";

import { PublicSiteHeader } from "@/components/public-site-header";
import { localizedBookText } from "@/data/library-localization";
import { books } from "@/data/library";
import { metadataBaseFor } from "@/data/site-metadata";

import styles from "./maya-tradition.module.css";

const mayaVolumeIds = ["maya-egregor-gods", "maya-calendar", "maya-exorcism", "maya-mysteries"] as const;
const volumes = books.filter((book) => book.mediaSeries === "maya" && mayaVolumeIds.includes(book.id as (typeof mayaVolumeIds)[number]));
const copy = {
  en: { title: "Maya tradition", kicker: "Maya reading collection", intro: "An editorial gateway to the four published volumes of the Circle of the Feathered Serpent archive.", count: "Four volumes", heading: "Read the collection", open: "Open volume", description: "A four-volume reading collection on the Maya and Aztec tradition, its calendar, myths, symbolic systems, and source materials." },
  ru: { title: "Традиция майя", kicker: "Библиотека традиции майя", intro: "Четыре опубликованных тома из архива «Круг Пернатого Змея» — собранные в одном месте.", count: "Четыре тома", heading: "Читать коллекцию", open: "Открыть том", description: "Четыре тома о традиции майя и ацтеков: календарь, мифы, символические системы и исходные материалы." },
} as const;
type PageProps = { searchParams: Promise<{ lang?: string | string[] }> };
async function hubLocale(searchParams: PageProps["searchParams"]) { return (await searchParams).lang === "ru" ? "ru" as const : "en" as const; }
export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const locale = await hubLocale(searchParams);
  const text = copy[locale];
  return { metadataBase: metadataBaseFor(), title: `${text.title} — Holistic House`, description: text.description,
    alternates: { canonical: locale === "ru" ? "/books/maya-tradition?lang=ru" : "/books/maya-tradition", languages: { en: "/books/maya-tradition", ru: "/books/maya-tradition?lang=ru", "x-default": "/books/maya-tradition" } } };
}
export default async function MayaTraditionHub({ searchParams }: PageProps) {
  const locale = await hubLocale(searchParams);
  const current = copy[locale];
  return <main className={styles.hub} lang={locale}>
    <PublicSiteHeader locale={locale} />
    <section className={styles.hero}><p>{current.kicker}</p><h1>{current.title}</h1><span>{current.intro}</span></section>
    <section className={styles.collection} aria-labelledby="maya-volumes-title"><div><p>{current.count}</p><h2 id="maya-volumes-title">{current.heading}</h2></div><ol>{volumes.map((volume, index) => { const text = localizedBookText(volume, locale); return <li key={volume.id}><span>{String(index + 1).padStart(2, "0")}</span><article><p>{text.category}</p><h3>{text.title}</h3><div>{text.description}</div><Link href={`/books/${volume.id}?lang=${locale}`}>{current.open}<span aria-hidden="true">→</span></Link></article></li>; })}</ol></section>
  </main>;
}
