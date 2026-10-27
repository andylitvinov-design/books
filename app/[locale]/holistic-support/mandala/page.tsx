import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { MandalaSupportStudio } from "@/components/mandala-support-studio";
import { freeMeditationVideos } from "@/data/academy/holistic-support-meditations";
import { isPublicLocale } from "@/data/academy/catalog";
import { metadataBaseFor } from "@/data/site-metadata";

type Props = { params: Promise<{ locale: string }> };
const titles = {
  en: "My support mandala",
  ru: "Моя мандала поддержки",
  es: "Mi mandala de apoyo",
} as const;
const descriptions = {
  en: "A free personal mandala with your image, intention and an original video meditation.",
  ru: "Бесплатная личная мандала с вашим фото, намерением и авторской видеомедитацией.",
  es: "Un mandala personal gratuito con tu imagen, intención y una videomeditación original.",
} as const;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!isPublicLocale(locale)) return { title: "Not found", robots: { index: false } };
  return {
    metadataBase: metadataBaseFor(),
    title: titles[locale] + " | Holistic House",
    description: descriptions[locale],
    alternates: {
      canonical: "/" + locale + "/holistic-support/mandala",
      languages: {
        en: "/en/holistic-support/mandala",
        ru: "/ru/holistic-support/mandala",
        es: "/es/holistic-support/mandala",
        "x-default": "/en/holistic-support/mandala",
      },
    },
  };
}

export default async function MandalaSupportPage({ params }: Props) {
  const { locale } = await params;
  if (!isPublicLocale(locale)) notFound();
  return <MandalaSupportStudio locale={locale} videos={freeMeditationVideos(locale)} />;
}
