"use client";

import { ChevronDown, ExternalLink, Film, Play } from "lucide-react";
import Image from "next/image";
import { useEffect, useId, useRef, useState } from "react";

import { parseSiteVideoSource, siteVideoWatchUrl, type PublishedSiteVideo } from "@/lib/site-videos/model";
import styles from "./site-video-minimal.module.css";

export type SiteVideoPlayerProps = {
  video: PublishedSiteVideo;
  locale: "en" | "ru";
  compact?: boolean;
  /** Poster-first presentation for an introduction whose page already supplies context. */
  minimal?: boolean;
  /** Only above-the-fold placements should eagerly load their small still image. */
  posterPriority?: boolean;
  className?: string;
};

const copy = {
  en: {
    play: "Watch video",
    watch: "Watch on YouTube",
    watchHeygen: "Open video on HeyGen",
    aiDisclosure: "AI-assisted video.",
    andyAiDisclosure: "AI-assisted video using Andy’s digital twin and voice.",
    aiShort: "AI video",
    avatarShort: "AI avatar",
    transcript: "Read transcript",
    transcriptShort: "Transcript",
    details: "Video details",
    duration: "Duration",
    seconds: "seconds",
    newTab: "opens in a new tab",
  },
  ru: {
    play: "Смотреть видео",
    watch: "Открыть на YouTube",
    watchHeygen: "Открыть видео в HeyGen",
    aiDisclosure: "Видео создано с помощью ИИ.",
    andyAiDisclosure: "Видео с цифровым двойником и голосом Энди, созданное с помощью ИИ.",
    aiShort: "ИИ-видео",
    avatarShort: "ИИ-аватар",
    transcript: "Читать текст видео",
    transcriptShort: "Текст видео",
    details: "О видео",
    duration: "Продолжительность",
    seconds: "сек.",
    newTab: "откроется в новой вкладке",
  },
} as const;

// Match artwork to the exact approved video, never to a language alone. A future
// replacement must not inherit another video's poster. No expiring CDN URLs here.
const approvedAndyPosters: Readonly<Record<string, string>> = {
  fd5fcead9b067f9a0649862675a38771: "/images/holistic-house/andy-about.png",
  d4e55c984e54b40fbeb8a21f81d27694: "/images/holistic-house/video-posters/psychic-alchemy-ru-v1.webp",
};

function videoDuration(seconds?: number) {
  if (typeof seconds !== "number" || !Number.isFinite(seconds) || seconds <= 0) return null;
  const total = Math.max(1, Math.round(seconds));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const remainder = String(total % 60).padStart(2, "0");
  return {
    total,
    label: hours ? `${hours}:${String(minutes).padStart(2, "0")}:${remainder}` : `${minutes}:${remainder}`,
  };
}

/** A page cannot turn arbitrary source data into an iframe URL. */
export function SiteVideoPlayer({ video, locale, compact = false, minimal = false, posterPriority = false, className }: SiteVideoPlayerProps) {
  const watchUrl = siteVideoWatchUrl(video);
  const source = watchUrl ? parseSiteVideoSource(watchUrl) : null;
  if (!source) return null;

  return (
    <PlayableSiteVideo
      key={`${source.heygenId ? "heygen:" + source.heygenId : "youtube:" + source.youtubeId}:${locale}:${video.language}`}
      video={{ ...video, ...source }}
      locale={locale}
      compact={compact}
      minimal={minimal}
      posterPriority={posterPriority}
      className={className}
    />
  );
}

