import { SiteVideoPlayer } from "@/components/site-video-player";
import { videoKey } from "@/lib/site-videos/model";
import { getPublishedSiteVideos } from "@/lib/site-videos/public";

type PageVideoProps = {
  slot: string;
  locale: "en" | "ru";
  entityId?: string;
  className?: string;
};

/** Server-only placement: empty, hidden, and draft records produce no public markup. */
export async function PageVideo({ slot, locale, entityId = "", className = "" }: PageVideoProps) {
  const videos = await getPublishedSiteVideos();
  const video = videos[videoKey(slot, locale, entityId)];
  if (!video) return null;

  return (
    <section
      className={`site-video-block ${className}`.trim()}
      aria-label={video.title}
      data-video-slot={slot}
      data-video-locale={locale}
    >
      <SiteVideoPlayer video={video} locale={locale} />
    </section>
  );
}
