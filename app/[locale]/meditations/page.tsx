import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { MeditationPracticeApp } from "@/components/meditation-practice-app";
import { freeMeditationVideos } from "@/data/academy/holistic-support-meditations";
import { osirisOriginalVideos } from "@/data/academy/egyptian-priesthood-curriculum";
import { isPublicLocale } from "@/data/academy/catalog";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ video?: string | string[] }>;
};
const title = {
  en: "Meditations & courses — Holistic House",
  ru: "Медитации и курсы — Holistic House",
  es: "Meditaciones y cursos — Holistic House",
} as const;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!isPublicLocale(locale)) return {};
  return { title: title[locale], alternates: { canonical: "/" + locale + "/meditations" } };
}

export default async function MeditationsPage({ params, searchParams }: Props) {
  const { locale } = await params;
  if (!isPublicLocale(locale)) notFound();
  const query = await searchParams;
  // Accept only pre-verified manifest IDs; the query string never becomes an iframe URL.
  const requested = typeof query.video === "string" ? query.video : undefined;
  const videos = freeMeditationVideos(locale);
  const initialVideoId = videos.some(video => video.id === requested) ? requested : undefined;
  const egyptVideos = osirisOriginalVideos
    .filter(video => /^[A-Za-z0-9_-]{11}$/.test(video.id))
    .map(video => ({
      id: video.id,
      order: video.order,
      title: video.title[locale],
      topics: ["energy" as const],
    }));
  return <MeditationPracticeApp locale={locale} videos={videos} egyptVideos={egyptVideos} initialVideoId={initialVideoId} />;
}
