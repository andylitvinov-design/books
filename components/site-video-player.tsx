"use client";

import { ChevronDown, ExternalLink, Film, Play } from "lucide-react";
import Image from "next/image";
import { StaticPortrait } from "@/components/static-portrait";
import { useEffect, useId, useRef, useState } from "react";
import { parseSiteVideoSource, siteVideoWatchUrl, type PublishedSiteVideo } from "@/lib/site-videos/model";
import styles from "./site-video-minimal.module.css";

export type SiteVideoPlayerProps = {
  video: PublishedSiteVideo;
  locale: "en" | "ru" | "es";
  /** Display text may be translated without changing the actual audio language. */
  textLanguage?: "en" | "ru" | "es";
  compact?: boolean;
  /** Poster-first presentation for an introduction whose page already supplies context. */
  minimal?: boolean;
  /** Only above-the-fold placements should eagerly load their small still image. */
  posterPriority?: boolean;
  className?: string;
  /** Same-origin illustrative image visible whenever YouTube blocks its real thumbnail. */
  fallbackPoster?: string;
};

const copy = {
  en: {
    play: "Watch video", watch: "Watch on YouTube", watchHeygen: "Open video on HeyGen",
    aiDisclosure: "AI-assisted video.", andyAiDisclosure: "AI-assisted video using Andy’s digital twin and voice.",
    aiShort: "AI video", avatarShort: "AI avatar", transcript: "Read transcript", transcriptShort: "Transcript",
    details: "Video details", duration: "Duration", seconds: "seconds", newTab: "opens in a new tab",
    stalled: "Video not opening?", retry: "Try again",
  },
  ru: {
    play: "Смотреть видео", watch: "Открыть на YouTube", watchHeygen: "Открыть видео в HeyGen",
    aiDisclosure: "Видео создано с помощью ИИ.", andyAiDisclosure: "Видео с цифровым двойником и голосом Энди, созданное с помощью ИИ.",
    aiShort: "ИИ-видео", avatarShort: "ИИ-аватар", transcript: "Читать текст видео", transcriptShort: "Текст видео",
    details: "О видео", duration: "Продолжительность", seconds: "сек.", newTab: "откроется в новой вкладке",
    stalled: "Видео не открывается?", retry: "Повторить",
  },
  es: {
    play: "Ver vídeo", watch: "Ver en YouTube", watchHeygen: "Abrir vídeo en HeyGen",
    aiDisclosure: "Vídeo creado con ayuda de inteligencia artificial.", andyAiDisclosure: "Vídeo creado con inteligencia artificial mediante el doble digital y la voz de Andy.",
    aiShort: "Vídeo IA", avatarShort: "Avatar IA", transcript: "Leer el texto en español", transcriptShort: "Texto en español",
    details: "Detalles del vídeo", duration: "Duración", seconds: "segundos", newTab: "se abre en una pestaña nueva",
    stalled: "¿No se abre el vídeo?", retry: "Reintentar",
  },
} as const;

// Match artwork to the exact approved video, never to a language alone. A future
// replacement must not inherit another video's poster. No expiring CDN URLs here.
const approvedAndyPosters: Readonly<Record<string, string>> = {
  fd5fcead9b067f9a0649862675a38771: "/images/holistic-house/andy-about.png",
  "2c251709aba74fd96ae8be43257a080b": "/images/holistic-house/video-posters/psychic-alchemy-es-v1.webp",
  d4e55c984e54b40fbeb8a21f81d27694: "/images/holistic-house/video-posters/psychic-alchemy-ru-v1.webp",
  ed202847a43a96b918308aa972177b34: "/images/holistic-house/video-posters/home-en-v2.webp",
  "48105a2f2228e7cb3a67391e97acaf8b": "/images/holistic-house/video-posters/services-en-v2.webp",
  "34df311e461509433b45929908a9097a": "/images/holistic-house/video-posters/homeopathy-en-v2.webp",
  "8c1634ce904434a91931429b6a7eefe1": "/images/holistic-house/video-posters/hypnotherapy-en-v1.webp",
  "7c6b243f048b9c0581ae29619a4a89fc": "/images/holistic-house/video-posters/constellations-en-v1.webp",
  "388a04b39ebf215ae656bcd22d0d0847": "/images/holistic-house/video-posters/home-ru-v1.webp",
  "79c2845577865979cd95ac40a08fc01a": "/images/holistic-house/video-posters/services-ru-v1.webp",
  "0f984780d06948b1e78166e6e553e4e9": "/images/holistic-house/video-posters/homeopathy-ru-v1.webp",
};

