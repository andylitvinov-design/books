"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { SiteVideoPlayer } from "@/components/site-video-player";
import styles from "./about-testimonial-gallery.module.css";

export type AboutTestimonialVideo = {
  id: string;
  title: string;
  language: "en" | "ru";
  fallbackPoster?: string;
};

const labels = {
  en: {
    primary: "Original audio in English",
    summary: "View testimonials in other languages",
    secondary: "Original audio in Russian",
    fallback: "Open Russian testimonials",
    count: "videos",
  },
  ru: {
    primary: "Оригинальный звук на русском",
    summary: "Посмотреть отзывы на других языках",
    secondary: "Оригинальный звук на английском",
    fallback: "Открыть отзывы на английском",
    count: "видео",
  },
  es: {
    primary: "Audio original en inglés",
    summary: "Ver testimonios en otros idiomas",
    secondary: "Audio original en ruso",
    fallback: "Abrir los testimonios en ruso",
    count: "vídeos",
  },
} as const;

/**
 * The first six original-language reviews are available in SSR HTML.
 * Six other-language players mount only after disclosure so the English About
 * page neither starts with Russian videos nor loads hidden YouTube posters.
 * The fallback stays an internal Holistic House link if JS is unavailable.
 */
export function AboutTestimonialGallery({
  locale, primaryVideos, otherLanguageVideos,
}: {
  locale: "en" | "ru" | "es";
  primaryVideos: ReadonlyArray<AboutTestimonialVideo>;
  otherLanguageVideos: ReadonlyArray<AboutTestimonialVideo>;
}) {
  const [expanded, setExpanded] = useState(false);
  const current = labels[locale];
  const alternativeLocale = locale === "ru" ? "en" : "ru";

  const cards = (videos: ReadonlyArray<AboutTestimonialVideo>) => videos.map((video) => (
    <div key={video.id} data-about-testimonial-audio={video.language}>
      <SiteVideoPlayer
        video={{ youtubeId: video.id, title: video.title, language: video.language }}
        locale={locale}
        textLanguage={locale === "es" && video.language === "en" ? "es" : video.language}
        compact
        fallbackPoster={video.fallbackPoster}
      />
    </div>
  ));

  return (
    <>
      <p className={styles.languageLabel}>{current.primary} · {primaryVideos.length} {current.count}</p>
      <div className="about-video-grid" data-about-primary-testimonials={locale === "ru" ? "ru" : "en"}>
        {cards(primaryVideos)}
      </div>
      <details
        className={styles.disclosure}
        data-about-other-language-testimonials="true"
        onToggle={(event) => setExpanded(event.currentTarget.open)}
      >
        <summary className={styles.toggle}>
          <span>{current.summary}</span>
          <span className={styles.count}>{otherLanguageVideos.length} {current.count}</span>
          <ChevronDown className={styles.chevron} size={20} aria-hidden="true" />
        </summary>
        {expanded ? (
          <div className={styles.content}>
            <p className={styles.languageLabel}>{current.secondary}</p>
            <div className="about-video-grid" data-about-secondary-testimonials={alternativeLocale}>
              {cards(otherLanguageVideos)}
            </div>
          </div>
        ) : (
          <p className={styles.fallback}>
            <Link prefetch={false} href={`/${alternativeLocale}/about#testimonials-title`}>
              {current.fallback} →
            </Link>
          </p>
        )}
      </details>
    </>
  );
}
