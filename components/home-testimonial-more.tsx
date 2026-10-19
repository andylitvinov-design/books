"use client";

import { useState } from "react";
import { SiteVideoPlayer } from "@/components/site-video-player";
import type { PublicLocale } from "@/lib/public-locales";
import styles from "./personal-testimonials.module.css";

export type ExtraTestimonialVideo = {
  id: string;
  title: string;
  language: "en" | "ru";
  fallbackPoster?: string;
};

type Props = {
  locale: PublicLocale;
  remainingVideos: ReadonlyArray<ExtraTestimonialVideo>;
  otherLanguageVideos: ReadonlyArray<ExtraTestimonialVideo>;
  title: string;
  sameLanguageTitle: string;
  otherLanguageTitle: string;
};

/**
 * Home needs four immediately visible, SSR-rendered video posters.
 * The remaining eight original reviews only create players when the visitor
 * expands the disclosure. This avoids serializing eight closed player trees
 * into the initial Next RSC/HTML payload, without changing video sources.
 */
export function HomeTestimonialMore({
  locale, remainingVideos, otherLanguageVideos, title, sameLanguageTitle, otherLanguageTitle,
}: Props) {
  const [expanded, setExpanded] = useState(false);
  const count = remainingVideos.length + otherLanguageVideos.length;
  const renderCards = (items: ReadonlyArray<ExtraTestimonialVideo>, showLanguage = false) => (
    items.map((item) => (
      <div className={styles.videoItem} key={item.id} data-testimonial-video-id={item.id}>
        {showLanguage ? <p className={styles.videoLanguageTag}>{item.language === "ru" ? "Русский · RU" : "English · EN"}</p> : null}
        <SiteVideoPlayer
          video={{ youtubeId: item.id, language: item.language, title: item.title }}
          locale={locale}
          compact
          fallbackPoster={item.fallbackPoster}
        />
      </div>
    ))
  );

  return (
    <details
      className={styles.moreVideoDisclosure}
      data-home-testimonial-disclosure="true"
      onToggle={(event) => setExpanded(event.currentTarget.open)}
    >
      <summary>
        <span>{title}</span>
        <span className={styles.moreCount}>
          {count} {locale === "ru" ? "видео" : locale === "es" ? "vídeos" : "videos"}
        </span>
      </summary>
      {expanded ? (
        <div className={styles.moreVideoContent}>
          <h4 className={styles.moreSectionTitle}>{sameLanguageTitle}</h4>
          <div className={styles.videoGrid}>{renderCards(remainingVideos)}</div>
          <h4 className={styles.moreSectionTitle}>{otherLanguageTitle}</h4>
          <div className={styles.videoGrid}>{renderCards(otherLanguageVideos, true)}</div>
        </div>
      ) : (
        <div className={styles.moreVideoContent}>
          <a href={"/" + locale + "/about#testimonials-title"}>
            {locale === "ru" ? "Отзывы и видео об Андрее" : locale === "es" ? "Testimonios y vídeos de Andrey" : "More testimonials about Andrey"}
          </a>
        </div>
      )}
    </details>
  );
}