// Exact published page renders only; About and future editor replacements are unchanged.
// Approved Unlisted YouTube mirror links for these exact public HeyGen masters.
// Prefer these identity-verified YouTube copies for public playback when HeyGen embeds fail.
// Preserve the original HeyGen record, artwork, transcript and owner editor state.
export const existingYouTubeMirrors: Readonly<Record<string, string>> = {
  ed202847a43a96b918308aa972177b34: "Y4K4piEwwA8",
  "48105a2f2228e7cb3a67391e97acaf8b": "s30Y42IwPcg",
  "34df311e461509433b45929908a9097a": "ILyRWyHtJoE",
  "388a04b39ebf215ae656bcd22d0d0847": "AE8Pelpo424",
  "79c2845577865979cd95ac40a08fc01a": "Cz6SxXJNZbw",
  "0f984780d06948b1e78166e6e553e4e9": "Q9NvYECKWuc",
};

const minimalPageVideoIds = new Set([
  "ed202847a43a96b918308aa972177b34",
  "48105a2f2228e7cb3a67391e97acaf8b",
  "34df311e461509433b45929908a9097a",
  "8c1634ce904434a91931429b6a7eefe1",
  "7c6b243f048b9c0581ae29619a4a89fc",
  "388a04b39ebf215ae656bcd22d0d0847",
  "79c2845577865979cd95ac40a08fc01a",
  "0f984780d06948b1e78166e6e553e4e9",
]);

function videoDuration(seconds?: number) {
  if (typeof seconds !== "number" || !Number.isFinite(seconds) || seconds <= 0) return null;
  const total = Math.max(1, Math.round(seconds));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const remainder = String(total % 60).padStart(2, "0");
  return { total, label: hours ? `${hours}:${String(minutes).padStart(2, "0")}:${remainder}` : `${minutes}:${remainder}` };
}

/** A page cannot turn arbitrary source data into an iframe URL. */
export function SiteVideoPlayer({ video, locale, textLanguage, compact = false, minimal = false, posterPriority = false, className, fallbackPoster }: SiteVideoPlayerProps) {
  const watchUrl = siteVideoWatchUrl(video);
  const source = watchUrl ? parseSiteVideoSource(watchUrl) : null;
  if (!source) return null;
  return (
    <PlayableSiteVideo
      key={`${source.heygenId ? "heygen:" + source.heygenId : "youtube:" + source.youtubeId}:${locale}:${video.language}`}
      video={{ ...video, ...source }} locale={locale} textLanguage={textLanguage} compact={compact}
      minimal={minimal || minimalPageVideoIds.has(source.heygenId ?? "")} posterPriority={posterPriority} className={className} fallbackPoster={fallbackPoster}
    />
  );
}

