"use client";

import { useId, useState } from "react";
import Image from "next/image";
import { ChevronDown, ExternalLink, Play } from "lucide-react";
import type { PublishedSiteVideo } from "@/lib/site-videos/model";
import type { PublicLocale } from "@/lib/public-locales";

type Props = {
  video: PublishedSiteVideo;
  locale: PublicLocale;
  compact?: boolean;
  fallbackPoster?: string;
};

const labels = {
  en: { play: "Watch video", watch: "Watch on YouTube", transcript: "Read transcript", audio: "" },
  ru: { play: "Смотреть видео", watch: "Открыть на YouTube", transcript: "Читать текст видео", audio: "" },
  es: { play: "Ver vídeo", watch: "Ver en YouTube", transcript: "Leer transcripción", audio: "Audio en" },
} as const;

/**
 * Only for the public home page's validated YouTube recordings. The normal
 * SiteVideoPlayer still handles HeyGen, recovery, masters and other routes.
 * This small first-screen facade neither imports that player nor mounts an
 * iframe until the visitor explicitly chooses to play the film.
 */
export function HomeYoutubeFacade({ video, locale, compact = false, fallbackPoster }: Props) {
  const [playing, setPlaying] = useState(false);
  const [posterFailed, setPosterFailed] = useState(false);
  const titleId = useId();
  const youtubeId = video.youtubeId;
  if (!youtubeId || !/^[A-Za-z0-9_-]{11}$/.test(youtubeId) || video.heygenId) return null;

  const t = labels[locale];
  const poster = posterFailed ? null : fallbackPoster || `https://i.ytimg.com/vi/${youtubeId}/hqdefault.jpg`;
  const watchUrl = `https://www.youtube.com/watch?v=${youtubeId}`;
  const iframeUrl = `https://www.youtube-nocookie.com/embed/${youtubeId}?autoplay=1&playsinline=1&rel=0&hl=${locale}&cc_lang_pref=${video.language}`;
  const audioLabel = locale === "es" && video.language !== "es"
    ? `${t.audio} ${video.language === "ru" ? "ruso" : "inglés"}`
    : "";
  const duration = video.durationSeconds && video.durationSeconds > 0
    ? `${Math.floor(video.durationSeconds / 60)}:${String(video.durationSeconds % 60).padStart(2, "0")}`
    : null;

  return (
    <figure className={`site-video-player${compact ? " site-video-player--compact" : ""}`}
      lang={locale} aria-labelledby={titleId} data-home-video-facade="true">
      <div className="site-video-frame">
        {playing ? (
          <iframe className="site-video-iframe" src={iframeUrl} title={video.title}
            allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
            allowFullScreen loading="eager" referrerPolicy="strict-origin-when-cross-origin" />
        ) : (
          <button type="button" className="site-video-play"
            onClick={() => setPlaying(true)} aria-label={`${t.play}: ${video.title}`}>
            {poster ? <Image className="site-video-poster" src={poster} alt="" fill
              unoptimized loading="lazy" sizes={compact ? "(max-width: 767px) 100vw, 33vw" : "(max-width: 767px) 100vw, 960px"}
              onError={() => setPosterFailed(true)} /> : null}
            <span className="site-video-shade" aria-hidden="true" />
            <span className="site-video-poster-title" aria-hidden="true" data-title={video.title} />
            <span className="site-video-play-prompt" aria-hidden="true">
              <span className="site-video-play-icon"><Play /></span>
              <span className="site-video-play-label">{t.play}</span>
            </span>
            {duration ? <span className="site-video-duration" aria-hidden="true">{duration}</span> : null}
          </button>
        )}
      </div>
      <figcaption className="site-video-caption">
        <div className="site-video-copy" lang={video.language}>
          <p className="site-video-title" id={titleId}>{video.title}</p>
          {video.description ? <p className="site-video-description">{video.description}</p> : null}
        </div>
        {audioLabel ? <p className="site-video-description site-video-audio-language">{audioLabel}</p> : null}
        <div className="site-video-actions">
          <a className="site-video-watch-link" href={watchUrl} target="_blank" rel="noopener noreferrer">
            {t.watch} <ExternalLink aria-hidden="true" />
          </a>
          {duration ? <time className="site-video-duration-text" dateTime={`PT${video.durationSeconds}S`}>{duration}</time> : null}
        </div>
        {video.transcript ? (
          <details className="site-video-transcript">
            <summary>{t.transcript}<ChevronDown aria-hidden="true" /></summary>
            <p lang={video.language}>{video.transcript}</p>
          </details>
        ) : null}
      </figcaption>
    </figure>
  );
}
