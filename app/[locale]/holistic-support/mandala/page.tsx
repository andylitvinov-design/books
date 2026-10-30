import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";
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
    description: "Create a personal support video with six themes, first-party film previews, optional photo and affirmations, audio and a real local free download.",
  },
  ru: {
    title: "Бесплатный редактор личного видео",
    description: "Шесть направлений, настоящие видеофоны, выбор заставки, фото, аффирмации и музыка. Создайте и скачайте видеоролик бесплатно на своём устройстве.",
  },
  es: {
    title: "Editor de vídeo personal gratis",
    description: "Seis temas, vídeos reales, portadas, foto opcional, afirmaciones y sonido. Crea y guarda tu vídeo local gratis sin subir la foto.",
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
  const promo = {
    en: { label: "PERSONAL DIAGNOSTIC · FREE", action: "Get a review" },
    ru: { label: "ЛИЧНАЯ ДИАГНОСТИКА · БЕСПЛАТНО", action: "Получить разбор" },
    es: { label: "DIAGNÓSTICO PERSONAL · GRATIS", action: "Solicitar análisis" },
  }[locale];
  return (
    <main className={styles.page} lang={locale} data-mandala-meditation-page>
      <div className={styles.siteHeaderWrap}><PublicSiteHeader locale={locale} /></div>
      <HolisticSupportMandalaDock locale={locale} />
      <aside className={styles.slimDiagnostic} data-video-diagnostic-banner aria-label={promo.label}>
        <Sparkles size={17} aria-hidden="true" />
        <strong>{promo.label}</strong>
        <Link href={"/"+locale+"/services/free-situation-review"} prefetch={false}>
          {promo.action}<ArrowRight size={17} aria-hidden="true" />
        </Link>
      </aside>
      <MandalaMeditationClient locale={locale} videos={freeMeditationVideos(locale)} />
    </main>
  );
}
