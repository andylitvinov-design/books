import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PublicAntistressLanding } from "@/components/public-antistress-landing";
import { getHomeopathyLocaleParams, isSupportedLocale } from "@/data/remedies";
import { metadataBaseFor } from "@/data/site-metadata";

type Props = { params: Promise<{ locale: string }> };
const seo = {
  ru: {
    title: "ОПОРА Антистресс — 6 модулей по 14 дней | Holistic House",
    description: "Адаптивная программа ОПОРА Антистресс: два коротких опроса, персональная рекомендация одного из 6 модулей по 14 дней, интерактивные практики и добровольная проверка результатов."
  },
  en: {
    title: "OPORA Anti-Stress — Six 14-Day Modules | Holistic House",
    description: "Explore one adaptive Anti-Stress programme: two short questionnaires, a choice of six different 14-day learning modules, interactive exercises and optional outcome tracking."
  },
  es: {
    title: "OPORA Antiestrés — Seis módulos de 14 días | Holistic House",
    description: "Un programa de Antiestrés con seis módulos de 14 días, dos evaluaciones breves, una recomendación personalizada y prácticas educativas."
  }
} as const;

export function generateStaticParams() { return getHomeopathyLocaleParams(); }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!isSupportedLocale(locale)) return { title: "Not found" };
  const t = seo[locale as keyof typeof seo];
  return {
    metadataBase: metadataBaseFor(),
    title: t.title,
    description: t.description,
    alternates: {
      canonical: "/" + locale + "/courses/antistress",
      languages: {
        en: "/en/courses/antistress",
        ru: "/ru/courses/antistress",
        es: "/es/courses/antistress"
      }
    },
    openGraph: {
      type: "website",
      title: t.title,
      description: t.description,
      images: [{ url: "/images/holistic-house/course-focus-mountain-boy.webp" }]
    }
  };
}

export default async function AntiStressPage({ params }: Props) {
  const { locale } = await params;
  if (!isSupportedLocale(locale)) notFound();
  return <PublicAntistressLanding locale={locale} />;
}
