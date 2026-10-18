"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ArrowUpRight, BookOpen, Film, Play, Search } from "lucide-react";
import { useMemo, useState } from "react";
import type { PublicLocale } from "@/lib/public-locales";
import styles from "./library-feed.module.css";

export type LibraryFeedItem = {
  id: string;
  kind: "video" | "article" | "guide";
  title: string;
  description: string;
  image?: string;
  href?: string;
  youtubeId?: string;
  publishedAt?: string;
  author?: string;
};

const words = {
  en: {
    latest: "Latest publications", videos: "Educational videos",
    all: "All", video: "Videos", article: "Articles", guide: "Guides",
    search: "Search materials", searchPlaceholder: "Search a topic…",
    watch: "Watch video", original: "Watch on YouTube", read: "Read article",
    open: "Explore guide", more: "Show more", empty: "No materials match your search.",
    channel: "Holistic House", feed: "New videos, articles and useful reading in one place.",
    videoIntro: "Browse videos, presentations and short lessons.",
  },
  ru: {
    latest: "Новые публикации", videos: "Обучающие видео",
    all: "Все", video: "Видео", article: "Статьи", guide: "Методички",
    search: "Поиск по материалам", searchPlaceholder: "Найти по теме…",
    watch: "Смотреть видео", original: "Открыть на YouTube", read: "Читать статью",
    open: "Открыть методичку", more: "Показать ещё", empty: "По вашему запросу материалов нет.",
    channel: "Holistic House", feed: "Новые видео, статьи и полезные материалы в одной ленте.",
    videoIntro: "Видео, короткие уроки и знакомство с практиками.",
  },
  es: {
    latest: "Nuevas publicaciones", videos: "Vídeos educativos",
    all: "Todo", video: "Vídeos", article: "Artículos", guide: "Guías",
    search: "Buscar materiales", searchPlaceholder: "Buscar por tema…",
    watch: "Ver vídeo", original: "Ver en YouTube", read: "Leer artículo",
    open: "Abrir guía", more: "Mostrar más", empty: "No se encontraron materiales.",
    channel: "Holistic House", feed: "Vídeos, artículos y lecturas útiles en una sola colección.",
    videoIntro: "Vídeos breves, clases y presentaciones.",
  },
} as const;

function dateLabel(date: string | undefined, locale: PublicLocale) {
  if (!date) return "";
  const parsed = new Date(date);
  return Number.isNaN(parsed.getTime()) ? "" :
    new Intl.DateTimeFormat(locale, { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(parsed);
}

export function LibraryFeed({ locale, items, videosOnly = false }: {
  locale: PublicLocale;
  items: LibraryFeedItem[];
  videosOnly?: boolean;
}) {
  const copy = words[locale];
  const [kind, setKind] = useState<"all" | LibraryFeedItem["kind"]>("all");
  const [query, setQuery] = useState("");
  const [limit, setLimit] = useState(8);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const filtered = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase(locale);
    return items.filter(item =>
      (videosOnly ? item.kind === "video" : (kind === "all" || item.kind === kind)) &&
      (!needle || [item.title, item.description, item.author || ""].join(" ").toLocaleLowerCase(locale).includes(needle))
    );
  }, [items, kind, query, locale, videosOnly]);
  const visible = filtered.slice(0, limit);
  const filters = ["all", "video", "article", "guide"] as const;

  return <section className={styles.feed} aria-label={videosOnly ? copy.videos : copy.latest}>
    <div className={styles.bar}>
      <div>
        <p className={styles.eyebrow}>{videosOnly ? copy.videos : copy.latest}</p>
        <p className={styles.intro}>{videosOnly ? copy.videoIntro : copy.feed}</p>
      </div>
      <label className={styles.search}>
        <Search aria-hidden="true" size={18} />
        <span className={styles.visuallyHidden}>{copy.search}</span>
        <input type="search" value={query} maxLength={100}
          onChange={event => { setQuery(event.target.value); setLimit(8); }}
          placeholder={copy.searchPlaceholder} />
      </label>
    </div>

    {!videosOnly && <div className={styles.filters} role="group" aria-label={copy.latest}>
      {filters.map(next => <button key={next} type="button" aria-pressed={kind === next}
        onClick={() => { setKind(next); setLimit(8); setPlayingId(null); }}>
        {copy[next]}
      </button>)}
    </div>}

    <div className={styles.list}>
      {visible.map((item, index) => {
        const isVideo = item.kind === "video";
        const canPlay = isVideo && Boolean(item.youtubeId);
        const playing = canPlay && playingId === item.id;
        const poster = item.image || (item.youtubeId ?
          "https://i.ytimg.com/vi/" + encodeURIComponent(item.youtubeId) + "/hqdefault.jpg" : "");
        const date = dateLabel(item.publishedAt, locale);
        const cardClass = [styles.card, index === 0 && !videosOnly && !query && kind === "all" && styles.featured].filter(Boolean).join(" ");
        const actionText = isVideo ? copy.watch : item.kind === "article" ? copy.read : copy.open;
        return <article key={item.id} className={cardClass}>
          <div className={styles.visual}>
            {playing ? <iframe className={styles.iframe}
              title={item.title}
              loading="lazy"
              src={"https://www.youtube-nocookie.com/embed/" + item.youtubeId + "?autoplay=1&rel=0&playsinline=1"}
              allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
              allowFullScreen referrerPolicy="strict-origin-when-cross-origin" /> :
            canPlay ? <button className={styles.playButton} type="button"
              aria-label={copy.watch + ": " + item.title} onClick={() => setPlayingId(item.id)}>
              {poster ? <Image src={poster} alt="" fill sizes="(max-width: 700px) 160px, 360px"
                unoptimized loading="lazy" className={styles.image} /> : <Film aria-hidden="true" />}
              <span className={styles.playIcon}><Play size={21} fill="currentColor" aria-hidden="true" /></span>
            </button> :
            item.href ? <Link href={item.href} className={styles.pictureLink} aria-label={item.title}>
              {poster ? <Image src={poster} alt="" fill sizes="(max-width: 700px) 160px, 360px"
                unoptimized loading="lazy" className={styles.image} /> : <BookOpen aria-hidden="true" />}
            </Link> : <span className={styles.pictureLink}><BookOpen aria-hidden="true" /></span>}
          </div>
          <div className={styles.details}>
            <p className={styles.meta}>
              <span className={styles.kind}>{copy[item.kind]}</span>
              {date && <span>{date}</span>}
              <span className={styles.author}>{item.author || copy.channel}</span>
            </p>
            <h2>{canPlay ? <button type="button" className={styles.titleButton}
              onClick={() => setPlayingId(item.id)}>{item.title}</button> :
              item.href ? <Link href={item.href}>{item.title}</Link> : item.title}</h2>
            <p className={styles.description}>{item.description}</p>
            <div className={styles.actions}>
              {canPlay && <button type="button" onClick={() => setPlayingId(item.id)}>
                {copy.watch}<Play size={15} aria-hidden="true" /></button>}
              {item.href && <Link href={item.href}>{canPlay ? copy.original : actionText}
                {canPlay ? <ArrowUpRight size={16} aria-hidden="true" /> : <ArrowRight size={16} aria-hidden="true" />}
              </Link>}
            </div>
          </div>
        </article>;
      })}
      {!visible.length && <p className={styles.empty} role="status">{copy.empty}</p>}
    </div>
    {filtered.length > limit && <button type="button" className={styles.more}
      onClick={() => setLimit(current => current + 8)}>{copy.more}<ArrowRight size={16} aria-hidden="true" /></button>}
  </section>;
}
