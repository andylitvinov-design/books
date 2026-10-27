import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PublicSiteHeader } from "@/components/public-site-header";
import { isPublicLocale } from "@/data/academy/catalog";
import { metadataBaseFor } from "@/data/site-metadata";
import { RemoteEnergySupportBooking, type EnergySupportMaster } from "@/components/remote-energy-support-booking";
import { listRemoteEnergySupportMasters } from "@/lib/practitioners/public-remote-support-masters";

type PageProps = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ practitioner?: string }>;
};
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  if (!isPublicLocale(locale)) return { title: "Not found" };
  return {
    metadataBase: metadataBaseFor(),
    title: (locale === "ru" ? "Энергетическая поддержка цели" : locale === "es" ? "Apoyo energético para tu objetivo" : "Energy support for your goal") + " | Holistic House",
    description: locale === "ru"
      ? "Сначала опишите запрос, затем выберите специалиста Рейки, узнайте стоимость и отправьте заявку на удобное время."
      : locale === "es"
        ? "Describe tu intención, consulta profesionales Reiki con precios publicados y solicita un horario."
        : "Describe the support you need, browse real Reiki practitioners and published prices, then request a preferred time.",
    alternates: {
      canonical: `/${locale}/services/remote-energy-support`,
      languages: {
        en: "/en/services/remote-energy-support",
        ru: "/ru/services/remote-energy-support",
        es: "/es/services/remote-energy-support",
      },
    },
  };
}

export default async function RemoteEnergySupportPage({ params, searchParams }: PageProps) {
  const { locale } = await params;
  if (!isPublicLocale(locale)) notFound();
  const { practitioner } = await searchParams;
  let masters: EnergySupportMaster[] = [];
  try { masters = await listRemoteEnergySupportMasters(locale); }
  catch { /* Explicitly empty fallback keeps the standalone page usable when the directory is offline. */ }
  return (
    <main className="services-shell services-shell--studio" lang={locale}>
      <PublicSiteHeader locale={locale}/>
      <RemoteEnergySupportBooking locale={locale as "en" | "ru" | "es"} masters={masters} preferredPractitioner={practitioner || ""}/>
    </main>
  );
}
