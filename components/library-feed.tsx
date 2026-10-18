"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ArrowUpRight, BookOpen, Film, Play, Search, X } from "lucide-react";
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
    latest: "Latest publications", videos: "Videos", guides: "Books and guides",
    all: "All", video: "Video", article: "Article", guide: "Guide",
    filterVideos: "Videos", filterArticles: "Articles", filterGuides: "Guides",
    search: "Search materials", searchPlaceholder: "Search materials…",
    watch: "Watch", close: "Close video", original: "Watch on YouTube",
    read: "Read", open: "Open", more: "Show more",
    empty: "No materials match your search.",
  },
  ru: {
    latest: "Новые публикации", videos: "Видео", guides: "Книги и методички",
    all: "Все", video: "Видео", article: "Статья", guide: "Методичка",
    filterVideos: "Видео", filterArticles: "Статьи", filterGuides: "Методички",
    search: "Поиск по материалам", searchPlaceholder: "Поиск материалов…",
    watch: "Смотреть", close: "Закрыть видео", original: "Открыть на YouTube",
    read: "Читать", open: "Открыть", more: "Показать ещё",
    empty: "По вашему запросу материалов нет.",
  },
  es: {
    latest: "Nuevas publicaciones", videos: "Vídeos", guides: "Libros y guías",
    all: "Todo", video: "Vídeo", article: "Artículo", guide: "Guía",
    filterVideos: "Vídeos", filterArticles: "Artículos", filterGuides: "Guías",
    search: "Buscar materiales", searchPlaceholder: "Buscar materiales…",
    watch: "Ver", close: "Cerrar vídeo", original: "Ver en YouTube",
    read: "Leer", open: "Abrir", more: "Mostrar más",
    empty: "No se encontraron materiales.",
  },
} as const;

