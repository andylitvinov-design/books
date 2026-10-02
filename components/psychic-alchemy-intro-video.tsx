"use client";

import Image from "next/image";
import { useState } from "react";
import { existingAboutIntroVideo } from "@/lib/site-videos/defaults";
import type { PublishedSiteVideo } from "@/lib/site-videos/model";
import styles from "./psychic-alchemy-intro-video.module.css";

// This existing, archived video was tested in an unauthenticated browser.
// Use the stable embed page, NEVER the expiring signed MP4 download URL.
const VIDEO_ID = existingAboutIntroVideo.heygenId;
const EMBED_URL = `https://app.heygen.com/embeds/${VIDEO_ID}`;
const WATCH_URL = `https://app.heygen.com/share/${VIDEO_ID}`;

export function PsychicAlchemyIntroVideo({ video = existingAboutIntroVideo }: { video?: PublishedSiteVideo }) {
  const [active, setActive] = useState(false);
  const transcript = video.transcript?.split(/\n\n+/).filter(Boolean) ?? [];
  const duration = video.durationSeconds ? `${Math.floor(video.durationSeconds / 60)}:${String(video.durationSeconds % 60).padStart(2, "0")}` : "";

  return (
    <section className={styles.section} id="psychic-alchemy-video" data-video-slot="about-intro" data-video-locale="en" aria-labelledby="psychic-alchemy-video-title">
      <div className={styles.copy}>
        <p className={styles.kicker}>A personal welcome</p>
        <h2 id="psychic-alchemy-video-title">{video.title === existingAboutIntroVideo.title ? <>Psychic Alchemy<br />with Andy</> : video.title}</h2>
        {video.description && <p>{video.description}</p>}
        <nav className={styles.actions} aria-label="Explore personal sessions">
          <a href="#testimonials-title">Read testimonials <span aria-hidden="true">↗</span></a>
          <a href="#personal-consultation-title">Leave a request <span aria-hidden="true">↓</span></a>
        </nav>
      </div>
      <div className={styles.media}>
        <div className={styles.frame}>
          {active ? (
            <iframe
              src={EMBED_URL}
              title={video.title}
              allow="fullscreen; encrypted-media; picture-in-picture"
              allowFullScreen
              loading="lazy"
              referrerPolicy="strict-origin-when-cross-origin"
            />
          ) : (
            <button type="button" className={styles.poster} onClick={() => setActive(true)} aria-label={`Open video: ${video.title}`}>
              <Image src="/images/holistic-house/andy-about.png" alt="Andy Li" fill sizes="(max-width: 767px) 100vw, 650px" className={styles.image} />
              <span className={styles.shade} aria-hidden="true" />
              <span className={styles.play} aria-hidden="true">▶</span>
              <span className={styles.label}>Watch introduction <span>{duration ? `${duration} · ` : ""}English</span></span>
            </button>
          )}
        </div>
        <div className={styles.note}>
          <span>AI-assisted video using Andy’s digital twin and voice.</span>
          <a href={WATCH_URL} target="_blank" rel="noopener noreferrer">Open video <span aria-hidden="true">↗</span></a>
        </div>
      </div>
      {transcript.length > 0 && <details className={styles.transcript}>
        <summary>Read the video transcript</summary>
        {transcript.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
      </details>}
    </section>
  );
}
