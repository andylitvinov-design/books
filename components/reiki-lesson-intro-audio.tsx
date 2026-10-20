"use client";

import { useEffect, useState } from "react";
import { Headphones, Volume2 } from "lucide-react";

type Locale = "en" | "ru";
type Lesson = "flight" | "tantra" | "kundalini" | "yggdrasil" | "initiation";
type PublishedAudio = { src: string; publishedAt: string };

export function ReikiLessonIntroAudio({ lesson, locale }: { lesson: Lesson; locale: Locale }) {
  const [audio, setAudio] = useState<PublishedAudio | null>(null);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    setAudio(null);
    setChecked(false);
    fetch("/api/reiki-intro-audio?lesson=" + lesson + "&locale=" + locale, {
      credentials: "omit", cache: "no-store", signal: controller.signal,
    })
      .then((response) => response.ok ? response.json() : { audio: null })
      .then((data) => {
        if (!controller.signal.aborted) {
          setAudio(data.audio?.src?.startsWith("https://") ? data.audio : null);
          setChecked(true);
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) setChecked(true);
      });
    return () => controller.abort();
  }, [lesson, locale]);

  const ru = locale === "ru";
  return (
    <div className="reiki-intro-audio" data-reiki-lesson-intro-audio={lesson}>
      <div className="reiki-intro-audio-heading">
        <Headphones size={18} aria-hidden="true" />
        <strong>{ru ? "Аудиовведение от Андрея" : "An audio introduction from Andrey"}</strong>
      </div>
      {audio ? (
        <>
          <audio controls preload="none" src={audio.src} aria-label={
            ru ? "Прослушать личное введение Андрея перед медитацией" :
              "Listen to Andrey's personal introduction before the meditation"
          }>
            {ru ? "Ваш браузер не поддерживает аудио." : "Your browser does not support audio."}
          </audio>
          <small><Volume2 size={13} aria-hidden="true" />{ru
            ? "По желанию · без автозапуска · можно переходить к медитации"
            : "Optional · click to play · continue to the meditation anytime"}</small>
        </>
      ) : (
        <p>{checked ? (
          ru ? "Личная аудиопрезентация скоро появится. Пока можно изучить краткое введение и продолжить."
            : "The personal audio presentation will be added here. You can read the introduction and continue."
        ) : (ru ? "Проверяем наличие аудиовведения…" : "Checking for the audio introduction…")}</p>
      )}
    </div>
  );
}