function dateLabel(date: string | undefined, locale: PublicLocale) {
  if (!date) return "";
  const parsed = new Date(date);
  return Number.isNaN(parsed.getTime()) ? "" :
    new Intl.DateTimeFormat(locale, { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(parsed);
}

export function LibraryFeed({ locale, items, videosOnly = false, guidesOnly = false }: {
  locale: PublicLocale;
  items: LibraryFeedItem[];
  videosOnly?: boolean;
  guidesOnly?: boolean;
}) {
  const copy = words[locale];
  const [kind, setKind] = useState<"all" | LibraryFeedItem["kind"]>("all");
  const [query, setQuery] = useState("");
  const [limit, setLimit] = useState(8);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const filtered = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase(locale);
    return items.filter(item => (
      videosOnly ? item.kind === "video" :
      guidesOnly ? item.kind === "guide" :
      kind === "all" || item.kind === kind
    ) && (!needle || [item.title, item.description, item.author || ""].join(" ")
      .toLocaleLowerCase(locale).includes(needle)));
  }, [items, kind, query, locale, videosOnly, guidesOnly]);
  const visible = filtered.slice(0, limit);
  const filters = [
    { id: "all", label: copy.all },
    { id: "video", label: copy.filterVideos },
    { id: "article", label: copy.filterArticles },
    { id: "guide", label: copy.filterGuides },
  ] as const;

  return <section className={styles.feed} aria-label={videosOnly ? copy.videos : guidesOnly ? copy.guides : copy.latest}>
    <div className={styles.toolbar}>
      {!videosOnly && !guidesOnly && <div className={styles.filters} role="group" aria-label={copy.latest}>
        {filters.map(filter => <button type="button" key={filter.id}
          aria-pressed={kind === filter.id}
          onClick={() => { setKind(filter.id); setLimit(8); setPlayingId(null); }}>
          {filter.label}
        </button>)}
      </div>}
      <label className={styles.search}>
        <Search size={16} aria-hidden="true" />
        <span className={styles.visuallyHidden}>{copy.search}</span>
        <input type="search" value={query} maxLength={100} placeholder={copy.searchPlaceholder}
          onChange={event => { setQuery(event.target.value); setLimit(8); setPlayingId(null); }} />
      </label>
    </div>

    <div className={styles.list}>
      {visible.map(item => {
        const canPlay = item.kind === "video" && Boolean(item.youtubeId);
        const playing = canPlay && playingId === item.id;
        const poster = item.image || (item.youtubeId ?
          "https://i.ytimg.com/vi/" + encodeURIComponent(item.youtubeId) + "/hqdefault.jpg" : "");
        const date = dateLabel(item.publishedAt, locale);
        const action = item.kind === "article" ? copy.read : item.kind === "guide" ? copy.open : copy.watch;
        return <article key={item.id} className={[styles.card, playing && styles.playing].filter(Boolean).join(" ")}>
          <div className={styles.visual}>
            {playing ? (
              <iframe className={styles.iframe} title={item.title} loading="lazy"
                src={"https://www.youtube-nocookie.com/embed/" + item.youtubeId + "?rel=0&playsinline=1"}
                allow="encrypted-media; picture-in-picture; fullscreen"
                allowFullScreen referrerPolicy="strict-origin-when-cross-origin" />
            ) : canPlay ? (
              <button type="button" className={styles.playButton} onClick={() => setPlayingId(item.id)}
                aria-label={copy.watch + ": " + item.title}>
                {poster ? <Image src={poster} alt="" fill unoptimized loading="lazy"
                  sizes="(max-width: 640px) 120px, (max-width: 920px) 155px, 148px"
                  className={styles.image} /> : <Film aria-hidden="true" />}
                <span className={styles.playIcon}><Play size={17} fill="currentColor" aria-hidden="true" /></span>
              </button>
            ) : item.href ? (
              <Link className={styles.pictureLink} href={item.href} aria-label={item.title}>
                {poster ? <Image src={poster} alt="" fill unoptimized loading="lazy"
                  sizes="(max-width: 640px) 120px, (max-width: 920px) 155px, 148px"
                  className={styles.image} /> : <BookOpen size={29} aria-hidden="true" />}
              </Link>
            ) : (
              <span className={styles.pictureLink}><BookOpen size={29} aria-hidden="true" /></span>
            )}
          </div>
          <div className={styles.details}>
            <p className={styles.meta}>
              <span className={styles.kind}>{copy[item.kind]}</span>
              {date && <span>{date}</span>}
              {item.author && <span className={styles.author}>{item.author}</span>}
            </p>
            <h2>{canPlay ? (
              <button type="button" className={styles.titleButton} onClick={() => setPlayingId(playing ? null : item.id)}>
                {item.title}
              </button>
            ) : item.href ? <Link href={item.href}>{item.title}</Link> : item.title}</h2>
            {item.description && <p className={styles.description}>{item.description}</p>}
            <div className={styles.actions}>
              {canPlay ? (
                <>
                  <button type="button" className={styles.primaryAction} onClick={() => setPlayingId(playing ? null : item.id)}>
                    {playing ? copy.close : copy.watch}
                    {playing ? <X size={14} aria-hidden="true" /> : <Play size={14} aria-hidden="true" />}
                  </button>
                  {item.href && <Link className={styles.secondaryAction} href={item.href}
                    aria-label={copy.original + ": " + item.title} title={copy.original}
                    target="_blank" rel="noopener noreferrer"><ArrowUpRight size={16} aria-hidden="true" />
                    <span className={styles.visuallyHidden}>{copy.original}</span>
                  </Link>}
                </>
              ) : item.href ? (
                <Link className={styles.primaryAction} href={item.href}>
                  {action}<ArrowRight size={15} aria-hidden="true" />
                </Link>
              ) : null}
            </div>
          </div>
        </article>;
      })}
      {!visible.length && <p className={styles.empty} role="status">{copy.empty}</p>}
    </div>
    {filtered.length > limit && <button type="button" className={styles.more}
      onClick={() => setLimit(current => current + 8)}>
      {copy.more}<ArrowRight size={15} aria-hidden="true" />
    </button>}
  </section>;
}
