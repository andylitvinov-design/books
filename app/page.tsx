import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { HolisticHouseHome } from "@/components/holistic-house-home";
import { homeMetadataFor } from "@/lib/home-seo";
import { videoKey } from "@/lib/site-videos/model";
import { getPublishedSiteVideos } from "@/lib/site-videos/public";

type Props = { searchParams: Promise<{ lang?: string | string[] }> };

export async function generateMetadata(): Promise<Metadata> {
  return homeMetadataFor("en");
}

export default async function HomePage({ searchParams }: Props) {
  const { lang } = await searchParams;
  const requested = Array.isArray(lang) ? lang[0] : lang;
  // Preserve existing shared links, but keep locale content on stable URLs.
  if (requested === "ru" || requested === "es") redirect(`/${requested}`);
  const publishedVideos = await getPublishedSiteVideos();
  return (
    <HolisticHouseHome
      locale="en"
      introVideos={{ en: publishedVideos[videoKey("home-intro", "en")] }}
    />
  );
}
