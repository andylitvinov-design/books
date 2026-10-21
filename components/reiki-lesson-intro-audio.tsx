"use client";

import { useEffect, useState } from "react";
import { Headphones, Volume2 } from "lucide-react";

type Locale = "en" | "ru";
type Lesson = "flight" | "tantra" | "kundalini" | "yggdrasil" | "initiation";
type PublishedAudio = { src: string; publishedAt: string };

export function ReikiLessonIntroAudio({ lesson, locale }: { lesson: Lesson; locale: Locale }) {
  const [audio, setAudio] = useState<PublishedAudio | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    setAudio(null);
    fetch("/api/reiki-intro-audio?lesson=" + lesson + "&locale=" + locale, {
      credentials: "omit", cache: "no-store", signal: controller.signal,
    })
      .then((response) => response.ok ? response.json() : { audio: null })
      .then((data) => {
        if (!controller.signal.aborted) {
          setAudio(data.audio?.src?.startsWith("https://") ? data.audio : null);
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) setAudio(null);
      });
    return () => controller.abort();
  }, [lesson, locale]);

  // Do not advertise an unpublished recording or show a placeholder on the opening slide.
  // Publishing audio in the existing owner workflow reveals the player automatically.
  if (!audio) return null;

  const ru = locale === "ru";
  return (
    <div className="reiki-intro-audio" data-reiki-lesson-intro-audio={lesson}>
      <div className="reiki-intro-audio-heading">
        <Headphones size={18} aria-hidden="true" />
        <strong>{ru ? "Аудиовведение от Андрея" : "An audio introduction from Andrey"}</strong>
      </div>
      <audio controls preload="none" src={audio.src} aria-label={
        ru ? "Прослушать личное введение Андрея перед медитацией" :
          "Listen to Andrey's personal introduction before the meditation"
      }>
        {ru ? "Ваш браузер не поддерживает аудио." : "Your browser does not support audio."}
      </audio>
      <small><Volume2 size={13} aria-hidden="true" />{ru
        ? "По желанию · без автозапуска · можно переходить к медитации"
        : "Optional · click to play · continue to the meditation anytime"}</small>
    </div>
  );
}
