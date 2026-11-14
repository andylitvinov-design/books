"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Clapperboard, Play } from "lucide-react";
import { publicVideoGoalForMessage, rankDiscoveryVideos } from "@/lib/video-discovery/ranker.mjs";
import type { PublicLocale } from "@/lib/public-locales";
import styles from "./services-assist-mytube.module.css";

type Focus = "stress" | "relationships" | "energy" | "health" | "work" | "growth" | "general";
type PublicVideo = {
  id: string; kind: "video"; youtubeId: string; title: string; description: string;
  image?: string; topicTags?: string[]; lifeAreas?: string[]; directions?: string[];
  audioLanguage?: "ru" | "en" | "es"; curation?: "published" | "verified";
  sourceGroup?: string; durationVerifiedSeconds?: number;
};
type VideosState = { status: "loading" | "ready" | "error"; videos: PublicVideo[] };
const goals: Record<Focus, string> = {
  stress: "stress", relationships: "relationships", energy: "energy", health: "energy",
  work: "work", growth: "meaning", general: "practices",
};
const wording = {
  ru: {
    title: "Видео по вашему запросу", intro: "Подборка из MyTube по выбранной теме",
    watch: "Смотреть", more: "Смотреть больше видео по запросу",
    loading: "Подбираем опубликованные видео MyTube…",
    empty: "По этой теме пока недостаточно опубликованных видео.",
    error: "Сейчас не удалось загрузить видеоподборку.",
    video: "MyTube · Видео", audio: "Язык видео",
  },
  en: {
    title: "Videos for your question", intro: "A MyTube selection related to your topic",
    watch: "Watch", more: "More videos on this topic",
    loading: "Finding published MyTube videos…",
    empty: "There are not enough published videos for this topic yet.",
    error: "The video selection could not be loaded right now.",
    video: "MyTube · Video", audio: "Audio language",
  },
  es: {
    title: "Vídeos para tu consulta", intro: "Una selección de MyTube sobre tu tema",
    watch: "Ver vídeo", more: "Ver más vídeos sobre tu consulta",
    loading: "Buscando vídeos publicados en MyTube…",
    empty: "Todavía no hay suficientes vídeos publicados sobre este tema.",
    error: "No se pudo cargar la selección de vídeos.",
    video: "MyTube · Vídeo", audio: "Idioma del vídeo",
  },
} as const;
function duration(seconds: number | undefined) {
  if (typeof seconds !== "number" || !Number.isFinite(seconds) || seconds <= 0) return null;
  const total = Math.floor(seconds);
  const minutes = Math.floor(total / 60);
  const mmss = minutes + ":" + String(total % 60).padStart(2, "0");
  return minutes >= 60 ? Math.floor(minutes / 60) + ":" +
    String(minutes % 60).padStart(2, "0") + ":" + String(total % 60).padStart(2, "0") : mmss;
}
export function ServicesAssistMyTube({ locale, focus, question }: {
  locale: PublicLocale; focus: Focus; question: string;
}) {
  const [state, setState] = useState<VideosState>({ status: "loading", videos: [] });
  const copy = wording[locale];
  // Only the public interface language is sent. The question stays in this browser.
  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      setState({ status: "loading", videos: [] });
      try {
        const response = await fetch("/api/assist/public-mytube?locale=" + locale, {
          signal: controller.signal,
        });
        if (!response.ok) throw new Error("Public video catalog unavailable");
        const data = await response.json() as { videos?: PublicVideo[] };
        if (!Array.isArray(data.videos)) throw new Error("Invalid public video catalog");
        if (!controller.signal.aborted) setState({ status: "ready", videos: data.videos });
      } catch {
        if (!controller.signal.aborted) setState({ status: "error", videos: [] });
      }
    }
    void load();
    return () => controller.abort();
  }, [locale]);

  const goal = publicVideoGoalForMessage(question) || goals[focus];
  const videos = useMemo(() => (
    rankDiscoveryVideos(state.videos, { goal, sort: "for-you" }) as PublicVideo[]
  ).slice(0, 3), [state.videos, goal]);
  const moreUrl = "/" + locale + "/mytube?goal=" + encodeURIComponent(goal);

  return <section className={styles.shelf} data-assist-mytube aria-labelledby="assist-mytube-title">
    <header className={styles.header}>
      <p><Clapperboard size={17} aria-hidden="true" />MyTube</p>
      <h3 id="assist-mytube-title">{copy.title}</h3>
      <span>{copy.intro}</span>
    </header>
    {state.status === "loading" ? <p className={styles.status} role="status">{copy.loading}</p> : null}
    {state.status === "error" ? <p className={styles.status} role="status">{copy.error}</p> : null}
    {state.status === "ready" && videos.length === 0 ? <p className={styles.status}>{copy.empty}</p> : null}
    {videos.length > 0 && <div className={styles.cards}>
      {videos.map(video => {
        const poster = video.image?.startsWith("/") ? video.image :
          "https://i.ytimg.com/vi/" + video.youtubeId + "/hqdefault.jpg";
        const watchUrl = "/" + locale + "/mytube?video=" + encodeURIComponent(video.youtubeId);
        const runtime = duration(video.durationVerifiedSeconds);
        return <article className={styles.card} key={video.youtubeId}
          data-assist-mytube-card={video.youtubeId}>
          <Link className={styles.poster} href={watchUrl} prefetch={false}
            aria-label={copy.watch + ": " + video.title}>
            <Image src={poster} alt="" fill unoptimized loading="lazy" sizes="(max-width: 350px) 98px, 140px" />
            <span className={styles.play}><Play size={24} fill="currentColor" aria-hidden="true" /></span>
            {runtime ? <span className={styles.duration}>{runtime}</span> : null}
          </Link>
          <div className={styles.body}>
            <span className={styles.eyebrow}>{copy.video}{video.audioLanguage ? " · " + video.audioLanguage.toUpperCase() : ""}</span>
            <h4>{video.title}</h4>
            {video.description ? <p>{video.description}</p> : null}
            <Link className={styles.watch} href={watchUrl} prefetch={false}>
              {copy.watch}<ArrowRight size={18} aria-hidden="true" />
            </Link>
          </div>
        </article>;
      })}
    </div>}
    <Link className={styles.more} href={moreUrl} prefetch={false}
      data-assist-mytube-more>
      <Clapperboard size={20} aria-hidden="true" />{copy.more}<ArrowRight size={19} aria-hidden="true" />
    </Link>
  </section>;
}
