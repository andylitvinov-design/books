import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DaoHexagramDetails } from "@/components/dao-hexagram-pages";
import { archivePhotoFor, getHexagram, hexagramEssence, hexagramTitle, hexagrams } from "@/data/dao-hexagrams.mjs";
import { metadataBaseFor } from "@/data/site-metadata";

type Props = { params: Promise<{ locale: string; number: string }> };
export const dynamicParams = false;
export function generateStaticParams() {
  return ["ru", "en"].flatMap((locale) => hexagrams.map((item) => ({ locale, number: String(item.number) })));
}
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, number } = await params;
  const hexagram = getHexagram(number);
  if ((locale !== "ru" && locale !== "en") || !hexagram) return { title: "Not found" };
  const title = hexagramTitle(hexagram, locale) + " · I Ching " + number;
  const description = hexagramEssence(hexagram, locale);
  const image = archivePhotoFor(hexagram);
  const path = "/dao/hexagrams/" + number;
  return { metadataBase: metadataBaseFor(), title, description,
    openGraph: { type: "article", title, description, images: [{ url: image, alt: "I Ching hexagram " + number }] },
    alternates: { canonical: "/" + locale + path,
      languages: { ru: "/ru" + path, en: "/en" + path, es: "/es" + path, "x-default": "/en" + path } } };
}
export default async function Page({ params }: Props) {
  const { locale, number } = await params;
  if ((locale !== "ru" && locale !== "en") || !getHexagram(number)) notFound();
  return <DaoHexagramDetails locale={locale} number={Number(number)} />;
}
