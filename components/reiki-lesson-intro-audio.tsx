"use client";

import { useEffect, useState } from "react";
import { Headphones, Volume2 } from "lucide-react";

type Locale = "en" | "ru";
type Lesson = "flight" | "tantra" | "kundalini" | "yggdrasil" | "initiation";
type PublishedAudio = { src: string; publishedAt: string };

export function ReikiLessonIntroAudio({ lesson, locale, showEmpty = false }: { lesson: Lesson; locale: Locale; showEmpty?: boolean }) {
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

  // Only a dedicated greeting slide explains unavailable audio; opening slides stay compact.
  if (!audio) return showEmpty ? (
    <div className="reiki-intro-audio" data-reiki-lesson-intro-audio={lesson} data-audio-status="unavailable">
      <div className="reiki-intro-audio-heading">
        <Headphones size={18} aria-hidden="true" />
        <strong>{locale === "ru" ? "Личное обращение Андрея" : "A personal introduction from Andrey"}</strong>
      </div>
      <p role="status">{locale === "ru"
        ? "Аудиозапись пока недоступна. Можно сразу перейти к видео."
        : "The audio is not available yet. You can continue straight to the video."}</p>
    </div>
  ) : null;

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
