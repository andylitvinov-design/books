import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { FreeEntryLanding } from "@/components/free-entry-landing";
import { isPublicLocale } from "@/data/academy/catalog";
import { metadataBaseFor } from "@/data/site-metadata";

type Props = { params: Promise<{ locale: string }> };
const copy = {
  en: { title: "Free Wu Xing Resource Profile | Holistic House", description: "Explore your personal resources, balance and energy through a free author-led symbolic Five Elements reflection. Not medical diagnosis." },
  ru: { title: "Бесплатный профиль ресурсов У-Син | Holistic House", description: "Исследуйте личные ресурсы, баланс и внутреннюю опору с помощью бесплатного авторского символического профиля Дао / У-Син. Не медицинская диагностика." },
  es: { title: "Perfil gratuito de recursos Wu Xing | Holistic House", description: "Explora tus recursos y equilibrio mediante una reflexión simbólica gratuita sobre los Cinco Elementos. No es un diagnóstico médico." },
} as const;
export function generateStaticParams() { return [{ locale: "en" }, { locale: "ru" }, { locale: "es" }]; }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!isPublicLocale(locale)) return { robots: { index: false } };
  const t = copy[locale];
  return {
    metadataBase: metadataBaseFor(),
    title: t.title, description: t.description,
    alternates: {
      canonical: "/" + locale + "/services/dao-health-profile",
      languages: { en: "/en/services/dao-health-profile", ru: "/ru/services/dao-health-profile", es: "/es/services/dao-health-profile", "x-default": "/en/services/dao-health-profile" },
    },
    openGraph: { type: "website", siteName: "Holistic House", title: t.title, description: t.description,
      url: "/" + locale + "/services/dao-health-profile", images: [{ url: "/academy/reiki-yggdrasil/source/eastern-tradition.png", alt: "Wu Xing resource profile" }] },
  };
}

export default async function WuXingProfilePage({ params }: Props) {
  const { locale } = await params;
  if (!isPublicLocale(locale)) notFound();
  return <FreeEntryLanding locale={locale} kind="dao" />;
}
