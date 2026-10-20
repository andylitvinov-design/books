import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DaoHexagramDetails } from "@/components/dao-hexagram-pages";
import { archivePhotoFor, getHexagram, hexagramEssence, hexagramTitle, hexagrams } from "@/data/dao-hexagrams.mjs";
import { metadataBaseFor } from "@/data/site-metadata";
type Props = { params: Promise<{ number: string }> };
export const dynamicParams = false;
export function generateStaticParams() { return hexagrams.map((item) => ({ number: String(item.number) })); }
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { number } = await params;
  const item = getHexagram(number);
  if (!item) return { title: "Not found" };
  const title = hexagramTitle(item, "es") + " · I Ching " + number;
  const description = hexagramEssence(item, "es");
  const path = "/dao/hexagrams/" + number;
  return { metadataBase: metadataBaseFor(), title, description,
    openGraph: { type: "article", title, description, images: [{ url: archivePhotoFor(item), alt: "Hexagrama " + number }] },
    alternates: { canonical: "/es" + path,
      languages: { ru: "/ru" + path, en: "/en" + path, es: "/es" + path, "x-default": "/en" + path } } };
}
export default async function Page({ params }: Props) {
  const { number } = await params;
  if (!getHexagram(number)) notFound();
  return <DaoHexagramDetails locale="es" number={Number(number)} />;
}
