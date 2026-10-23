import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProfiHub } from "@/components/profi-hub";
import type { PublicLocale } from "@/lib/public-locales";
import { metadataBaseFor } from "@/data/site-metadata";

type Props = { params: Promise<{ locale: string }> };

function supported(locale: string): locale is PublicLocale {
  return locale === "en" || locale === "ru" || locale === "es";
}

const seo = {
  en: { title: "Pro | Learn Reiki & Share Your Practice", description: "Take free self-checks, build a private personal profile or become a Reiki practitioner. Experienced practitioners can create a profile, course and services on Holistic House." },
  ru: { title: "Профи | Обучение Рейки и свои услуги", description: "Пройдите бесплатные тесты, создайте личный или профессиональный профиль, начните обучение Рейки или разместите свои услуги и курсы на Holistic House." },
  es: { title: "Pro | Aprende Reiki y comparte tu práctica", description: "Haz pruebas gratuitas, crea tu perfil personal o profesional y comienza a aprender Reiki. Si ya practicas, ofrece servicios o crea cursos en Holistic House." },
} as const;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!supported(locale)) return { title: "Not found", robots: { index: false } };
  return {
    metadataBase: metadataBaseFor(),
    ...seo[locale],
    alternates: {
      canonical: `/${locale}/pro`,
      languages: { en: "/en/pro", ru: "/ru/pro", es: "/es/pro", "x-default": "/en/pro" },
    },
    openGraph: {
      type: "website",
      title: seo[locale].title,
      description: seo[locale].description,
      images: [{ url: "/images/holistic-house/reiki-approved-sunrise-v3.webp", alt: "Holistic House Reiki Practitioner" }],
    },
  };
}

export default async function ProfiPage({ params }: Props) {
  const { locale } = await params;
  if (!supported(locale)) notFound();
  return <ProfiHub locale={locale} />;
}
