import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PublicAntistressLanding } from "@/components/public-antistress-landing";
import { getHomeopathyLocaleParams, isSupportedLocale } from "@/data/remedies";
import { metadataBaseFor } from "@/data/site-metadata";

type Props = { params: Promise<{ locale: string }> };
const seo = {
  ru: {
    title: "ОПОРА — Антистресс: 14 дней, 7 навыков | Holistic House",
    description: "Бесплатный антистресс-курс ОПОРА: 14 коротких интерактивных занятий, семь практических навыков, мягкая регуляция стресса, личные упражнения и наблюдение за результатами."
  },
  en: {
    title: "OPORA Stress Relief — 14 Days, 7 Skills | Holistic House",
    description: "Explore OPORA Stress Relief: 14 short interactive lessons, seven practical coping skills, gentle self-guided practices and honest progress tracking."
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
