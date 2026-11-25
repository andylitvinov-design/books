"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import { ExternalLink, Play } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import type { PublishedSiteVideo } from "@/lib/site-videos/model";
import type { PublicLocale } from "@/lib/public-locales";

// The 12 approved testimonials stay present as real, vertically ordered
// poster cards in server HTML. Their interactive player JavaScript is only
// requested when a card approaches the viewport.
const HomeYoutubeFacade = dynamic(
  () => import("@/components/home-youtube-facade").then((module) => module.HomeYoutubeFacade),
  { ssr: false },
);

const labels = {
  en: { play: "Watch video on YouTube", watch: "Watch on YouTube" },
  ru: { play: "Открыть видео на YouTube", watch: "Смотреть на YouTube" },
  es: { play: "Ver vídeo en YouTube", watch: "Ver en YouTube" },
} as const;

type Props = {
  video: PublishedSiteVideo;
  locale: PublicLocale;
  textLanguage?: PublicLocale;
  compact?: boolean;
  fallbackPoster?: string;
};

export function DeferredYoutubeReview({ video, locale, textLanguage, compact = false, fallbackPoster }: Props) {
  const mountRef = useRef<HTMLDivElement>(null);
  const [nearViewport, setNearViewport] = useState(false);
  const [posterFailed, setPosterFailed] = useState(false);
  const id = video.youtubeId;
  const validVideo = Boolean(id && /^[A-Za-z0-9_-]{11}$/.test(id) && !video.heygenId);

  useEffect(() => {
    if (!validVideo || !mountRef.current) return;
    if (typeof IntersectionObserver === "undefined") {
      setNearViewport(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setNearViewport(true);
          observer.disconnect();
        }
      },
      { rootMargin: "350px 0px" },
    );
    observer.observe(mountRef.current);
    return () => observer.disconnect();
  }, [validVideo]);

  if (!validVideo || !id) return null;
  const watchUrl = "https://www.youtube.com/watch?v=" + id;
  const poster = posterFailed ? null : fallbackPoster || "https://i.ytimg.com/vi/" + id + "/hqdefault.jpg";
  const t = labels[locale];

  return (
    <div ref={mountRef} data-deferred-youtube-review>
      {nearViewport ? (
        <HomeYoutubeFacade video={video} locale={locale} textLanguage={textLanguage}
          compact={compact} fallbackPoster={fallbackPoster} />
      ) : (
        <figure className={"site-video-player" + (compact ? " site-video-player--compact" : "")}
          lang={locale} aria-label={video.title}>
          <div className="site-video-frame">
            <a className="site-video-play" href={watchUrl} target="_blank"
              rel="noopener noreferrer" aria-label={t.play + ": " + video.title}>
              {poster ? <Image className="site-video-poster" src={poster} alt="" fill
                unoptimized loading="lazy" sizes="(max-width: 767px) 100vw, 33vw"
                onError={() => setPosterFailed(true)} /> : null}
              <span className="site-video-shade" aria-hidden="true" />
              <span className="site-video-play-prompt" aria-hidden="true">
                <span className="site-video-play-icon"><Play /></span>
                <span className="site-video-play-label">{t.play}</span>
              </span>
            </a>
          </div>
          <figcaption className="site-video-caption">
            <div className="site-video-copy" lang={textLanguage ?? video.language}>
              <p className="site-video-title">{video.title}</p>
            </div>
            <div className="site-video-actions">
              <a className="site-video-watch-link" href={watchUrl} target="_blank"
                rel="noopener noreferrer">{t.watch}<ExternalLink aria-hidden="true" /></a>
            </div>
          </figcaption>
        </figure>
      )}
    </div>
  );
}
