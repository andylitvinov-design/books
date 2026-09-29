"use client";

import Image from "next/image";
import { useState } from "react";
import styles from "./psychic-alchemy-intro-video.module.css";

// This existing, archived video was tested in an unauthenticated browser.
// Use the stable embed page, NEVER the expiring signed MP4 download URL.
const VIDEO_ID = "fd5fcead9b067f9a0649862675a38771";
const EMBED_URL = `https://app.heygen.com/embeds/${VIDEO_ID}`;
const WATCH_URL = `https://app.heygen.com/share/${VIDEO_ID}`;

const transcript = [
  "Hi, I’m Andy Li and welcome to a personal session in Psychic Alchemy.",
  "My approach brings together homeopathy with systemic constellations and hypnotherapy so we can explore deeper patterns in emotions and relationships and find new solutions.",
  "You’re welcome to read the testimonials and leave a request on the website.",
  "I’m looking forward to exploring your situation together and finding new resources and solutions.",
];

export function PsychicAlchemyIntroVideo() {
  const [active, setActive] = useState(false);

  return (
    <section className={styles.section} id="psychic-alchemy-video" aria-labelledby="psychic-alchemy-video-title">
      <div className={styles.copy}>
        <p className={styles.kicker}>A personal welcome</p>
        <h2 id="psychic-alchemy-video-title">Psychic Alchemy<br />with Andy</h2>
        <p>A short introduction to my approach: homeopathy, systemic constellations and hypnotherapy.</p>
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
              title="Psychic Alchemy — a personal welcome from Andy Li"
              allow="fullscreen; encrypted-media; picture-in-picture"
              allowFullScreen
              loading="lazy"
              referrerPolicy="strict-origin-when-cross-origin"
            />
          ) : (
            <button type="button" className={styles.poster} onClick={() => setActive(true)} aria-label="Open video: Psychic Alchemy with Andy, 27 seconds">
              <Image src="/images/holistic-house/andy-about.png" alt="Andy Li" fill sizes="(max-width: 767px) 100vw, 650px" className={styles.image} />
              <span className={styles.shade} aria-hidden="true" />
              <span className={styles.play} aria-hidden="true">▶</span>
              <span className={styles.label}>Watch introduction <span>0:27 · English</span></span>
            </button>
          )}
        </div>
        <div className={styles.note}>
          <span>AI-assisted video using Andy’s digital twin and voice.</span>
          <a href={WATCH_URL} target="_blank" rel="noopener noreferrer">Open video <span aria-hidden="true">↗</span></a>
        </div>
      </div>
      <details className={styles.transcript}>
        <summary>Read the video transcript</summary>
        {transcript.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
      </details>
    </section>
  );
}
