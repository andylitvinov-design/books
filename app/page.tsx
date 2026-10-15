import type { Metadata } from "next";
import { Suspense } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { HolisticHouseHome } from "@/components/holistic-house-home";
import { SiteVideoPlayer } from "@/components/site-video-player";
import type { Locale } from "@/data/remedies";
import { videoKey } from "@/lib/site-videos/model";
import { getPublishedSiteVideos } from "@/lib/site-videos/public";
import { uiLocaleCookie } from "@/lib/ui-locale";
import { publicLocaleCookie } from "@/lib/public-locales";
type PageProps = { searchParams: Promise<{ lang?: string | string[] }> };
const meta = {
  en: { title: "Holistic House — inner development, practice and personal work", description: "Holistic House: personal sessions, free mental wellbeing and inner resources monitoring, Academy programs, books, and a practical reference library." },
  ru: { title: "Holistic House — развитие, практики и индивидуальная работа", description: "Holistic House: индивидуальная работа, бесплатный мониторинг психологического состояния и внутренних ресурсов, программы Academy, книги и библиотека." },
} as const;
async function homeLocale(searchParams: PageProps["searchParams"]): Promise<Locale> {
  const [{ lang }, cookieStore] = await Promise.all([searchParams, cookies()]);
  if (lang === "es") redirect('/es');
  if (lang === "en" || lang === "ru") return lang;
  if (cookieStore.get(publicLocaleCookie)?.value === 'es') redirect('/es');
  return cookieStore.get(uiLocaleCookie)?.value === "ru" ? "ru" : "en";
}
export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const locale = await homeLocale(searchParams);
  return { ...meta[locale], alternates: { canonical: locale === "ru" ? "/?lang=ru" : "/", languages: { en: "/?lang=en", ru: "/?lang=ru", es: "/es", "x-default": "/" } } };
}
// Public marketing HTML still uses a per-request CSP nonce and locale cookie.
// Stream only the separately cached, approved video metadata: the hero is not
// held up by a cold Redis connection or the 60-second cache revalidation.
async function HomeIntroVideo({ locale }: { locale: Locale }) {
  const publishedVideos = await getPublishedSiteVideos();
  const introVideo = publishedVideos[videoKey("home-intro", locale)];
  if (!introVideo) return null;
  const heading = locale === "ru"
    ? { kicker: "Короткое знакомство", title: "О Holistic House за полминуты" }
    : { kicker: "A short introduction", title: "Holistic House in half a minute" };
  return (
    <section className="service-home-video" aria-labelledby="service-home-video-title">
      <header>
        <p className="service-home-kicker">{heading.kicker}</p>
        <h2 id="service-home-video-title">{heading.title}</h2>
      </header>
      <div className="site-video-block" data-video-slot="home-intro" data-video-locale={locale} aria-label={introVideo.title}>
        <SiteVideoPlayer key={locale} video={introVideo} locale={locale} className="site-video--home" />
      </div>
    </section>
  );
}
export default async function HomePage({ searchParams }: PageProps) {
  const locale = await homeLocale(searchParams);
  return (
    <HolisticHouseHome key={locale} locale={locale} introVideoContent={
      <Suspense fallback={null}>
        <HomeIntroVideo locale={locale} />
      </Suspense>
    } />
  );
}
