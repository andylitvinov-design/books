import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PublicSiteHeader } from "@/components/public-site-header";
import { ServiceCart } from "@/components/commerce/service-cart";
import { metadataBaseFor } from "@/data/site-metadata";

type Props = { params: Promise<{ locale: string }> };
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!["en", "ru", "es"].includes(locale)) return { title: "Not found", robots: { index: false } };
  return {
    metadataBase: metadataBaseFor(),
    title: (locale === "ru" ? "Безопасная оплата консультации" : locale === "es" ? "Pago seguro de consulta" : "Secure consultation checkout") + " | Holistic House",
    robots: { index: false, follow: false },
  };
}

export default async function ConsultationCheckoutPage({ params }: Props) {
  const { locale } = await params;
  if (locale !== "en" && locale !== "ru" && locale !== "es") notFound();
  return <main className="services-shell services-shell--studio" lang={locale}>
    <PublicSiteHeader locale={locale}/>
    <div style={{ margin: "20px auto", width: "min(100% - 32px, 1140px)" }}>
      <Link href={`/${locale}/services`}>{locale === "ru" ? "← К услугам" : locale === "es" ? "← Volver a servicios" : "← Back to services"}</Link>
    </div>
    <ServiceCart locale={locale}/>
  </main>;
}
