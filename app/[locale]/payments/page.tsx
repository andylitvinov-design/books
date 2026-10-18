import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PublicSiteHeader } from "@/components/public-site-header";
import { ServiceCart } from "@/components/commerce/service-cart";
import type { PublicLocale } from "@/lib/public-locales";

type Props = { params: Promise<{ locale: string }> };
const copy = {
  en: { title: "Consultation prices and payment", lead: "Select a one-time consultation. Payment is available only after secure checkout is enabled; appointment times are confirmed personally.", back: "Back to services" },
  ru: { title: "Стоимость и оплата консультаций", lead: "Выберите разовую консультацию. Онлайн-оплата доступна после подключения защищённой платёжной системы, время согласуем лично.", back: "Вернуться к услугам" },
  es: { title: "Precios y pago de consultas", lead: "Elige una consulta única. El pago online estará disponible cuando se active la pasarela segura; acordaremos el horario personalmente.", back: "Volver a servicios" },
} as const;

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!(locale in copy)) return { title: "Not found", robots: { index: false } };
  const title = copy[locale as PublicLocale].title + " — Holistic House";
  return { title, description: copy[locale as PublicLocale].lead, robots: { index: false, follow: true } };
}

export default async function PaymentsPage({ params }: Props) {
  const { locale } = await params;
  if (!(locale in copy)) notFound();
  const language = locale as PublicLocale;
  const t = copy[language];
  return (
    <main className="services-shell services-shell--studio" lang={language}>
      <PublicSiteHeader locale={language} />
      <div style={{ maxWidth: 1120, padding: "24px 20px 8px", margin: "0 auto" }}>
        <Link href={`/${language}/services`} style={{ color: "#087f87", fontWeight: 650 }}>{t.back} →</Link>
        <h1 style={{ margin: "20px 0 8px", color: "#123b55", fontSize: "clamp(1.7rem, 4vw, 2.6rem)" }}>{t.title}</h1>
        <p style={{ color: "#456276", maxWidth: 760, lineHeight: 1.65 }}>{t.lead}</p>
      </div>
      <ServiceCart locale={language} />
    </main>
  );
}
