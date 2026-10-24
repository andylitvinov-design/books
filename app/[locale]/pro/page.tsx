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
  en: { title: "Pro | Learn Reiki & Share Your Practice", description: "Start with five free Reiki lessons, then explore three paid master programmes: Tantra Reiki, Kundalini Reiki and Reiki Yggdrasil with temple traditions. Practitioners can also offer services." },
  ru: { title: "Профи | Обучение Рейки и свои услуги", description: "Начните с пяти бесплатных уроков Рейки, затем выберите платную мастерскую программу: Тантра Рейки, Кундалини Рейки или Рейки Иггдрасиль и храмовые традиции." },
  es: { title: "Pro | Aprende Reiki y comparte tu práctica", description: "Empieza con cinco lecciones Reiki gratuitas y explora tres programas de maestría de pago: Tantra Reiki, Kundalini Reiki y Reiki Yggdrasil con tradiciones de templo." },
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
