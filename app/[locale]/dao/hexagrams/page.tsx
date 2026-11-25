import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DaoHexagramsIndex } from "@/components/dao-hexagram-pages";
import { metadataBaseFor } from "@/data/site-metadata";

type Props = { params: Promise<{ locale: string }> };
const names = {
  ru: { title: "64 гексаграммы И-Цзин — Holistic House", description: "64 символа Книги Перемен: 12 авторских интерпретаций с исходными фото и 52 традиционных справочных значения." },
  en: { title: "64 I Ching Hexagrams — Holistic House", description: "Explore all 64 I Ching symbols, including 12 verified author interpretations and photos from original publications." },
} as const;

export const dynamicParams = false;
export function generateStaticParams() { return [{ locale: "ru" }, { locale: "en" }]; }
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (locale !== "ru" && locale !== "en") return { title: "Not found" };
  return { metadataBase: metadataBaseFor(), ...names[locale],
    alternates: { canonical: "/" + locale + "/dao/hexagrams",
      languages: { en: "/en/dao/hexagrams", ru: "/ru/dao/hexagrams", es: "/es/dao/hexagrams", "x-default": "/en/dao/hexagrams" } } };
}
export default async function Page({ params }: Props) {
  const { locale } = await params;
  if (locale !== "ru" && locale !== "en") notFound();
  return <DaoHexagramsIndex locale={locale} />;
}
