import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { MandalaMeditationClient } from "@/components/mandala-meditation-client";
import { PublicSiteHeader } from "@/components/public-site-header";
import { freeMeditationVideos } from "@/data/academy/holistic-support-meditations";
import { isPublicLocale } from "@/data/academy/catalog";
import { metadataBaseFor } from "@/data/site-metadata";
import styles from "@/components/mandala-meditation.module.css";

type Props = { params: Promise<{ locale: string }> };

const meta = {
  en: {
    title: "Free Personal Video & Mandala",
    description: "Create a real free animated video from your own photo, choose intention, mandala, 8 visual effects, 1:1/9:16/16:9, duration and download privately.",
  },
  ru: {
    title: "Бесплатное личное видео и мандала",
    description: "Создайте бесплатно видео из фото: выберите цель, мандалу, 8 эффектов, формат, длительность и сохраните готовый MP4/WebM. Фото остаётся в браузере.",
  },
  es: {
    title: "Vídeo personal gratis y mandala",
    description: "Crea gratis un vídeo animado con tu foto y mandala: elige intención, 8 efectos, formato, duración y guarda MP4/WebM en tu dispositivo.",
  },
} as const;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!isPublicLocale(locale)) return { title: "Not found", robots: { index: false } };
  const canonical = "/" + locale + "/holistic-support/mandala";
  return {
    metadataBase: metadataBaseFor(),
    title: meta[locale].title + " | Holistic House",
    description: meta[locale].description,
    alternates: {
      canonical,
      languages: {
        en: "/en/holistic-support/mandala",
        ru: "/ru/holistic-support/mandala",
        es: "/es/holistic-support/mandala",
        "x-default": "/en/holistic-support/mandala",
      },
    },
  };
}

export default async function MandalaMeditationPage({ params }: Props) {
  const { locale } = await params;
  if (!isPublicLocale(locale)) notFound();
  return (
    <main className={styles.page} lang={locale} data-mandala-meditation-page>
      <PublicSiteHeader locale={locale} />
      <MandalaMeditationClient locale={locale} videos={freeMeditationVideos(locale)} />
    </main>
  );
}
