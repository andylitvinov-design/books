import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PublicAntistressLanding } from "@/components/public-antistress-landing";
import { getHomeopathyLocaleParams, isSupportedLocale } from "@/data/remedies";
import { metadataBaseFor } from "@/data/site-metadata";

type Props = { params: Promise<{ locale: string }> };
const seo = {
  ru: {
    title: "ОПОРА Антистресс — 14 занятий · 6 маршрутов | Holistic House",
    description: "ОПОРА Антистресс: персональный маршрут из шести вариантов, 14 занятий, бережные интерактивные упражнения и добровольная обратная связь. Клинический маршрут — только со специалистом."
  },
  en: {
    title: "OPORA Anti-Stress — 14 Days & 6 Learning Paths | Holistic House",
    description: "One adaptive 14-day Anti-Stress programme with six learning paths, gentle interactive exercises and optional progress reflection. The clinical path requires a professional."
  },
  es: {
    title: "OPORA Antiestrés — 14 días y 6 rutas | Holistic House",
    description: "Programa personalizado de Antiestrés de 14 días con seis rutas, ejercicios suaves y reflexión opcional. La ruta clínica requiere un profesional."
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
        es: "/es/courses/antistress",
        "x-default": "/en/courses/antistress",
      }
    },
    manifest: "/opora-antistress-" + locale + ".webmanifest",
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
