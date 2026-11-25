import { SiteVideoPlayer } from "@/components/site-video-player";
import { videoKey } from "@/lib/site-videos/model";
import { getPublishedSiteVideo } from "@/lib/site-videos/public";

const copy = {
  en: { kicker: "A short introduction", title: "Holistic House in half a minute" },
  ru: { kicker: "Короткое знакомство", title: "О Holistic House за полминуты" },
} as const;

/**
 * Server-streamed public section: first-paint hero must not await Redis.
 * The store already publishes a filtered 60-second snapshot, never drafts.
 * No private session, cookie or request-specific CSP nonce is cached.
 */
export async function HomeIntroVideoSection({ locale }: { locale: "en" | "ru" }) {
  const introVideo = await getPublishedSiteVideo(videoKey("home-intro", locale));
  if (!introVideo) return null;
  const text = copy[locale];
  return (
    <section className="service-home-video" aria-labelledby="service-home-video-title">
      <header>
        <p className="service-home-kicker">{text.kicker}</p>
        <h2 id="service-home-video-title">{text.title}</h2>
      </header>
      <div className="site-video-block" data-video-slot="home-intro" data-video-locale={locale} aria-label={introVideo.title}>
        <SiteVideoPlayer key={locale} video={introVideo} locale={locale} className="site-video--home" />
      </div>
    </section>
  );
}
