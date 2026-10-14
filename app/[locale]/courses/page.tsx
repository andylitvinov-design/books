import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PublicGrowthCourses } from "@/components/public-growth-courses";
import { getHomeopathyLocaleParams, isSupportedLocale } from "@/data/remedies";
import { metadataBaseFor } from "@/data/site-metadata";

type PageProps = { params: Promise<{ locale: string }> };
export function generateStaticParams() { return getHomeopathyLocaleParams(); }
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  if (!isSupportedLocale(locale)) return { title: "Not found" };
  const ru = locale === "ru";
  return {
    metadataBase: metadataBaseFor(),
    title: ru ? "Мои курсы — бесплатные 14-дневные программы | Holistic House" : "My Courses — free 14-day learning programmes | Holistic House",
    description: ru
      ? "Антистресс, уверенность, фокус и персональный курс. Выберите направление, пройдите тесты и двигайтесь по одному уроку в день."
      : "Stress relief, inner confidence, focus and a personal course. Start with a free programme, assessments and one lesson at a time.",
    alternates: { canonical: `/${locale}/courses`, languages: { en: "/en/courses", ru: "/ru/courses", es: "/es/courses" } },
  };
}
export default async function CoursesPage({ params }: PageProps) {
  const { locale } = await params;
  if (!isSupportedLocale(locale)) notFound();
  return <PublicGrowthCourses locale={locale} />;
}
