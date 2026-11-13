"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ArrowUpRight, BookOpen, Bookmark, BookmarkCheck, Film, Play, Search, ThumbsDown, X } from "lucide-react";
import { Fragment, useMemo, useState } from "react";

import type { PublicLocale } from "@/lib/public-locales";
import { myTubeCourseInfo } from "@/lib/video-discovery/mytube-shelves.mjs";
import type { MyTubeVideoTags } from "@/lib/mandala/mytube-video-tagging.mjs";
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
  seriesId?: string;
  seriesTitle?: string;
  seriesHref?: string;
  seriesOrder?: number;
  mytubeLessonOrder?: number;
  topicTags?: string[];
  audioLanguage?: "ru" | "en" | "es";
  curation?: "verified" | "published";
  sourceGroup?: string;
  sourceLabel?: string;
  durationVerifiedSeconds?: number;
  mytubeFormat?: "shorts" | "study";
  sourceApproved?: boolean;
  source_kind?: string;
  editorial_status?: string;
  embed_status?: string;
  rights_status?: string;
  content_checked_at?: string;
  lifeAreas?: string[];
  contentType?: string | null;
  directions?: string[];
  traditions?: string[];
  provenance?: string[];
} & Partial<MyTubeVideoTags>;

const words = {
  en: {
    latest: "Latest publications", videos: "Videos", guides: "Books and guides",
    all: "All", video: "Video", article: "Article", guide: "Guide",
    filterVideos: "Videos", filterArticles: "Articles", filterGuides: "Guides",
    search: "Search materials", searchPlaceholder: "Search materials…",
    watch: "Watch", close: "Close video", original: "Watch on YouTube",
    read: "Read", open: "Open", more: "Show more",
    empty: "No materials match your search.",
    seriesTitle: "Video blogs by channel", allSeries: "All videos", seriesDetails: "Open complete series", episode: "Episode", mytubeShort: "Brief", mytubeStudy: "Lesson", mytubePractice: "Practice", mytubeCourse: "Course", mytubeMaster: "Master",
  },
  ru: {
    latest: "Новые публикации", videos: "Видео", guides: "Книги и методички",
    all: "Все", video: "Видео", article: "Статья", guide: "Методичка",
    filterVideos: "Видео", filterArticles: "Статьи", filterGuides: "Методички",
    search: "Поиск по материалам", searchPlaceholder: "Поиск материалов…",
    watch: "Смотреть", close: "Закрыть видео", original: "Открыть на YouTube",
    read: "Читать", open: "Открыть", more: "Показать ещё",
    empty: "По вашему запросу материалов нет.",
    seriesTitle: "Видеоблоги по каналам", allSeries: "Все видео", seriesDetails: "Открыть весь цикл", episode: "Выпуск", mytubeShort: "Краткое", mytubeStudy: "Обучение", mytubePractice: "Практика", mytubeCourse: "Курс", mytubeMaster: "Мастер",
  },
  es: {
    latest: "Nuevas publicaciones", videos: "Vídeos", guides: "Libros y guías",
    all: "Todo", video: "Vídeo", article: "Artículo", guide: "Guía",
    filterVideos: "Vídeos", filterArticles: "Artículos", filterGuides: "Guías",
    search: "Buscar materiales", searchPlaceholder: "Buscar materiales…",
    watch: "Ver", close: "Cerrar vídeo", original: "Ver en YouTube",
    read: "Leer", open: "Abrir", more: "Mostrar más",
    empty: "No se encontraron materiales.",
    seriesTitle: "Videoblogs por canal", allSeries: "Todos los vídeos", seriesDetails: "Abrir serie completa", episode: "Episodio", mytubeShort: "Breve", mytubeStudy: "Clase", mytubePractice: "Práctica", mytubeCourse: "Curso", mytubeMaster: "Maestro",
  },
} as const;

