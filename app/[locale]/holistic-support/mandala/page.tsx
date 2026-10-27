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
    title: "Personal Mandala Meditation",
    description: "Place a photo of yourself or your goal inside an original mandala and meditate with existing guided videos. Your photo stays in your browser.",
  },
  ru: {
    title: "Медитация с личной мандалой",
    description: "Поместите своё фото или образ цели в мандалу и слушайте авторскую видеомедитацию. Фотография остаётся в вашем браузере.",
  },
  es: {
    title: "Meditación con mandala personal",
    description: "Coloca tu foto o una imagen de tu objetivo en un mandala y acompáñala con una videomeditación original. La foto permanece en tu navegador.",
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
