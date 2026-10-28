"use client";

import Link from "next/link";
import { ArrowRight, Check, Compass, BookOpen, Play, TestTubeDiagonal } from "lucide-react";
import type { PublicLocale } from "@/lib/public-locales";
import styles from "./holistic-support-today-pick.module.css";

const copy = {
  en: { title: "Today’s pick:", test: "My Test", ideas: "Get Ideas",
    video: "Motivation Video", course: "Study Program", done: "Done",
    note: "Completed steps turn green. A video question is voluntary." },
  ru: { title: "Сегодня попробуй:", test: "Мой тест", ideas: "Рекомендации",
    video: "Видео для мотивации", course: "Моя программа", done: "Выполнено",
    note: "Выполненные шаги становятся зелёными. Ответ после видео — добровольный." },
  es: { title: "Para hoy:", test: "Mi test", ideas: "Ideas",
    video: "Vídeo motivador", course: "Mi programa", done: "Completado",
    note: "Los pasos completados se ponen verdes. La reflexión es opcional." },
} as const;

export function HolisticSupportTodayPick({
  locale, testHref, testDone, ideasDone, videoDone, courseDone,
  onIdeas, onVideo, onCourse,
}: {
  locale: PublicLocale;
  testHref: string;
  testDone: boolean;
  ideasDone: boolean;
  videoDone: boolean;
  courseDone: boolean;
  onIdeas: () => void;
  onVideo: () => void;
  onCourse: () => void;
}) {
  const t = copy[locale];
  const actions = [
    { id: "ideas", title: t.ideas, done: ideasDone, Icon: Compass, onClick: onIdeas },
    { id: "video", title: t.video, done: videoDone, Icon: Play, onClick: onVideo },
    { id: "course", title: t.course, done: courseDone, Icon: BookOpen, onClick: onCourse },
  ] as const;

  return (
    <nav className={styles.panel} data-support-today-pick aria-label={t.title}>
      <span className={styles.title}>{t.title}</span>
      <div className={styles.rail} aria-label={t.note}>
        <Link href={testHref} className={styles.chip} data-support-pick="test"
          data-done={testDone ? "true" : "false"} prefetch={false}
          aria-label={t.test + (testDone ? ": " + t.done : "")}>
          <span className={styles.icon}>{testDone ? <Check size={16} aria-hidden="true" /> :
            <TestTubeDiagonal size={16} aria-hidden="true" />}</span>
          <span>{t.test}</span>
          {!testDone ? <ArrowRight className={styles.arrow} size={14} aria-hidden="true" /> : null}
        </Link>
        {actions.map(({ id, title, done, Icon, onClick }) => (
          <button key={id} type="button" onClick={onClick} className={styles.chip}
            data-support-pick={id} data-done={done ? "true" : "false"}
            aria-label={title + (done ? ": " + t.done : "")}>
            <span className={styles.icon}>{done ? <Check size={16} aria-hidden="true" /> :
              <Icon size={16} aria-hidden="true" />}</span>
            <span>{title}</span>
            {!done ? <ArrowRight className={styles.arrow} size={14} aria-hidden="true" /> : null}
          </button>
        ))}
      </div>
    </nav>
  );
}