function PlayableSiteVideo({ video, locale, textLanguage = video.language, compact = false, minimal = false, posterPriority = false, className, fallbackPoster }: SiteVideoPlayerProps) {
  const text = copy[locale];
  const [playing, setPlaying] = useState(false);
  const [showRecovery, setShowRecovery] = useState(false);
  // SSR may appear before React attaches handlers on a slow connection.
  const [interactive, setInteractive] = useState(false);
  useEffect(() => { setInteractive(true); }, []);
  // Compact testimonial cards reliably use the standard HQ still; maxres is often unavailable.
  // Prefer verified local posters; any YouTube fallback is delivered directly from YouTube, never through Vercel image transformations.
  const [poster, setPoster] = useState<"maxres" | "hq" | "direct" | null>(compact ? "hq" : "maxres");
  const [localPosterFailed, setLocalPosterFailed] = useState(false);
  const playerRef = useRef<HTMLIFrameElement>(null);
  const transcriptRef = useRef<HTMLDetailsElement>(null);
  const titleId = useId();
  const duration = videoDuration(video.durationSeconds);
  const watchUrl = siteVideoWatchUrl(video);
  const isHeygen = Boolean(video.heygenId);
  const approvedPoster = video.heygenId ? approvedAndyPosters[video.heygenId] : undefined;
  const isApprovedAndyIntro = Boolean(approvedPoster);
  const watchLabel = isHeygen ? text.watchHeygen : text.watch;
  const aiDisclosure = isApprovedAndyIntro ? text.andyAiDisclosure : text.aiDisclosure;
  const audioNotice = locale === "es" && video.language !== "es" ? (video.language === "ru" ? "Audio en ruso" : "Audio en inglés") : "";
  const mirrorId = video.heygenId ? existingYouTubeMirrors[video.heygenId] : undefined;
  const playbackYouTubeId = mirrorId || video.youtubeId;
  const playerParams = new URLSearchParams({ autoplay: "1", playsinline: "1", rel: "0", hl: locale, cc_lang_pref: video.language });
  // Six previously approved public copies avoid the broken HeyGen embed.
  // Unique method/intro videos without an exact mirror keep their original source.
  const embedUrl = playbackYouTubeId
    ? `https://www.youtube-nocookie.com/embed/${playbackYouTubeId}?${playerParams.toString()}`
    : `https://app.heygen.com/embeds/${video.heygenId}`;

  useEffect(() => { if (playing) playerRef.current?.focus(); }, [playing]);
  // Cross-origin frames can load despite inner media failure. Offer help without
  // claiming we can read the third-party video's internal readyState.
  useEffect(() => {
    if (!playing || !isHeygen || playbackYouTubeId) return;
    const timer = window.setTimeout(() => setShowRecovery(true), 7000);
    return () => window.clearTimeout(timer);
  }, [playing, isHeygen, playbackYouTubeId]);
  function openTranscript() {
    setPlaying(false);
    setShowRecovery(false);
    if (transcriptRef.current) {
      transcriptRef.current.open = true;
      transcriptRef.current.scrollIntoView({ block: "nearest" });
    }
  }
  function showFallbackPoster() { setPoster((current) => current === "maxres" ? "hq" : current === "hq" ? "direct" : null); }

  const externalLink = <a className="site-video-watch-link" href={watchUrl} target="_blank" rel="noopener noreferrer" aria-label={`${watchLabel}: ${video.title} (${text.newTab})`}>{watchLabel}<ExternalLink aria-hidden="true" /></a>;
  const mirrorLink = mirrorId ? <a className="site-video-watch-link" href={`https://www.youtube.com/watch?v=${mirrorId}`}
    target="_blank" rel="noopener noreferrer" aria-label={`${text.watch}: ${video.title} (${text.newTab})`}>
    {text.watch}<ExternalLink aria-hidden="true" />
  </a> : null;

  return (
    <figure className={["site-video-player", compact && "site-video-player--compact", minimal && "site-video-player--minimal", minimal && styles.minimal, className].filter(Boolean).join(" ")} aria-labelledby={titleId} lang={locale}>
      <div className="site-video-frame">
        {playing ? (
          <iframe ref={playerRef} className="site-video-iframe" data-video-playback={playbackYouTubeId ? "youtube" : "heygen"} src={embedUrl} title={video.title} allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowFullScreen loading="lazy" referrerPolicy="strict-origin-when-cross-origin" tabIndex={0} />
        ) : (
          <button className="site-video-play" type="button" disabled={!interactive} aria-busy={!interactive} aria-label={`${text.play}: ${video.title}`} onClick={() => { setShowRecovery(false); setPlaying(true); }}>
            {!isHeygen && fallbackPoster && !localPosterFailed && (
              <Image className="site-video-poster site-video-fallback-poster" src={fallbackPoster} alt="" fill unoptimized={fallbackPoster.endsWith(".webp")} onError={() => setLocalPosterFailed(true)} loading="lazy" sizes={compact ? "(max-width: 767px) 100vw, 33vw" : "(max-width: 767px) 100vw, 960px"} />
            )}
            {approvedPoster && poster ? (
              approvedPoster === "/images/holistic-house/andy-about.png" ? (
                <StaticPortrait className="site-video-poster" src="/images/holistic-house/andy-about.png" alt="" fill priority={posterPriority} loading={posterPriority ? undefined : "lazy"} sizes={compact ? "(max-width: 767px) 100vw, 33vw" : "(max-width: 767px) 100vw, 960px"} />
              ) : (
                <Image className="site-video-poster" src={approvedPoster} alt="" fill unoptimized={approvedPoster.endsWith(".webp")} priority={posterPriority} loading={posterPriority ? undefined : "lazy"} sizes={compact ? "(max-width: 767px) 100vw, 33vw" : "(max-width: 767px) 100vw, 960px"} onError={() => setPoster(null)} />
              )
            ) : isHeygen ? (
              <Film aria-hidden="true" className="site-video-generic-poster" strokeWidth={0.8} style={{ position: "absolute", width: "50%", height: "70%", opacity: 0.12 }} />
            ) : poster && (!fallbackPoster || localPosterFailed) ? (
              <Image key={poster} className="site-video-poster" src={`https://i.ytimg.com/vi/${video.youtubeId}/${poster === "maxres" ? "maxresdefault" : "hqdefault"}.jpg`} alt="" fill unoptimized loading="lazy" sizes={compact ? "(max-width: 767px) 100vw, 33vw" : "(max-width: 767px) 100vw, 960px"} onError={showFallbackPoster} onLoad={(event) => { if (event.currentTarget.naturalWidth <= 120) showFallbackPoster(); }} />
            ) : null}
            <span className="site-video-shade" aria-hidden="true" />
                <span className="site-video-poster-title" aria-hidden="true" data-title={video.title} />
            <span className="site-video-play-prompt" aria-hidden="true"><span className="site-video-play-icon"><Play /></span>{!minimal && <span className="site-video-play-label">{text.play}</span>}</span>
            {duration && <span className="site-video-duration" aria-hidden="true">{duration.label}</span>}
          </button>
        )}
      </div>
      {playing && isHeygen && !playbackYouTubeId && showRecovery && (
        <div className={styles.recovery} role="note" data-video-recovery="heygen">
          <span>{text.stalled}</span>
          <button type="button" onClick={() => { setPlaying(false); setShowRecovery(false); }}>{text.retry}</button>
          {video.transcript && <button type="button" onClick={openTranscript}>{text.transcriptShort}</button>}
          <a href={watchUrl} target="_blank" rel="noopener noreferrer">{text.watchHeygen}<ExternalLink aria-hidden="true" /></a>
        </div>
      )}
      {minimal ? (
        <figcaption className="site-video-caption">
          <span className={styles.accessibleTitle} id={titleId} lang={textLanguage}>{video.title}</span>
          <details ref={transcriptRef} className="site-video-transcript">
            <summary>{video.transcript ? text.transcriptShort : text.details}<ChevronDown aria-hidden="true" /></summary>
            <div className="site-video-more">{video.transcript && <p lang={textLanguage}>{video.transcript}</p>}<div className="site-video-actions">{externalLink}</div></div>
          </details>
          {mirrorLink && <div className={styles.quickWatch}>{mirrorLink}</div>}
          {(isHeygen || audioNotice) && <span className="site-video-ai-badge" title={isHeygen ? aiDisclosure : undefined} aria-label={[audioNotice, isHeygen ? aiDisclosure : ""].filter(Boolean).join(". ")}>{audioNotice}{audioNotice && isHeygen ? " · " : ""}{isHeygen ? (isApprovedAndyIntro ? text.avatarShort : text.aiShort) : ""}</span>}
        </figcaption>
      ) : (
        <figcaption className="site-video-caption">
          <div className="site-video-copy" lang={textLanguage}><p className="site-video-title" id={titleId}>{video.title}</p>{video.description && <p className="site-video-description">{video.description}</p>}</div>
          {audioNotice && <p className="site-video-description site-video-audio-language">{audioNotice}</p>}
          {isHeygen && <p className="site-video-description site-video-ai-disclosure">{aiDisclosure}</p>}
          <div className="site-video-actions">{externalLink}{mirrorLink}{duration && <time className="site-video-duration-text" dateTime={`PT${duration.total}S`} aria-label={`${text.duration}: ${duration.total} ${text.seconds}`}>{duration.label}</time>}</div>
          {video.transcript && <details ref={transcriptRef} className="site-video-transcript"><summary>{text.transcript}<ChevronDown aria-hidden="true" /></summary><p lang={textLanguage}>{video.transcript}</p></details>}
        </figcaption>
      )}
    </figure>
  );
}
