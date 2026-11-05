import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { isPublicLocale } from "@/data/academy/catalog";
import { metadataBaseFor } from "@/data/site-metadata";

type PageProps = { params: Promise<{ locale: string }> };

// Legacy /courses bookmarks should reach the full public Academy, not one subsection.
export function generateStaticParams() {
  return (["en", "ru", "es"] as const).map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  if (!isPublicLocale(locale)) return { title: "Not found" };
  const copy = {
    en: { title: "Courses & Academy | Holistic House", description: "Discover all Holistic House courses and learning programs in the Academy." },
    ru: { title: "Курсы и Академия | Holistic House", description: "Полный каталог курсов и образовательных программ Holistic House в Академии." },
    es: { title: "Cursos y Academia | Holistic House", description: "Explora todos los cursos y programas educativos de Holistic House en la Academia." },
  }[locale];
  return {
    metadataBase: metadataBaseFor(),
    title: copy.title,
    description: copy.description,
    alternates: {
      canonical: `/${locale}/academy`,
      languages: { en: "/en/academy", ru: "/ru/academy", es: "/es/academy" },
    },
  };
}

export default async function CoursesPage({ params }: PageProps) {
  const { locale } = await params;
  if (!isPublicLocale(locale)) notFound();
  permanentRedirect(`/${locale}/academy`);
}
