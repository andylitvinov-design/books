"use client";

import Image from "next/image";
import { Play } from "lucide-react";
import { useState } from "react";

export function AcademyVideoPlayer({ youtubeId, title }: { youtubeId: string; title: string }) {
  const [playing, setPlaying] = useState(false);
  const safeId = encodeURIComponent(youtubeId);
  if (playing) {
    return (
      <div className="academy-video-frame">
        <iframe
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          loading="lazy"
          src={"https://www.youtube-nocookie.com/embed/" + safeId + "?autoplay=1"}
          title={title}
        />
      </div>
    );
  }
  return (
    <button className="academy-video-poster" onClick={() => setPlaying(true)} type="button" aria-label={"Play: " + title}>
      <Image
        alt=""
        height={270}
        loading="lazy"
        sizes="(max-width: 600px) 100vw, 380px"
        src={"https://i.ytimg.com/vi/" + safeId + "/hqdefault.jpg"}
        width={480}
      />
      <span><Play aria-hidden="true" />{title}</span>
    </button>
  );
}
