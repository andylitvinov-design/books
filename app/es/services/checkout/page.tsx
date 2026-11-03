import type { Metadata } from "next";
import Link from "next/link";
import { PublicSiteHeader } from "@/components/public-site-header";
import { ServiceCart } from "@/components/commerce/service-cart";
import { metadataBaseFor } from "@/data/site-metadata";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  metadataBase: metadataBaseFor(),
  title: "Pago seguro de consultas | Holistic House",
  robots: { index: false, follow: false },
};

export default function SpanishConsultationCheckoutPage() {
  return <main className="services-shell services-shell--studio" lang="es">
    <PublicSiteHeader locale="es"/>
    <div style={{ margin: "20px auto", width: "min(100% - 32px, 1140px)" }}>
      <Link href="/es/services">← Volver a servicios</Link>
    </div>
    <ServiceCart locale="es"/>
  </main>;
}
