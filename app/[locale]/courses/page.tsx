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
    title: ru ? "Мои курсы — ОПОРА Антистресс, 14 занятий | Holistic House" : "My Courses — OPORA Stress Relief, 14 lessons | Holistic House",
    description: ru
      ? "Сейчас доступен курс ОПОРА Антистресс: 14 занятий, семь навыков самоподдержки, практика и наблюдение за изменениями. Другие курсы в разработке."
      : "OPORA Stress Relief is the currently available free learning course: 14 lessons, seven practical skills, gentle exercises and honest progress tracking.",
    alternates: { canonical: `/${locale}/courses`, languages: { en: "/en/courses", ru: "/ru/courses", es: "/es/courses" } },
  };
}
export default async function CoursesPage({ params }: PageProps) {
  const { locale } = await params;
  if (!isSupportedLocale(locale)) notFound();
  return <PublicGrowthCourses locale={locale} />;
}
