import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { FreeEntryLanding } from "@/components/free-entry-landing";
import { isPublicLocale } from "@/data/academy/catalog";
import { metadataBaseFor } from "@/data/site-metadata";

type Props = { params: Promise<{ locale: string }> };
const copy = {
  en: { title: "Free Personal Express Review with Andrey | Holistic House", description: "One free personal written express review with Andrey: situation or energy and wellbeing, a fresh perspective and a possible next step. Not medical diagnosis or treatment." },
  ru: { title: "Личная экспресс-диагностика с Андреем | Holistic House", description: "Одна бесплатная личная экспресс-диагностика с Андреем: запрос по ситуации либо энергии и самочувствию, письменные наблюдения и ориентир для следующего шага. Не медицинская диагностика." },
  es: { title: "Revisión personal exprés gratuita con Andrey | Holistic House", description: "Una revisión personal exprés escrita gratuita con Andrey: situación o energía y bienestar, sin diagnóstico ni tratamiento médico." },
} as const;
export function generateStaticParams() { return [{ locale: "en" }, { locale: "ru" }, { locale: "es" }]; }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!isPublicLocale(locale)) return { robots: { index: false } };
  const t = copy[locale];
  return {
    metadataBase: metadataBaseFor(),
    title: t.title, description: t.description,
    alternates: {
      canonical: "/" + locale + "/services/free-situation-review",
      languages: { en: "/en/services/free-situation-review", ru: "/ru/services/free-situation-review", es: "/es/services/free-situation-review", "x-default": "/en/services/free-situation-review" },
    },
    openGraph: { type: "website", siteName: "Holistic House", title: t.title, description: t.description,
      url: "/" + locale + "/services/free-situation-review", images: [{ url: "/images/holistic-house/andy-about.png", alt: "Andrey Litvinov" }] },
    twitter: { card: "summary_large_image", title: t.title, description: t.description, images: ["/images/holistic-house/andy-about.png"] },
  };
}

export default async function FreeSituationReviewPage({ params }: Props) {
  const { locale } = await params;
  if (!isPublicLocale(locale)) notFound();
  return <FreeEntryLanding locale={locale} kind="situation" />;
}
