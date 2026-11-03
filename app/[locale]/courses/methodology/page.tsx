import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PublicCourseMethodology } from "@/components/public-course-methodology";
import { getHomeopathyLocaleParams, isSupportedLocale } from "@/data/remedies";
import { metadataBaseFor } from "@/data/site-metadata";

type Props = { params: Promise<{ locale: string }> };
const seo = {
  ru: {
    title: "Метод ОПОРА — научные и методологические основы курсов | Holistic House",
    description: "Узнайте, как устроен метод ОПОРА: пять шагов, 14 уроков, персонализация и опора на КПТ, ACT и психологию изменения поведения.",
  },
  en: {
    title: "The OPORA Method — Our Course Foundations | Holistic House",
    description: "Explore the OPORA method: five practical steps, 14 lessons, personalized learning and research-informed principles from CBT, ACT and behaviour change.",
  },
  es: {
    title: "Método OPORA — fundamentos de nuestros cursos | Holistic House",
    description: "Descubre el método OPORA: cinco pasos, 14 lecciones y una ruta personalizada con bases en la TCC, ACT y la ciencia del cambio de conducta.",
  },
} as const;

export function generateStaticParams() {
  return getHomeopathyLocaleParams();
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!isSupportedLocale(locale)) return { title: "Not found" };
  const language = locale as keyof typeof seo;
  return {
    metadataBase: metadataBaseFor(),
    title: seo[language].title,
    description: seo[language].description,
    alternates: {
      canonical: `/${locale}/courses/methodology`,
      languages: {
        en: "/en/courses/methodology",
        ru: "/ru/courses/methodology",
        es: "/es/courses/methodology",
        "x-default": "/en/courses/methodology",
      },
    },
    openGraph: { title: seo[language].title, description: seo[language].description, type: "article" },
  };
}

export default async function MethodologyPage({ params }: Props) {
  const { locale } = await params;
  if (!isSupportedLocale(locale)) notFound();
  return <PublicCourseMethodology locale={locale} />;
}
