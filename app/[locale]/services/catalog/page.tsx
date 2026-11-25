import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ServicesDirectoryPage } from "@/components/services-directory-page";
import { getHomeopathyLocaleParams, isSupportedLocale } from "@/data/remedies";
import type { Locale } from "@/data/remedies";
import { metadataBaseFor } from "@/data/site-metadata";

type Props = { params: Promise<{ locale: string }> };

export const dynamic = "force-dynamic";
export const revalidate = 0;
export function generateStaticParams() { return getHomeopathyLocaleParams(); }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!isSupportedLocale(locale)) return { title: "Not found" };
  const ru = locale === "ru";
  const title = ru ? "Каталог услуг и специалистов — Holistic House" : "Service & practitioner directory — Holistic House";
  const description = ru
    ? "Подберите услуги по теме, формату и бюджету, затем отправьте запрос мастеру."
    : "Browse services by topic, format and budget, then send a request to the practitioner.";
  return {
    metadataBase: metadataBaseFor(),
    title, description,
    alternates: { canonical: "/" + locale + "/services/catalog",
      languages: { en: "/en/services/catalog", ru: "/ru/services/catalog", es: "/es/services/catalog" } },
  };
}

export default async function DirectoryRoute({ params }: Props) {
  const { locale } = await params;
  if (!isSupportedLocale(locale)) notFound();
  return <ServicesDirectoryPage locale={locale as Locale} />;
}
