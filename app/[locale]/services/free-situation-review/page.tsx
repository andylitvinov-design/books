import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { FreeEntryLanding } from "@/components/free-entry-landing";
import { isPublicLocale } from "@/data/academy/catalog";
import { metadataBaseFor } from "@/data/site-metadata";

type Props = { params: Promise<{ locale: string }> };
const copy = {
  en: { title: "Free Situation Review — personal written reflection | Holistic House", description: "A free personal written situation review by Andrey Litvinov based on a short coaching questionnaire and your handwritten ME / GOAL / PROBLEM drawing. No video call or diagnosis." },
  ru: { title: "Бесплатный письменный разбор ситуации | Holistic House", description: "Личный письменный разбор ситуации по коучинг-анкете и рисунку от руки «Я — цель — проблема». Без видеозвонка, медицинских диагнозов и обязательной оплаты." },
  es: { title: "Revisión escrita gratuita de tu situación | Holistic House", description: "Revisión personal gratuita por escrito basada en un breve cuestionario y dibujo YO / META / PROBLEMA. Sin videollamada ni diagnóstico médico." },
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
  };
}

export default async function FreeSituationReviewPage({ params }: Props) {
  const { locale } = await params;
  if (!isPublicLocale(locale)) notFound();
  return <FreeEntryLanding locale={locale} kind="situation" />;
}
