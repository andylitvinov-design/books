import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";
import { notFound } from "next/navigation";
import { toPublishedProfessionalSource } from "@/lib/mandala/professional-public-source.mjs";
import { createPractitionerRepository } from "@/lib/practitioners/repository";
import { getAppConfig } from "@/lib/app/config";

import { MandalaMeditationClient } from "@/components/mandala-meditation-client";
import { HolisticSupportMandalaDock } from "@/components/holistic-support-mandala-dock";
import { PublicSiteHeader } from "@/components/public-site-header";
import { freeMeditationVideos } from "@/data/academy/holistic-support-meditations";
import { isPublicLocale } from "@/data/academy/catalog";
import { metadataBaseFor } from "@/data/site-metadata";
import styles from "@/components/mandala-meditation.module.css";

type Props = { params: Promise<{ locale: string }>; searchParams?: Promise<{ pro?: string; master?: string; service?: string }> };

const meta = {
  en: {
    title: "Free Personal Video Editor",
    description: "Choose one of four themes, animated video templates, your own photo, format, music and caption. Create and download a real video locally for free.",
  },
  ru: {
    title: "Бесплатный редактор личного видео",
    description: "Четыре темы, анимированные видеошаблоны, ваше фото, формат, звуковой фон и подпись. Создайте и скачайте настоящее видео бесплатно.",
  },
  es: {
    title: "Editor de vídeo personal gratis",
    description: "Cuatro temas, plantillas animadas, tu foto, formatos, audio y subtítulos. Crea y guarda tu vídeo gratis y sin subir la foto.",
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

export default async function MandalaMeditationPage({ params, searchParams }: Props) {
  const { locale } = await params;
  if (!isPublicLocale(locale)) notFound();
  const query = await searchParams;
  const publishedSlug = (value:unknown): value is string =>
    typeof value === "string" && /^[a-z0-9][a-z0-9-]{0,89}$/.test(value);
  // Only a SERVER-confirmed published service is serialized into the Studio.
  // Auth tokens, unpublished practitioner drafts, assessment answers and
  // client CRM rows are never passed to the browser or any video provider.
  let professionalSource = null;
  if (publishedSlug(query?.master) && publishedSlug(query?.service)) {
    try {
      const detail = await createPractitionerRepository(getAppConfig())
        .getPublicService(query.master,query.service,locale);
      professionalSource = toPublishedProfessionalSource(detail,locale);
    } catch {
      // Invalid, hidden or unavailable service -> no offer and no booking CTA.
    }
  }
  const professionalMode = query?.pro === "1" || Boolean(professionalSource);
  const promo = {
    en: { label: "PERSONAL DIAGNOSTIC · FREE", action: "Get a review" },
    ru: { label: "ЛИЧНАЯ ДИАГНОСТИКА · БЕСПЛАТНО", action: "Получить разбор" },
    es: { label: "DIAGNÓSTICO PERSONAL · GRATIS", action: "Solicitar análisis" },
  }[locale];
  return (
    <main className={styles.page} lang={locale} data-mandala-meditation-page>
      <div className={styles.siteHeaderWrap}><PublicSiteHeader locale={locale} /></div>

      <MandalaMeditationClient locale={locale} videos={freeMeditationVideos(locale)}
        professionalSource={professionalSource} professionalMode={professionalMode} />
      <aside className={styles.slimDiagnostic} data-video-diagnostic-banner aria-label={promo.label}>
        <Sparkles size={17} aria-hidden="true" />
        <strong>{promo.label}</strong>
        <Link href={"/"+locale+"/services/free-situation-review"} prefetch={false}>
          {promo.action}<ArrowRight size={17} aria-hidden="true" />
        </Link>
      </aside>
      <HolisticSupportMandalaDock locale={locale} />
    </main>
  );
}
