import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PublicSiteHeader } from "@/components/public-site-header";
import { TaoistTalismanCart } from "@/components/taoist-talisman-cart";
import type { PublicLocale } from "@/lib/public-locales";

type Props = { params: Promise<{ locale: string }> };
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const title = locale === "ru" ? "Корзина талисманов" : locale === "es" ? "Carrito de talismanes" : "Talisman basket";
  return { title: title + " — Holistic House", robots: { index: false, follow: false } };
}

export default async function TalismanCartPage({ params }: Props) {
  const { locale } = await params;
  if (locale !== "en" && locale !== "ru" && locale !== "es") notFound();
  return <main lang={locale} style={{ minHeight:"100svh", background:"#f7f3ed", paddingBottom:70 }}>
    <PublicSiteHeader locale={locale as PublicLocale} />
    <TaoistTalismanCart locale={locale as PublicLocale} />
  </main>;
}
