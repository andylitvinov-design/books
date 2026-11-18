"use client";

import Image from "next/image";
import {ArrowUpRight, Play} from "lucide-react";
import {useEffect, useMemo, useRef, useState} from "react";
import type {PublicLocale} from "@/lib/public-locales";
import {normalizeMyTubeYouTubeScope, youtubeSearchUrl, type MyTubeExternalVideo, type MyTubeYouTubeShelf} from "@/lib/video-discovery/mytube-youtube.mjs";
import styles from "./mytube-youtube-continuation.module.css";

type Result = {source: "youtube"; mode: "ok" | "fallback";
  videos: MyTubeExternalVideo[]; searchUrl: string | null};
const copy = {
  ru: {heading: "Ещё по вашей теме", source: "Внешние видео YouTube", open: "Открыть на YouTube",
    more: "Показать ещё", loading: "Подбираем видео с YouTube…",
    fallback: "Продолжить поиск на YouTube", description: "Ролики других авторов. Не входят в курсы Holistic House.",
    ready: "Показать видео с YouTube"},
  en: {heading: "More on this topic", source: "External YouTube videos", open: "Open on YouTube",
    more: "Show more", loading: "Finding relevant YouTube videos…",
    fallback: "Continue searching on YouTube", description: "Videos by other creators, not Holistic House course lessons.",
    ready: "Show YouTube videos"},
  es: {heading: "Más sobre este tema", source: "Vídeos externos de YouTube", open: "Abrir en YouTube",
    more: "Mostrar más", loading: "Buscando vídeos relevantes de YouTube…",
    fallback: "Continuar la búsqueda en YouTube", description: "Vídeos de otros autores, no son lecciones de Holistic House.",
    ready: "Mostrar vídeos de YouTube"},
} as const;

const validVideoId = (value: string) => /^[A-Za-z0-9_-]{11}$/.test(value);
function durationText(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 1) return "";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return h ? `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}` : `${m}:${String(s).padStart(2, "0")}`;
}

export function MyTubeYoutubeContinuation({locale, shelf, category, collection, goal, language, excludedIds}: {
  locale: PublicLocale;
  shelf: MyTubeYouTubeShelf;
  category: string;
  collection: string;
  goal: string;
  language: string;
  excludedIds: string[];
}) {
  const t = copy[locale];
  const target = useRef<HTMLDivElement>(null);
  const [requested, setRequested] = useState(false);
  const [status, setStatus] = useState<"idle" | "loading" | "ok" | "fallback">("idle");
  const [result, setResult] = useState<Result | null>(null);
  const [visibleCount, setVisibleCount] = useState(12);
  const url = useMemo(() => {
    const qs = new URLSearchParams({shelf, locale, category, collection, goal, language});
    return `/api/public/mytube-youtube?${qs.toString()}`;
  }, [shelf, locale, category, collection, goal, language]);
  useEffect(() => {
    const node = target.current;
    if (!node || requested || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) setRequested(true);
    }, {rootMargin: "200px"});
    observer.observe(node);
    return () => observer.disconnect();
  }, [requested]);
  useEffect(() => {
    if (!requested) return;
    const controller = new AbortController();
    setResult(null);
    setVisibleCount(12);
    setStatus("loading");
    fetch(url, {signal: controller.signal, credentials: "omit"})
      .then(async response => {
        if (!response.ok) throw Error("EXTERNAL_FEED_UNAVAILABLE");
        return await response.json() as Result;
      })
      .then(value => {
        if (controller.signal.aborted) return;
        setResult(value);
        setStatus(value.mode === "ok" ? "ok" : "fallback");
      })
      .catch(() => {if (!controller.signal.aborted) setStatus("fallback");});
    return () => controller.abort();
  }, [requested, url]);
  const excluded = new Set(excludedIds.filter(validVideoId));
  const external = (result?.videos || []).filter(video => !excluded.has(video.id) && validVideoId(video.id));
  const shown = external.slice(0, visibleCount);
  useEffect(() => {
    const node = target.current;
    if (!node || status !== "ok" || visibleCount >= external.length ||
        typeof IntersectionObserver === "undefined") return;
    let triggered = false;
    const observer = new IntersectionObserver(entries => {
      if (!triggered && entries.some(entry => entry.isIntersecting)) {
        triggered = true;
        setVisibleCount(count => count + 12);
      }
    }, {rootMargin: "200px"});
    observer.observe(node);
    return () => observer.disconnect();
  }, [status, visibleCount, external.length]);

  // A visible, non-blocking link remains usable when Google is unconfigured,
  // quota-limited or unreachable. Never render simulated search results.
  const publicScope = normalizeMyTubeYouTubeScope({shelf, locale, category, collection, goal, language});
  const searchUrl = result?.searchUrl || youtubeSearchUrl(publicScope) || "https://www.youtube.com";

  return <section className={styles.section} aria-label={t.source} data-mytube-youtube-continuation>
    <div className={styles.header}>
      <div><h2>{t.heading}</h2><p>{t.description}</p></div>
      <span className={styles.sourceBadge}>YouTube</span>
    </div>
    {status === "loading" && <p className={styles.state} role="status">{t.loading}</p>}
    {shown.length > 0 && <div className={styles.grid} data-mytube-external-videos>
      {shown.map(video => <article className={styles.card} key={video.id} data-youtube-external-id={video.id}>
        <a className={styles.thumbnail} href={video.href} target="_blank" rel="noopener noreferrer"
          aria-label={`${t.open}: ${video.title}`} referrerPolicy="strict-origin-when-cross-origin">
          <Image src={video.poster} alt="" fill unoptimized loading="lazy"
            sizes="(max-width: 640px) 100vw, (max-width: 1100px) 50vw, 33vw"/>
          <span className={styles.playIcon}><Play size={18} fill="currentColor" aria-hidden="true"/></span>
          <span className={styles.duration}>{durationText(video.durationSeconds)}</span>
        </a>
        <div className={styles.details}>
          <a className={styles.title} href={video.href} target="_blank" rel="noopener noreferrer"
            referrerPolicy="strict-origin-when-cross-origin">{video.title}</a>
          <p>{video.channel} · YouTube</p>
          <a className={styles.open} href={video.href} target="_blank" rel="noopener noreferrer">
            {t.open}<ArrowUpRight size={15} aria-hidden="true"/>
          </a>
        </div>
      </article>)}
    </div>}
    {status === "ok" && external.length > visibleCount &&
      <button type="button" className={styles.more} onClick={() => setVisibleCount(count => count + 12)}>{t.more}</button>}
    {status === "fallback" || (status === "ok" && external.length <= visibleCount) ?
      <a className={styles.fallback} href={searchUrl} target="_blank" rel="noopener noreferrer">
        {t.fallback}<ArrowUpRight size={16} aria-hidden="true"/>
      </a> : null}
    <div ref={target} className={styles.sentinel} data-mytube-youtube-sentinel>
      {status === "idle" && <button type="button" className={styles.more}
        onClick={() => setRequested(true)}>{t.ready}</button>}
    </div>
  </section>;
}
