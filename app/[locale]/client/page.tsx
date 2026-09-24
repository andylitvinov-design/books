import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ClientCabinetEntry } from "@/components/client-cabinet-entry";
import { PublicSiteHeader } from "@/components/public-site-header";
import { getHomeopathyLocaleParams, isSupportedLocale } from "@/data/remedies";
import type { Locale } from "@/data/remedies";
import { metadataBaseFor } from "@/data/site-metadata";

type PageProps = { params: Promise<{ locale: string }> };

const copy = {
  en: {
    title: "Client Cabinet — Holistic House",
    description: "Open your private Holistic House client cabinet.",
    kicker: "Private access",
    heading: "Client Cabinet",
    text: "Paste the private cabinet link you received from Andy. The link is exchanged for a secure browser session and then removed from the address bar.",
  },
  ru: {
    title: "Кабинет клиента — Holistic House",
    description: "Вход в приватный кабинет клиента Holistic House.",
    kicker: "Приватный доступ",
    heading: "Кабинет клиента",
    text: "Вставьте приватную ссылку на кабинет, которую вы получили от Andy. Ссылка будет обменена на защищённую сессию браузера и затем удалена из адресной строки.",
  },
} as const;

export function generateStaticParams() {
  return getHomeopathyLocaleParams();
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  if (!isSupportedLocale(locale)) return { title: "Not found" };
  const current = copy[locale as Locale];
  return {
    metadataBase: metadataBaseFor(),
    title: current.title,
    description: current.description,
    robots: { index: false, follow: false },
    alternates: {
      canonical: "/" + locale + "/client",
      languages: { ru: "/ru/client", en: "/en/client" },
    },
  };
}

export default async function ClientEntryPage({ params }: PageProps) {
  const { locale } = await params;
  if (!isSupportedLocale(locale)) notFound();

  const typedLocale = locale as Locale;
  const current = copy[typedLocale];

  return (
    <main className="client-entry-shell" lang={typedLocale}>
      <PublicSiteHeader locale={typedLocale} />
      <section className="client-entry-card" aria-labelledby="client-entry-title">
        <p className="about-kicker">{current.kicker}</p>
        <h1 id="client-entry-title">{current.heading}</h1>
        <p>{current.text}</p>
        <ClientCabinetEntry locale={typedLocale} />
      </section>
    </main>
  );
}
