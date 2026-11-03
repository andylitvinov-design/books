import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PublicSiteHeader } from "@/components/public-site-header";
import { StorefrontShop } from "@/components/commerce/storefront-shop";
import type { ServiceLocale } from "@/lib/commerce/catalog";
import { metadataBaseFor } from "@/data/site-metadata";

type Props = { params: Promise<{ locale: string }> };
const validLocale = (locale: string): locale is ServiceLocale =>
  locale === 'en' || locale === 'ru' || locale === 'es';

const metadataCopy = {
  en: { title: "Shop consultations and programmes", description: "Choose a consultation with Andrey Litvinov at €50/30 min or €100/60 min, browse guided programmes, or start for free." },
  ru: { title: "Магазин консультаций и программ", description: "Выберите личную консультацию с Андреем Литвиновым за €50/30 минут или €100/60 минут, изучите программы и бесплатные материалы." },
  es: { title: "Tienda de consultas y programas", description: "Elige una consulta con Andrey Litvinov por €50/30 minutos o €100/60 minutos, explora programas y recursos gratuitos." },
} as const;

export const revalidate = 3600;
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!validLocale(locale)) return { title: "Not found", robots: { index: false } };
  return {
    metadataBase: metadataBaseFor(),
    title: metadataCopy[locale].title + " | Holistic House",
    description: metadataCopy[locale].description,
    alternates: {
      canonical: "/" + locale + "/shop",
      languages: { en: "/en/shop", ru: "/ru/shop", es: "/es/shop", "x-default": "/en/shop" },
    },
    robots: { index: true, follow: true },
  };
}

export default async function ShopPage({ params }: Props) {
  const { locale } = await params;
  if (!validLocale(locale)) notFound();
  return <main className="services-shell services-shell--studio" lang={locale}>
    <PublicSiteHeader locale={locale} />
    <StorefrontShop locale={locale} />
  </main>;
}