function dateLabel(date: string | undefined, locale: PublicLocale) {
  if (!date) return "";
  const parsed = new Date(date);
  return Number.isNaN(parsed.getTime()) ? "" :
    new Intl.DateTimeFormat(locale, { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(parsed);
}

export function LibraryFeed({ locale, items, videosOnly = false, guidesOnly = false, timeline = false,
  preserveOrder = false, savedVideoIds = [], onToggleSaved, onDismissVideo,
  videoLayout = "default", mytubeFocus, mytubeShelf,
  saveText = "Save", unsaveText = "Unsave", dismissText = "Not for me",
}: {
  locale: PublicLocale;
  items: LibraryFeedItem[];
  videosOnly?: boolean;
  guidesOnly?: boolean;
  timeline?: boolean;
  preserveOrder?: boolean;
  videoLayout?: "default" | "mytube";
  mytubeShelf?: "practices" | "courses" | "masters";
  mytubeFocus?: {categoryId?:string;subcategoryId?:string;topicId?:string;scenarioId?:string};
  savedVideoIds?: string[];
  onToggleSaved?: (id: string) => void;
  onDismissVideo?: (id: string) => void;
  saveText?: string;
  unsaveText?: string;
  dismissText?: string;
}) {
  const copy = words[locale];
  const [kind, setKind] = useState<"all" | LibraryFeedItem["kind"]>("all");
  const [query, setQuery] = useState("");
  const [limit, setLimit] = useState(8);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [selectedSeries, setSelectedSeries] = useState("all");
  const seriesChoices = useMemo(() => {
    if (!videosOnly) return [];
    const seen = new Set<string>();
    return items.flatMap(item => {
      if (!item.seriesId || seen.has(item.seriesId)) return [];
      seen.add(item.seriesId);
      return [{ id: item.seriesId, title: item.seriesTitle || item.seriesId }];
    });
  }, [items, videosOnly]);
  const filtered = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase(locale);
    const matches = items.filter(item => (
      videosOnly ? item.kind === "video" :
      guidesOnly ? item.kind === "guide" :
      kind === "all" || item.kind === kind
    ) && (!videosOnly || selectedSeries === "all" || item.seriesId === selectedSeries)
      && (!needle || [item.title, item.description, item.author || "", item.seriesTitle || ""].join(" ")
        .toLocaleLowerCase(locale).includes(needle)));
    if (!videosOnly || preserveOrder) return matches;
    // Never let newest-first blog posts scatter numbered archival episodes.
    const position = new Map(seriesChoices.map((series, index) => [series.id, index]));
    return matches.sort((a, b) => {
      const rankA = a.seriesId ? position.get(a.seriesId) ?? Number.MAX_SAFE_INTEGER : Number.MAX_SAFE_INTEGER;
      const rankB = b.seriesId ? position.get(b.seriesId) ?? Number.MAX_SAFE_INTEGER : Number.MAX_SAFE_INTEGER;
      return rankA - rankB || (a.seriesId && b.seriesId
        ? (a.seriesOrder ?? Number.MAX_SAFE_INTEGER) - (b.seriesOrder ?? Number.MAX_SAFE_INTEGER)
        : 0);
    });
  }, [items, kind, query, locale, videosOnly, guidesOnly, selectedSeries, seriesChoices, preserveOrder]);
  // A selected MyTube course is a complete ordered playlist, not a preview of
  // the first eight lessons. Keep normal pagination for other Library feeds.
  const visibleLimit = (mytubeShelf === "courses" || mytubeShelf === "practices") ? filtered.length :
    videosOnly && !preserveOrder && selectedSeries === "all"
      ? Math.max(limit, filtered.filter(item => Boolean(item.seriesId)).length) : limit;
  const visible = filtered.slice(0, visibleLimit);
  const filters = [
    { id: "all", label: copy.all },
    { id: "video", label: copy.filterVideos },
    { id: "article", label: copy.filterArticles },
    { id: "guide", label: copy.filterGuides },
  ] as const;

  return <section className={[styles.feed, timeline && styles.timeline, videoLayout === "mytube" && styles.mytubeFeed].filter(Boolean).join(" ")}
    data-video-layout={videoLayout} aria-label={videosOnly ? copy.videos : guidesOnly ? copy.guides : copy.latest}>
    {videoLayout !== "mytube" && <div className={styles.toolbar}>
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
    </div>}

    {videoLayout !== "mytube" && videosOnly && seriesChoices.length > 0 ? (
      <div className={styles.seriesFilters} role="group" aria-label={copy.seriesTitle}>
        <strong>{copy.seriesTitle}</strong>
        <button type="button" aria-pressed={selectedSeries === "all"} onClick={() => {
          setSelectedSeries("all"); setLimit(8); setPlayingId(null);
        }}>{copy.allSeries}</button>
        {seriesChoices.map(series => (
          <button type="button" key={series.id} aria-pressed={selectedSeries === series.id}
            data-library-series-filter={series.id} onClick={() => {
              setSelectedSeries(series.id); setLimit(8); setPlayingId(null);
            }}>{series.title}</button>
        ))}
      </div>
    ) : null}

    <div className={styles.list}>
      {visible.map((item, index) => {
        const canPlay = item.kind === "video" && Boolean(item.youtubeId);
        const playing = canPlay && playingId === item.id;
        const poster = item.image || (item.youtubeId ?
          "https://i.ytimg.com/vi/" + encodeURIComponent(item.youtubeId) + "/hqdefault.jpg" : "");
        const date = dateLabel(item.publishedAt, locale);
        const action = item.kind === "article" ? copy.read : item.kind === "guide" ? copy.open : copy.watch;
        const matchingTopic=(item.mytubeRankings||[]).find(match=>
          (!mytubeFocus?.categoryId||mytubeFocus.categoryId==="all"||match.categoryId===mytubeFocus.categoryId)&&
          (!mytubeFocus?.subcategoryId||mytubeFocus.subcategoryId==="all"||match.subcategoryId===mytubeFocus.subcategoryId)&&
          (!mytubeFocus?.topicId||mytubeFocus.topicId==="all"||match.topicId===mytubeFocus.topicId));
        const matchingScenario=matchingTopic?.scenarios.find(s=>
          s.scenarioId===mytubeFocus?.scenarioId);
        const matchingScore=matchingScenario?.score??matchingTopic?.score;
        const courseInfo=mytubeShelf==="courses"?myTubeCourseInfo(item):null;
        const previousCourseInfo=mytubeShelf==="courses"&&index>0
          ?myTubeCourseInfo(visible[index-1]):null;
        return <Fragment key={item.id}>
          {courseInfo && courseInfo.id!==previousCourseInfo?.id ? (
            <div className={styles.seriesHeading} data-mytube-course-heading={courseInfo.id}>
              <div><span>{copy.mytubeCourse}</span><h3>{courseInfo.label}</h3></div>
            </div>
          ) : null}
          {!courseInfo && item.seriesId && (index === 0 || visible[index - 1]?.seriesId !== item.seriesId) ? (
            <div className={styles.seriesHeading} data-library-video-series={item.seriesId}>
              <div><span>{copy.seriesTitle}</span><h3>{item.seriesTitle}</h3></div>
              {item.seriesHref ? <Link href={item.seriesHref}>{copy.seriesDetails}<ArrowUpRight size={14} aria-hidden="true" /></Link> : null}
            </div>
          ) : null}
          <article className={[styles.card, playing && styles.playing].filter(Boolean).join(" ")}>
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
                  sizes={videoLayout === "mytube" ? "(max-width: 640px) 100vw, (max-width: 1100px) 50vw, 33vw" : "(max-width: 640px) 120px, (max-width: 920px) 155px, 148px"}
                  className={styles.image} /> : <Film aria-hidden="true" />}
                <span className={styles.playIcon}><Play size={17} fill="currentColor" aria-hidden="true" /></span>
              </button>
            ) : item.href ? (
              <Link className={styles.pictureLink} href={item.href} aria-label={item.title}>
                {poster ? <Image src={poster} alt="" fill unoptimized loading="lazy"
                  sizes={videoLayout === "mytube" ? "(max-width: 640px) 100vw, (max-width: 1100px) 50vw, 33vw" : "(max-width: 640px) 120px, (max-width: 920px) 155px, 148px"}
                  className={styles.image} /> : <BookOpen size={29} aria-hidden="true" />}
              </Link>
            ) : (
              <span className={styles.pictureLink}><BookOpen size={29} aria-hidden="true" /></span>
            )}
          </div>
          <div className={styles.details}>
            {videoLayout !== "mytube" && (
            <p className={styles.meta}>
              <span className={styles.kind}>{copy[item.kind]}</span>
              {item.seriesOrder != null && <span>{copy.episode} {item.seriesOrder}</span>}
              {date && <span>{date}</span>}
              {item.author && <span className={styles.author}>{item.author}</span>}
              {item.sourceLabel && <span className={styles.author}>{item.sourceLabel}</span>}
            </p>
            )}
            <h2>{canPlay ? (
              <button type="button" className={styles.titleButton} onClick={() => setPlayingId(playing ? null : item.id)}>
                {item.title}
              </button>
            ) : item.href ? <Link href={item.href}>{item.title}</Link> : item.title}</h2>
            {videoLayout === "mytube" && (
              <p className={styles.channelIdentity}>
                <span className={styles.channelAvatar} aria-hidden="true">
                  {(item.author || item.sourceLabel || "H").trim().charAt(0).toUpperCase()}
                </span>
                <span>{item.author || item.sourceLabel ||
                  (locale === "ru" ? "Из видеотеки" : locale === "es" ? "De la biblioteca" : "From the library")}</span>
                {item.audioLanguage && <small>{item.audioLanguage.toUpperCase()}</small>}
              </p>
            )}
            {videoLayout === "mytube" && (
            <p className={styles.meta}>
              <span className={styles.kind}>{mytubeShelf ? (mytubeShelf==="practices"?copy.mytubePractice:mytubeShelf==="courses"?copy.mytubeCourse:copy.mytubeMaster) : item.mytubeFormat === "shorts" ? copy.mytubeShort : item.mytubeFormat === "study" ? copy.mytubeStudy : copy[item.kind]}</span>
              {item.seriesOrder != null && <span>{copy.episode} {item.seriesOrder}</span>}
              {date && <span>{date}</span>}
              {item.author && <span className={styles.author}>{item.author}</span>}
              {item.sourceLabel && <span className={styles.author}>{item.sourceLabel}</span>}
            </p>
            )}
            {item.description && <p className={styles.description}>{item.description}</p>}
            {mytubeShelf==="practices"&&item.sourceGroup==="psimaster-original-meditations"&&
              !Number.isInteger(item.durationVerifiedSeconds)&&
              <p className={styles.meta} data-mytube-duration-unverified>
                {locale==="ru"?"Длительность ещё не подтверждена":
                  locale==="es"?"Duración pendiente de verificar":"Duration not yet verified"}
              </p>}
            {videoLayout==="mytube"&&matchingTopic&&<p className={styles.meta}
              data-mytube-ranking={matchingTopic.topicId}
              title={locale==="ru"?"Предварительная редакционная оценка, не проверенная вручную":
                locale==="es"?"Evaluación editorial provisional, sin revisión humana":
                  "Provisional editorial suitability score; not human verified"}>
              <span>{matchingTopic.categoryLabel} · {matchingTopic.subcategoryLabel} · {matchingTopic.topicLabel}</span>
              <strong>{locale==="ru"?"Совпадение":locale==="es"?"Coincidencia":"Match"}: {matchingScore}/100</strong>
            </p>}
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
              {videosOnly && onToggleSaved && <button type="button" className={styles.preferenceAction}
                aria-pressed={savedVideoIds.includes(item.youtubeId || item.id)}
                aria-label={(savedVideoIds.includes(item.youtubeId || item.id) ? unsaveText : saveText) + ": " + item.title}
                title={savedVideoIds.includes(item.youtubeId || item.id) ? unsaveText : saveText}
                onClick={() => onToggleSaved(item.youtubeId || item.id)}>
                {savedVideoIds.includes(item.youtubeId || item.id)
                  ? <BookmarkCheck size={18} aria-hidden="true" /> : <Bookmark size={18} aria-hidden="true" />}
              </button>}
              {videosOnly && onDismissVideo && <button type="button" className={styles.preferenceAction}
                aria-label={dismissText + ": " + item.title} title={dismissText}
                onClick={() => onDismissVideo(item.youtubeId || item.id)}>
                <ThumbsDown size={18} aria-hidden="true" />
              </button>}
            </div>
          </div>
          </article>
        </Fragment>;
      })}
      {!visible.length && <p className={styles.empty} role="status">{copy.empty}</p>}
    </div>
    {filtered.length > visibleLimit && <button type="button" className={styles.more}
      onClick={() => setLimit(current => current + 8)}>
      {copy.more}<ArrowRight size={15} aria-hidden="true" />
    </button>}
  </section>;
}
