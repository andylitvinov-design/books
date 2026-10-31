import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PublicSiteHeader } from "@/components/public-site-header";
import { PersonalCart } from "@/components/commerce/personal-cart";
import { getCommerceConfig } from "@/lib/commerce/config";
import { personalPayPalEnabled } from "@/lib/commerce/paypal-personal";
import { wisePaymentsEnabled } from "@/lib/commerce/wise-payments";
import { configuredSquarePaymentLinks } from "@/lib/commerce/square-payment-links";
import { getSquareGatewayConfig, getSquareWalletGatewayConfig } from "@/lib/commerce/square-gateway";
import { walletSettings } from "@/lib/wallet/model";
import { configuredPayPalHostedLinks } from "@/lib/commerce/paypal-hosted-links";
import type { ServiceLocale } from "@/lib/commerce/catalog";

type Props = { params: Promise<{ locale: string }> };
const isLocale = (locale: string): locale is ServiceLocale => ["en", "ru", "es"].includes(locale);

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  return { title: locale === "ru" ? "Корзина — Holistic House" : locale === "es" ? "Carrito — Holistic House" : "Cart — Holistic House",
    robots: { index: false, follow: false } };
}

export default async function CartPage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const commerce = getCommerceConfig();
  const squareGateway = getSquareGatewayConfig();
  const verifiedPayPalCheckout = commerce.provider === "paypal" && commerce.enabled;
  const wallet = walletSettings();
  const walletTopupEnabled = wallet.enabled &&
    (wallet.paypalEnabled || (wallet.squareEnabled && getSquareWalletGatewayConfig().enabled));
  return <main className="services-shell services-shell--studio" lang={locale} data-service-cart-page>
    <PublicSiteHeader locale={locale} />
    <PersonalCart locale={locale} walletTopupEnabled={walletTopupEnabled} paypalEnabled={personalPayPalEnabled()} wiseEnabled={wisePaymentsEnabled()}
      squareLinks={configuredSquarePaymentLinks()} squareApiEnabled={squareGateway.enabled} squareApiEnvironment={squareGateway.environment}
      squareApiPrices={squareGateway.enabled ? squareGateway.prices : {}} verifiedPayPalEnabled={verifiedPayPalCheckout}
      hostedPayPalLinks={configuredPayPalHostedLinks()} />
  </main>;
}
