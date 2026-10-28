import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PersonalVideoStudio } from "@/components/personal-video-studio";
import { PublicSiteHeader } from "@/components/public-site-header";
import { isPublicLocale } from "@/data/academy/catalog";
import { metadataBaseFor } from "@/data/site-metadata";
import styles from "@/components/personal-video-studio.module.css";

type Props = { params: Promise<{ locale: string }> };

const metadata = {
  en: {
    title: "Free personal video from your photo and voice",
    description: "Add your photo and voice, choose animated scenes and make a private video in your browser. No Telegram bot, account, uploads or paid AI.",
  },
  ru: {
    title: "Бесплатное видео из вашего фото и голоса",
    description: "Загрузите фото и голос, выберите анимацию и создайте личное видео прямо в браузере. Без Telegram-бота, регистрации и платных нейросетей.",
  },
  es: {
    title: "Vídeo gratis con tu foto y tu voz",
    description: "Sube tu foto y voz, elige una animación y crea un vídeo privado desde el navegador. Sin bot de Telegram, cuenta ni IA de pago.",
  },
} as const;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!isPublicLocale(locale)) return { title: "Not found", robots: { index: false } };
  const canonical = `/${locale}/video-studio`;
  return {
    metadataBase: metadataBaseFor(),
    title: `${metadata[locale].title} | Holistic House`,
    description: metadata[locale].description,
    alternates: {
      canonical,
      languages: {
        en: "/en/video-studio",
        ru: "/ru/video-studio",
        es: "/es/video-studio",
        "x-default": "/en/video-studio",
      },
    },
  };
}

export default async function PersonalVideoStudioPage({ params }: Props) {
  const { locale } = await params;
  if (!isPublicLocale(locale)) notFound();
  return (
    <main className={styles.page} data-personal-video-studio-page lang={locale}>
      <PublicSiteHeader locale={locale} />
      <PersonalVideoStudio locale={locale} />
    </main>
  );
}
