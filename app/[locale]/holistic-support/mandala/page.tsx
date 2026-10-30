import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { MandalaMeditationClient } from "@/components/mandala-meditation-client";
import { HolisticSupportMandalaDock } from "@/components/holistic-support-mandala-dock";
import { PublicSiteHeader } from "@/components/public-site-header";
import { freeMeditationVideos } from "@/data/academy/holistic-support-meditations";
import { isPublicLocale } from "@/data/academy/catalog";
import { metadataBaseFor } from "@/data/site-metadata";
import styles from "@/components/mandala-meditation.module.css";

type Props = { params: Promise<{ locale: string }> };

const meta = {
  en: {
    title: "Free Personal Video Editor",
    description: "Choose from six themes, preview your video mandala, then expand your personal photo, imagery, affirmations, audio and format settings. Create and download locally for free.",
  },
  ru: {
    title: "Бесплатный редактор личного видео",
    description: "Шесть тем, предпросмотр видео-мандалы и раскрывающиеся настройки: фото, визуальный стиль, гипноаффирмации, звук и формат. Создайте видео на своём устройстве бесплатно.",
  },
  es: {
    title: "Editor de vídeo personal gratis",
    description: "Seis temas, mandala en vídeo y ajustes desplegables de foto, imágenes, afirmaciones, audio y formato. Crea y guarda el vídeo gratis en tu dispositivo.",
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
      <div className={styles.siteHeaderWrap}><PublicSiteHeader locale={locale} /></div>
      <HolisticSupportMandalaDock locale={locale} />
      <MandalaMeditationClient locale={locale} videos={freeMeditationVideos(locale)} />
    </main>
  );
}
