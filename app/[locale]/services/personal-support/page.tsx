import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PersonalSupportLanding } from "@/components/personal-support-landing";
import { metadataBaseFor } from "@/data/site-metadata";
import { isPublicLocale } from "@/data/academy/catalog";

type Props = { params: Promise<{ locale: string }> };

const seo = {
  en: {
    title: "Personal Support · 2 sessions per month · €200 | Holistic House",
    description: "Personal guidance with Andrey Litvinov: two 60-minute sessions, questions between meetings, and an agreed online, Toronto or remote format for €200 per month.",
  },
  ru: {
    title: "Личное сопровождение · 2 сессии в месяц · €200 | Holistic House",
    description: "Личное сопровождение Андрея Литвинова: две встречи по 60 минут, вопросы между встречами, работа онлайн, в Торонто или дистанционно без звонка.",
  },
  es: {
    title: "Acompañamiento personal · 2 sesiones al mes · 200 € | Holistic House",
    description: "Acompañamiento de Andrey Litvinov: dos sesiones de 60 minutos, preguntas entre sesiones y formato presencial, en línea o a distancia por 200 € al mes.",
  },
} as const;

export function generateStaticParams() {
  return [{ locale: "en" }, { locale: "ru" }, { locale: "es" }];
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!isPublicLocale(locale)) return { robots: { index: false } };
  const t = seo[locale];
  const path = "/" + locale + "/services/personal-support";
  return {
    metadataBase: metadataBaseFor(),
    title: t.title,
    description: t.description,
    alternates: {
      canonical: path,
      languages: {
        en: "/en/services/personal-support",
        ru: "/ru/services/personal-support",
        es: "/es/services/personal-support",
        "x-default": "/en/services/personal-support",
      },
    },
    openGraph: {
      type: "website",
      siteName: "Holistic House",
      title: t.title,
      description: t.description,
      url: path,
      images: [{ url: "/images/holistic-house/andy-about.png", alt: "Andrey Litvinov" }],
    },
  };
}

export default async function PersonalSupportPage({ params }: Props) {
  const { locale } = await params;
  if (!isPublicLocale(locale)) notFound();
  return <PersonalSupportLanding locale={locale} />;
}
