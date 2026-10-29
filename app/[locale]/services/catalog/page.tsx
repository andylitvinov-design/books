import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ServicesDirectoryPage } from "@/components/services-directory-page";
import { isPublicLocale } from "@/data/academy/catalog";
import { metadataBaseFor } from "@/data/site-metadata";

type Props = { params: Promise<{ locale: string }> };

export const dynamic = "force-dynamic";
export const revalidate = 0;
export function generateStaticParams() { return [{ locale: "en" }, { locale: "ru" }, { locale: "es" }]; }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!isPublicLocale(locale)) return { title: "Not found" };
  const seo = {
    en: { title: "Service & practitioner directory — Holistic House", description: "Browse services by topic, format and budget, then send a request to the practitioner." },
    ru: { title: "Каталог услуг и специалистов — Holistic House", description: "Подберите услуги по теме, формату и бюджету, затем отправьте запрос мастеру." },
    es: { title: "Directorio de servicios y profesionales — Holistic House", description: "Busca servicios por tema, modalidad y presupuesto, y solicita información al profesional." },
  } as const;
  const { title, description } = seo[locale];
  return {
    metadataBase: metadataBaseFor(),
    title, description,
    alternates: { canonical: "/" + locale + "/services/catalog",
      languages: { en: "/en/services/catalog", ru: "/ru/services/catalog", es: "/es/services/catalog", "x-default": "/en/services/catalog" } },
  };
}

export default async function DirectoryRoute({ params }: Props) {
  const { locale } = await params;
  if (!isPublicLocale(locale)) notFound();
  return <ServicesDirectoryPage locale={locale} />;
}
