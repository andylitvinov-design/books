import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LibraryHub } from "@/components/library-hub";
import { loadPublicLibraryFeed } from "@/lib/public-library-feed";
import { loadApprovedVideoDiscoveries } from "@/lib/video-discovery/approved-meditations";
import { metadataBaseFor } from "@/data/site-metadata";
import { getHomeopathyLocaleParams, isSupportedLocale } from "@/data/remedies";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type Props = { params: Promise<{ locale: string }> };

export function generateStaticParams() {
  return getHomeopathyLocaleParams();
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!isSupportedLocale(locale)) return { title: "Not found" };
  return {
    metadataBase: metadataBaseFor(),
    title: "MyTube — Holistic House",
    description: {
      en: "Explore reviewed public meditation, practice and learning videos by life area, goal, approach and original language.",
      ru: "Видеоканал Holistic House: медитации, практики и уроки с подбором по сфере жизни, цели, подходу и языку оригинала.",
      es: "Canal de vídeo Holistic House: meditaciones, prácticas y clases por objetivo, ámbito de vida, enfoque e idioma original.",
    }[locale],
    alternates: {
      canonical: `/${locale}/mytube`,
      languages: { en: "/en/mytube", ru: "/ru/mytube", es: "/es/mytube", "x-default": "/en/mytube" },
    },
  };
}

export default async function MyTubePage({ params }: Props) {
  const { locale } = await params;
  if (!isSupportedLocale(locale)) notFound();
  // Use only the already published public library and independently reviewed
  // meditation catalog. No private client recordings or provider scraping.
  const [{ videos }, approvedMeditations] = await Promise.all([
    loadPublicLibraryFeed(locale),
    loadApprovedVideoDiscoveries(),
  ]);
  return <LibraryHub locale={locale} view="videos" myTube
    publishedVideos={videos} approvedMeditations={approvedMeditations} />;
}
