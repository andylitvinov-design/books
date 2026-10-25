"use client";

import { useRef, useState } from "react";
import { ChevronLeft, ChevronRight, ListVideo, Play } from "lucide-react";

import { AcademyVideoPlayer } from "@/components/academy-video-player";
import type { PublicLocale } from "@/lib/public-locales";
import styles from "./academy-course-video-playlist.module.css";

export type AcademyOrderedVideoLesson = {
  id: string;
  title: string;
  order: number;
};

const copy = {
  en: {
    heading: "Watch the course in order",
    intro: "All original lessons in their PsiMaster sequence. Choose any lesson, then press Play on the video.",
    total: "videos",
    now: "Lesson",
    of: "of",
    previous: "Previous lesson",
    next: "Next lesson",
    allLessons: "All course lessons",
    selected: "Selected",
  },
  ru: {
    heading: "Смотреть видеокурс по порядку",
    intro: "Все исходные видео PsiMaster в порядке уроков. Выберите урок и нажмите ▶ на обложке.",
    total: "видео",
    now: "Урок",
    of: "из",
    previous: "Предыдущий урок",
    next: "Следующий урок",
    allLessons: "Все уроки курса",
    selected: "Выбран",
  },
  es: {
    heading: "Ver el curso en orden",
    intro: "Todas las lecciones originales de PsiMaster en su orden. Elige una y pulsa Reproducir.",
    total: "vídeos",
    now: "Lección",
    of: "de",
    previous: "Lección anterior",
    next: "Lección siguiente",
    allLessons: "Todas las lecciones del curso",
    selected: "Seleccionada",
  },
} as const;

export function AcademyCourseVideoPlaylist({
  locale,
  courseTitle,
  lessons,
  introText,
}: {
  locale: PublicLocale;
  courseTitle: string;
  lessons: AcademyOrderedVideoLesson[];
  introText?: string;
}) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const playerRef = useRef<HTMLDivElement>(null);
  if (!lessons.length) return null;

  const t = copy[locale];
  const index = Math.min(selectedIndex, lessons.length - 1);
  const active = lessons[index];

  function choose(indexToOpen: number) {
    if (indexToOpen < 0 || indexToOpen >= lessons.length) return;
    setSelectedIndex(indexToOpen);
    // On a small phone a lesson can be several rows below the player.
    // Return to the selected lesson's player only on an explicit click.
    if (typeof window !== "undefined" && window.matchMedia("(max-width: 720px)").matches) {
      playerRef.current?.scrollIntoView({
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
        block: "start",
      });
    }
  }

  return (
    <section
      id="academy-video-lessons"
      className={styles.root}
      aria-label={courseTitle + " — " + t.allLessons}
      data-academy-course-playlist
      data-video-lesson-count={lessons.length}
    >
      <header className={styles.heading}>
        <div className={styles.headingText}>
          <p className={styles.eyebrow}><ListVideo aria-hidden="true" size={16} />PsiMaster · {lessons.length} {t.total}</p>
          <h2>{t.heading}</h2>
          <p className={styles.intro}>{introText ?? t.intro}</p>
        </div>
      </header>

      <div className={styles.layout}>
        <div className={styles.playerPane} ref={playerRef}>
          <div className={styles.nowPlaying}>
            <span>{t.now} {index + 1} {t.of} {lessons.length}</span>
            <h3 aria-live="polite">{active.title}</h3>
          </div>
          {/* Changing a lesson unmounts the previous iframe: playback cannot overlap. */}
          <AcademyVideoPlayer
            key={active.id}
            youtubeId={active.id}
            title={active.title}
            locale={locale}
            posterLoading="eager"
          />
          <nav className={styles.controls} aria-label={t.allLessons}>
            <button type="button" onClick={() => choose(index - 1)} disabled={index === 0}>
              <ChevronLeft size={16} aria-hidden="true" />{t.previous}
            </button>
            <button type="button" onClick={() => choose(index + 1)} disabled={index === lessons.length - 1}>
              {t.next}<ChevronRight size={16} aria-hidden="true" />
            </button>
          </nav>
        </div>

        <div className={styles.sequence}>
          <div className={styles.sequenceHeading}>
            <strong>{t.allLessons}</strong>
            <span>{lessons.length} {t.total}</span>
          </div>
          <ol className={styles.lessons}>
            {lessons.map((lesson, lessonIndex) => (
              <li key={lesson.id}>
                <button
                  type="button"
                  className={styles.lessonButton + (lessonIndex === index ? " " + styles.active : "")}
                  onClick={() => choose(lessonIndex)}
                  aria-current={lessonIndex === index ? "step" : undefined}
                  aria-pressed={lessonIndex === index}
                  data-academy-video-id={lesson.id}
                  data-source-order={lesson.order}
                >
                  <span className={styles.lessonNumber}>{String(lessonIndex + 1).padStart(2, "0")}</span>
                  <span className={styles.lessonTitle}>{lesson.title}</span>
                  <span className={styles.lessonAction}>
                    {lessonIndex === index ? <span>{t.selected}</span> : <Play aria-hidden="true" size={15} />}
                  </span>
                </button>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
