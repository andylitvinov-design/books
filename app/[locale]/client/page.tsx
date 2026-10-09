import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { CabinetLanding } from "@/components/app/cabinet-landing";
import { PublicSiteHeader } from "@/components/public-site-header";
import { ClientAssessmentInvite } from "@/components/client-assessment-invite";
import { isSupportedLocale } from "@/data/remedies";
import type { Locale } from "@/data/remedies";
import { metadataBaseFor } from "@/data/site-metadata";
import { appEnabled } from "@/lib/app/config";
import { currentCabinetAccess } from "@/lib/clients/session";

type PageProps = { params: Promise<{ locale: string }> };

const copy = {
  en: {
    title: "Personal Cabinet — Holistic House",
    description: "Google sign-in, guest self-observation tests and private Holistic House results.",
  },
  ru: {
    title: "Личный кабинет — Holistic House",
    description: "Вход через Google, тесты без регистрации и приватные результаты Holistic House.",
  },
} as const;

export const dynamic = "force-dynamic";

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

  const session = await currentCabinetAccess();
  const typedLocale = locale as Locale;
  return (
    <main className="client-entry-shell cabinet-landing-shell" lang={typedLocale}>
      <PublicSiteHeader locale={typedLocale} showAssessmentStrip={false} />
      <CabinetLanding
        locale={typedLocale}
        appAvailable={appEnabled()}
        legacySelector={session?.selector}
      />
      <ClientAssessmentInvite locale={typedLocale} />
    </main>
  );
}
