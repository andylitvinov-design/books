import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { FreeEntryLanding } from "@/components/free-entry-landing";
import { isPublicLocale } from "@/data/academy/catalog";
import { metadataBaseFor } from "@/data/site-metadata";

type Props = { params: Promise<{ locale: string }> };
const copy = {
  en: { title: "Free wellbeing and personality tests | Holistic House", description: "Explore short free self-checks and personality questionnaires. Understand your starting point, reflect on stress and resources, and save results when you choose." },
  ru: { title: "Бесплатные тесты самочувствия и личности | Holistic House", description: "Пройдите бесплатные тесты о стрессе, отношениях и личных ресурсах. Исследуйте результаты и наблюдайте изменения в личном кабинете." },
  es: { title: "Tests gratuitos de bienestar y personalidad | Holistic House", description: "Explora tests gratuitos sobre bienestar, estrés y personalidad. Comprende tu punto de partida y guarda tus resultados si lo deseas." },
} as const;
export function generateStaticParams() { return [{ locale: "en" }, { locale: "ru" }, { locale: "es" }]; }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!isPublicLocale(locale)) return { robots: { index: false } };
  const t = copy[locale];
  return {
    metadataBase: metadataBaseFor(),
    title: t.title,
    description: t.description,
    alternates: {
      canonical: "/" + locale + "/tests",
      languages: { en: "/en/tests", ru: "/ru/tests", es: "/es/tests", "x-default": "/en/tests" },
    },
    openGraph: { type: "website", siteName: "Holistic House", title: t.title, description: t.description,
      url: "/" + locale + "/tests", images: [{ url: "/images/holistic-house/course-start-heron.webp", alt: "Free wellbeing tests — Holistic House" }] },
    twitter: { card: "summary_large_image", title: t.title, description: t.description, images: ["/images/holistic-house/course-start-heron.webp"] },
  };
}

export default async function PublicTestsLanding({ params }: Props) {
  const { locale } = await params;
  if (!isPublicLocale(locale)) notFound();
  return <FreeEntryLanding locale={locale} kind="tests" />;
}