function PlayableSiteVideo({ video, locale, compact = false, minimal = false, posterPriority = false, className }: SiteVideoPlayerProps) {
  const text = copy[locale];
  const [playing, setPlaying] = useState(false);
  const [poster, setPoster] = useState<"maxres" | "hq" | null>("maxres");
  const playerRef = useRef<HTMLIFrameElement>(null);
  const titleId = useId();
  const duration = videoDuration(video.durationSeconds);
  const watchUrl = siteVideoWatchUrl(video);
  const isHeygen = Boolean(video.heygenId);
  const approvedPoster = video.heygenId ? approvedAndyPosters[video.heygenId] : undefined;
  const isApprovedAndyIntro = Boolean(approvedPoster);
  const watchLabel = isHeygen ? text.watchHeygen : text.watch;
  const aiDisclosure = isApprovedAndyIntro ? text.andyAiDisclosure : text.aiDisclosure;
  const playerParams = new URLSearchParams({ autoplay: "1", playsinline: "1", rel: "0", hl: locale, cc_lang_pref: video.language });
  const embedUrl = isHeygen
    ? `https://app.heygen.com/embeds/${video.heygenId}`
    : `https://www.youtube-nocookie.com/embed/${video.youtubeId}?${playerParams.toString()}`;

  useEffect(() => {
    if (playing) playerRef.current?.focus();
  }, [playing]);

  function showFallbackPoster() {
    setPoster((current) => current === "maxres" ? "hq" : null);
  }

  const externalLink = (
    <a
      className="site-video-watch-link"
      href={watchUrl}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`${watchLabel}: ${video.title} (${text.newTab})`}
    >
      {watchLabel}<ExternalLink aria-hidden="true" />
    </a>
  );

  return (
    <figure
      className={["site-video-player", compact && "site-video-player--compact", minimal && "site-video-player--minimal", minimal && styles.minimal, className].filter(Boolean).join(" ")}
      aria-labelledby={titleId}
      lang={locale}
    >
      <div className="site-video-frame">
        {playing ? (
          <iframe
            ref={playerRef}
            className="site-video-iframe"
            src={embedUrl}
            title={video.title}
            allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
            allowFullScreen
            loading="lazy"
            referrerPolicy="strict-origin-when-cross-origin"
            tabIndex={0}
          />
        ) : (
          <button
            className="site-video-play"
            type="button"
            aria-label={`${text.play}: ${video.title}`}
            onClick={() => setPlaying(true)}
          >
            {approvedPoster && poster ? (
              <Image
                className="site-video-poster"
                src={approvedPoster}
                alt=""
                fill
                priority={posterPriority}
                loading={posterPriority ? undefined : "lazy"}
                sizes={compact ? "(max-width: 767px) 100vw, 33vw" : "(max-width: 767px) 100vw, 960px"}
                onError={() => setPoster(null)}
              />
            ) : isHeygen ? (
              <Film aria-hidden="true" className="site-video-generic-poster" strokeWidth={0.8} style={{ position: "absolute", width: "50%", height: "70%", opacity: 0.12 }} />
            ) : poster ? (
              <Image
                key={poster}
                className="site-video-poster"
                src={`https://i.ytimg.com/vi/${video.youtubeId}/${poster === "maxres" ? "maxresdefault" : "hqdefault"}.jpg`}
                alt=""
                fill
                unoptimized
                loading="lazy"
                sizes={compact ? "(max-width: 767px) 100vw, 33vw" : "(max-width: 767px) 100vw, 960px"}
                onError={showFallbackPoster}
                onLoad={(event) => {
                  if (event.currentTarget.naturalWidth <= 120) showFallbackPoster();
                }}
              />
            ) : null}
            <span className="site-video-shade" aria-hidden="true" />
            <span className="site-video-play-prompt" aria-hidden="true">
              <span className="site-video-play-icon"><Play /></span>
              {!minimal && <span className="site-video-play-label">{text.play}</span>}
            </span>
            {duration && <span className="site-video-duration" aria-hidden="true">{duration.label}</span>}
          </button>
        )}
      </div>

      {minimal ? (
        <figcaption className="site-video-caption">
          <span className={styles.accessibleTitle} id={titleId} lang={video.language}>{video.title}</span>
          <details className="site-video-transcript">
            <summary>{video.transcript ? text.transcriptShort : text.details}<ChevronDown aria-hidden="true" /></summary>
            <div className="site-video-more">
              {video.transcript && <p lang={video.language}>{video.transcript}</p>}
              <div className="site-video-actions">{externalLink}</div>
            </div>
          </details>
          {isHeygen && <span className="site-video-ai-badge" title={aiDisclosure} aria-label={aiDisclosure}>{isApprovedAndyIntro ? text.avatarShort : text.aiShort}</span>}
        </figcaption>
      ) : (
        <figcaption className="site-video-caption">
          <div className="site-video-copy" lang={video.language}>
            <p className="site-video-title" id={titleId}>{video.title}</p>
            {video.description && <p className="site-video-description">{video.description}</p>}
          </div>
          {isHeygen && <p className="site-video-description site-video-ai-disclosure">{aiDisclosure}</p>}
          <div className="site-video-actions">
            {externalLink}
            {duration && <time className="site-video-duration-text" dateTime={`PT${duration.total}S`} aria-label={`${text.duration}: ${duration.total} ${text.seconds}`}>{duration.label}</time>}
          </div>
          {video.transcript && <details className="site-video-transcript"><summary>{text.transcript}<ChevronDown aria-hidden="true" /></summary><p lang={video.language}>{video.transcript}</p></details>}
        </figcaption>
      )}
    </figure>
  );
}
