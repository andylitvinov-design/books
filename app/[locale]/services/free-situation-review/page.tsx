import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { FreeEntryLanding } from "@/components/free-entry-landing";
import { isPublicLocale } from "@/data/academy/catalog";
import { metadataBaseFor } from "@/data/site-metadata";

type Props = { params: Promise<{ locale: string }> };
const copy = {
  en: { title: "Free Personal Situation Review with Andrey | Holistic House", description: "Get a free personal written perspective from Andrey Litvinov. Explore your question, your resources and a practical next step. Optional Wu Xing review or €50/30-minute consultation." },
  ru: { title: "Бесплатный разбор ситуации с Андреем | Holistic House", description: "Получите бесплатный письменный разбор вашей ситуации с Андреем Литвиновым: главный вопрос, ресурсы и возможный следующий шаг. У-Син и личная консультация €50/30 мин — по желанию." },
  es: { title: "Revisión personal gratuita con Andrey | Holistic House", description: "Recibe una revisión personal escrita gratuita de Andrey Litvinov: tu pregunta, tus recursos y un posible siguiente paso. Wu Xing o consulta de €50/30 minutos opcionales." },
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
      canonical: "/" + locale + "/services/free-situation-review",
      languages: { en: "/en/services/free-situation-review", ru: "/ru/services/free-situation-review", es: "/es/services/free-situation-review", "x-default": "/en/services/free-situation-review" },
    },
    openGraph: { type: "website", siteName: "Holistic House", title: t.title, description: t.description,
      url: "/" + locale + "/services/free-situation-review", images: [{ url: "/images/holistic-house/andy-about.png", alt: "Andrey Litvinov" }] },
    twitter: { card: "summary_large_image", title: t.title, description: t.description, images: ["/images/holistic-house/andy-about.png"] },
  };
}

export default async function FreeSituationReviewPage({ params }: Props) {
  const { locale } = await params;
  if (!isPublicLocale(locale)) notFound();
  return <FreeEntryLanding locale={locale} kind="situation" />;
}
