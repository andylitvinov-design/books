"use client";

import { useEffect, useState } from "react";
import { Headphones, Volume2 } from "lucide-react";

type Locale = "en" | "ru";
type Lesson = "flight" | "tantra" | "kundalini" | "yggdrasil" | "initiation";
type PublishedAudio = { src: string; publishedAt: string };

export function ReikiLessonIntroAudio({ lesson, locale, showEmpty = false, onUnpublished }: {
  lesson: Lesson; locale: Locale; showEmpty?: boolean; onUnpublished?: (lesson: Lesson) => void
}) {
  const [audio, setAudio] = useState<PublishedAudio | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    setAudio(null);
    setLoading(true);
    fetch("/api/reiki-intro-audio?lesson=" + lesson + "&locale=" + locale, {
      credentials: "omit", cache: "no-store", signal: controller.signal,
    })
      .then(async (response) => ({ ok: response.ok, data: response.ok ? await response.json() : null }))
      .then(({ ok, data }) => {
        if (!controller.signal.aborted) {
          const published = data?.audio?.src?.startsWith("https://") ? data.audio : null;
          setAudio(published);
          setLoading(false);
          if (ok && !published) onUnpublished?.(lesson);
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) { setAudio(null); setLoading(false); }
      });
    return () => controller.abort();
  }, [lesson, locale, onUnpublished]);

  // Do not advertise an unpublished recording or show a placeholder on the opening slide.
  // Publishing audio in the existing owner workflow reveals the player automatically.
  const ru = locale === "ru";
  if (loading) return showEmpty ? <p role="status">{ru ? "Проверяем аудио…" : "Checking for audio…"}</p> : null;
  if (!audio) return showEmpty ? (
    <div className="reiki-intro-audio" data-reiki-lesson-intro-audio={lesson}
      data-reiki-audio-unpublished role="note">
      <div className="reiki-intro-audio-heading">
        <Headphones size={18} aria-hidden="true" />
        <strong>{ru ? "Аудиовведение ещё не опубликовано" : "Audio welcome not published yet"}</strong>
      </div>
      <small>{ru
        ? "Этот шаг необязателен: можно сразу перейти к медитации."
        : "This step is optional. You can continue to the meditation."}</small>
    </div>
  ) : null;

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
