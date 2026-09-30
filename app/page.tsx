import type { Metadata } from "next";
import { cookies } from "next/headers";
import { HolisticHouseHome } from "@/components/holistic-house-home";
import type { Locale } from "@/data/remedies";
import { videoKey } from "@/lib/site-videos/model";
import { getPublishedSiteVideos } from "@/lib/site-videos/public";
import { uiLocaleCookie } from "@/lib/ui-locale";

type PageProps = {
  searchParams: Promise<{ lang?: string | string[] }>;
};

const meta = {
  en: {
    title: "Holistic House — inner development, practice and personal work",
    description: "Holistic House: individual sessions, programs and workshops, a remedy reference library, books, and author materials.",
  },
  ru: {
    title: "Holistic House — развитие, практики и индивидуальная работа",
    description: "Holistic House: индивидуальные сессии, программы и воркшопы, навигация по препаратам, книги и авторские материалы.",
  },
} as const;

async function homeLocale(searchParams: PageProps["searchParams"]): Promise<Locale> {
  const [{ lang }, cookieStore] = await Promise.all([searchParams, cookies()]);
  if (lang === "en" || lang === "ru") return lang;
  return cookieStore.get(uiLocaleCookie)?.value === "ru" ? "ru" : "en";
}

export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const locale = await homeLocale(searchParams);
  return {
    ...meta[locale],
    alternates: {
      canonical: locale === "ru" ? "/?lang=ru" : "/",
      languages: { en: "/?lang=en", ru: "/?lang=ru", "x-default": "/" },
    },
  };
}

export default async function HomePage({ searchParams }: PageProps) {
  const [locale, publishedVideos] = await Promise.all([
    homeLocale(searchParams),
    getPublishedSiteVideos(),
  ]);
  const introVideos = {
    en: publishedVideos[videoKey("home-intro", "en")],
    ru: publishedVideos[videoKey("home-intro", "ru")],
  };
  return <HolisticHouseHome key={locale} locale={locale} introVideos={introVideos} />;
}
