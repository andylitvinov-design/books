import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PublicSiteHeader } from "@/components/public-site-header";
import { HolisticSupportOrderPage } from "@/components/holistic-support-order-page";
import { isPublicLocale } from "@/data/academy/catalog";
import { metadataBaseFor } from "@/data/site-metadata";
import styles from "@/components/holistic-support-standalone.module.css";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ topic?: string | string[] }>;
};
const copy = {
  en: { back: "Holistic Support", kicker: "PERSONAL SUPPORT", title: "Find support", lead: "Published practitioners and offers appear immediately. Use the filters to narrow your choices; no booking or payment occurs here." },
  ru: { back: "Холистическая поддержка", kicker: "ПЕРСОНАЛЬНАЯ ПОДДЕРЖКА", title: "Подобрать поддержку", lead: "Опубликованные мастера и предложения появляются сразу. Фильтры помогают уточнить выбор. Запись и оплата подтверждаются отдельно." },
  es: { back: "Apoyo holístico", kicker: "APOYO PERSONAL", title: "Encontrar apoyo", lead: "Los profesionales y las ofertas publicados aparecen de inmediato. Los filtros afinan la búsqueda. No se reserva ni paga aquí." },
} as const;

export async function generateMetadata({ params }: Pick<Props, "params">): Promise<Metadata> {
  const { locale } = await params;
  if (!isPublicLocale(locale)) return { title: "Not found", robots: { index: false } };
  return {
    metadataBase: metadataBaseFor(),
    title: copy[locale].title + " | Holistic House",
    description: copy[locale].lead,
    alternates: {
      canonical: "/" + locale + "/support-options",
      languages: { en: "/en/support-options", ru: "/ru/support-options", es: "/es/support-options", "x-default": "/en/support-options" },
    },
  };
}

export default async function SupportOptionsPage({ params, searchParams }: Props) {
  const { locale } = await params;
  if (!isPublicLocale(locale)) notFound();
  const query = await searchParams;
  const topic = query.topic === "love" || query.topic === "health" ? query.topic : "business";
  const t = copy[locale];
  return (
    <main className={styles.page} data-support-options-standalone-page lang={locale}>
      <PublicSiteHeader locale={locale} />
      <div className={styles.shell}>
        <nav className={styles.breadcrumb} aria-label={t.back}>
          <Link href={"/" + locale + "/holistic-support"} prefetch={false}>← {t.back}</Link>
        </nav>
        <header className={styles.hero}>
          <p className={styles.kicker}>{t.kicker}</p>
          <h1>{t.title}</h1>
          <p>{t.lead}</p>
        </header>
        <HolisticSupportOrderPage locale={locale} topic={topic} />
      </div>
    </main>
  );
}
