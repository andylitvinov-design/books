"use client";

import Image from "next/image";
import { Play } from "lucide-react";
import { useState } from "react";
import type { PublicLocale } from "@/lib/public-locales";

/** Lightweight public YouTube poster: the same card becomes a real player only after Play. */
export function AcademyVideoPlayer({ youtubeId, title, locale = "en", posterLoading = "lazy" }: { youtubeId: string; title: string; locale?: PublicLocale; posterLoading?: "lazy" | "eager" }) {
  const [playing, setPlaying] = useState(false);
  const safeId = encodeURIComponent(youtubeId);
  const playLabel = locale === "ru" ? "Смотреть" : locale === "es" ? "Reproducir" : "Play";
  return (
    <div className="academy-video-choice">
      {playing ? (
        <div className="academy-video-frame">
          <iframe
            allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture; fullscreen"
            allowFullScreen
            loading="eager"
            referrerPolicy="strict-origin-when-cross-origin"
            src={"https://www.youtube-nocookie.com/embed/" + safeId + "?autoplay=1&playsinline=1&rel=0"}
            title={title}
          />
        </div>
      ) : (
        <button className="academy-video-poster" onClick={() => setPlaying(true)} type="button" aria-label={playLabel + ": " + title}>
          <Image
            alt=""
            height={270}
            loading={posterLoading}
            unoptimized
            sizes="(max-width: 600px) 100vw, 380px"
            src={"https://i.ytimg.com/vi/" + safeId + "/hqdefault.jpg"}
            width={480}
          />
          <span><Play aria-hidden="true" />{playLabel}: {title}</span>
        </button>
      )}
      <a className="academy-video-direct-link" href={"https://www.youtube.com/watch?v=" + safeId}
        target="_blank" rel="noopener noreferrer" aria-label={(locale === "ru" ? "Открыть на YouTube: " : locale === "es" ? "Abrir en YouTube: " : "Watch on YouTube: ") + title}>
        YouTube ↗
      </a>
    </div>
  );
}
