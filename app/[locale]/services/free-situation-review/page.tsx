import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { FreeEntryLanding } from "@/components/free-entry-landing";
import { isPublicLocale } from "@/data/academy/catalog";
import { metadataBaseFor } from "@/data/site-metadata";

type Props = { params: Promise<{ locale: string }> };
const copy = {
  en: { title: "Free Diagnosis — Situation, Wu Xing & Personal Session | Holistic House", description: "Choose a free written situation review, a free symbolic Wu Xing Five Elements resource reflection, or a personal 30-minute consultation with Andrey Litvinov for €50." },
  ru: { title: "Бесплатная диагностика — ситуация, У-Син и консультация | Holistic House", description: "Выберите бесплатный письменный разбор ситуации, символический разбор ресурсов по системе У-Син (Пять стихий) или личную консультацию с Андреем Литвиновым — 30 минут за €50." },
  es: { title: "Diagnóstico gratis — Situación, Wu Xing y Consulta | Holistic House", description: "Elige una revisión escrita gratuita de tu situación, una reflexión simbólica Wu Xing (Cinco Elementos) gratis o una consulta personal de 30 minutos con Andrey Litvinov por €50." },
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
