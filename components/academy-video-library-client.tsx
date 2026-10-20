"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, ChevronDown, Film, Play } from "lucide-react";
import { useState } from "react";

import type { PublicLocale } from "@/lib/public-locales";
import styles from "./academy-video-library.module.css";

export type AcademyVideoLesson = { id: string; title: string; unavailable?: boolean };
export type AcademyVideoChapter = { id: string; title: string; videos: AcademyVideoLesson[] };
export type AcademyVideoCourse = {
  id: string;
  title: string;
  category: string;
  poster: string;
  href: string;
  chapters: AcademyVideoChapter[];
};
export type AcademyVideoProgram = {
  id: string;
  title: string;
  poster: string;
  href: string;
  courses: AcademyVideoCourse[];
};
export type AcademyVideoGroup = {
  language: "en" | "ru";
  intro: string;
  programs: AcademyVideoProgram[];
};

const ui = {
  en: {
    heading: "Video learning library",
    lead: "Choose a program, then a module or category. Open only the lesson you want to watch.",
    en: "English-language videos",
    ru: "Russian-language videos",
    ruBoundary: "From here, the original videos are in Russian",
    enAudio: "English audio",
    ruAudio: "Russian audio",
    modules: "modules",
    videos: "videos",
    video: "video",
    programs: "programs",
    expand: "Expand program",
    collapse: "Collapse program",
    show: "Show lessons",
    hide: "Hide lessons",
    watch: "Play",
    details: "Explore the complete course",
    youtube: "Watch on YouTube",
    missing: "Source pending:",
    unavailable: "Recording unavailable: the listed source is not publicly playable.",
    unverified: "“Flight to the Sun” is retained as a practice reference, not as a playable video until its recording is verified.",
  },
  ru: {
    heading: "Видеотека программ",
    lead: "Выберите программу, затем модуль или категорию. Список уроков раскрывается по нажатию.",
    en: "Видео на английском языке",
    ru: "Видео на русском языке",
    ruBoundary: "Начиная отсюда — оригинальные видео на русском языке",
    enAudio: "Английская речь",
    ruAudio: "Русская речь",
    modules: "модулей",
    videos: "видео",
    video: "видео",
    programs: "программы",
    expand: "Открыть программу",
    collapse: "Свернуть программу",
    show: "Показать уроки",
    hide: "Скрыть уроки",
    watch: "Воспроизвести",
    details: "Подробнее о программе",
    youtube: "Смотреть на YouTube",
    missing: "Источник уточняется:",
    unavailable: "Запись недоступна: указанный источник не открыт для публичного просмотра.",
    unverified: "«Полёт к Солнцу» сохранён как описание практики, но запись не показывается, пока ссылка на видео не подтверждена.",
  },
  es: {
    heading: "Biblioteca de cursos en vídeo",
    lead: "Elige un programa y después un módulo o categoría. Abre solamente la lección que quieras ver.",
    en: "Vídeos en inglés",
    ru: "Vídeos en ruso",
    ruBoundary: "A partir de aquí, los vídeos originales están en ruso",
    enAudio: "Audio en inglés",
    ruAudio: "Audio en ruso",
    modules: "módulos",
    videos: "vídeos",
    video: "vídeo",
    programs: "programas",
    expand: "Abrir programa",
    collapse: "Cerrar programa",
    show: "Mostrar lecciones",
    hide: "Ocultar lecciones",
    watch: "Reproducir",
    details: "Ver programa completo",
    youtube: "Ver en YouTube",
    missing: "Fuente pendiente:",
    unavailable: "Grabación no disponible: la fuente indicada no se puede reproducir públicamente.",
    unverified: "«Flight to the Sun» permanece como referencia; la grabación todavía no está verificada.",
  },
} as const;

function poster(videoId: string) {
  return "https://i.ytimg.com/vi/" + videoId + "/mqdefault.jpg";
}

function courseVideoCount(course: AcademyVideoCourse) {
  return course.chapters.reduce((total, chapter) => total + chapter.videos.length, 0);
}

function programVideoCount(program: AcademyVideoProgram) {
  return program.courses.reduce((total, course) => total + courseVideoCount(course), 0);
}

/** One active video at a time: folding a course or program stops playback. */
export function AcademyVideoLibraryClient({
  locale,
  groups,
}: {
  locale: PublicLocale;
  groups: AcademyVideoGroup[];
}) {
  const t = ui[locale];
  const [openProgram, setOpenProgram] = useState<string | null>(groups[0]?.programs[0]?.id ?? null);
  const [openCourse, setOpenCourse] = useState<string | null>(null);
  const [playingVideo, setPlayingVideo] = useState<string | null>(null);

  const openProgramById = (id: string) => {
    setOpenProgram((current) => current === id ? null : id);
    setOpenCourse(null);
    setPlayingVideo(null);
  };
  const openCourseById = (id: string) => {
    setOpenCourse((current) => current === id ? null : id);
    setPlayingVideo(null);
  };
  const openVideoById = (id: string) => {
    setPlayingVideo((current) => current === id ? null : id);
  };

  return (
    <section className={styles.library} aria-labelledby="academy-video-library-title">
      <div className={styles.intro}>
        <div>
          <p className={styles.eyebrow}><Film size={15} aria-hidden="true" /> {locale === "ru" ? "Академия · видеоматериалы" : locale === "es" ? "Academia · materiales en vídeo" : "Academy · video lessons"}</p>
          <h2 id="academy-video-library-title">{t.heading}</h2>
          <p>{t.lead}</p>
        </div>
        <nav className={styles.languageJump} aria-label={locale === "ru" ? "Язык видеозаписей" : locale === "es" ? "Idioma del vídeo" : "Video language"}>
          <a href="#academy-video-en">EN</a>
          <a href="#academy-video-ru">RU ↓</a>
        </nav>
      </div>
      {groups.map((group) => {
        const videoCount = group.programs.reduce((sum, program) => sum + programVideoCount(program), 0);
        return (
          <section
            className={styles.languageSection + (group.language === "ru" ? " " + styles.russianSection : "")}
            id={"academy-video-" + group.language}
            key={group.language}
            aria-labelledby={"academy-video-" + group.language + "-heading"}
          >
            {group.language === "ru" ? (
              <div className={styles.languageBoundary} role="note">
                <span className={styles.languageFlag}>RU</span>
                <strong>{t.ruBoundary}</strong>
              </div>
            ) : null}
            <div className={styles.languageHeader}>
              <div>
                <span className={styles.languageName}>{group.language === "en" ? "EN" : "RU"} · {group.language === "en" ? t.enAudio : t.ruAudio}</span>
                <h3 id={"academy-video-" + group.language + "-heading"}>{t[group.language]}</h3>
                <p>{group.intro}</p>
              </div>
              <span className={styles.sectionCount}>{videoCount} {t.videos}</span>
            </div>
            <div className={styles.programList}>
              {group.programs.map((program) => {
                const expanded = program.id === openProgram;
                const panelId = program.id + "-courses";
                const programCount = programVideoCount(program);
                return (
                  <article className={styles.program} key={program.id}>
                    <button
                      type="button"
                      className={styles.programToggle}
                      onClick={() => openProgramById(program.id)}
                      aria-expanded={expanded}
                      aria-controls={panelId}
                      aria-label={(expanded ? t.collapse : t.expand) + ": " + program.title}
                    >
                      <span className={styles.programPoster}><Image src={program.poster} width={100} height={68} sizes="84px" alt="" /></span>
                      <span className={styles.programCopy}>
                        <strong>{program.title}</strong>
                        <small>{program.courses.length} {t.modules} · {programCount} {t.videos}</small>
                      </span>
                      <ChevronDown className={styles.chevron + (expanded ? " " + styles.rotate : "")} aria-hidden="true" />
                    </button>
                    {expanded ? (
                      <div className={styles.programBody} id={panelId}>
                        {program.courses.map((course, courseIndex) => {
                          const active = openCourse === course.id;
                          const coursePanel = "course-" + course.id.replace(/[^a-z0-9-]+/gi, "-");
                          return (
                            <div className={styles.courseBlock} key={course.id}>
                              {courseIndex === 0 || course.category !== program.courses[courseIndex - 1].category ? (
                                <p className={styles.category}>{course.category}</p>
                              ) : null}
                              <button
                                type="button"
                                className={styles.courseToggle}
                                onClick={() => openCourseById(course.id)}
                                aria-expanded={active}
                                aria-controls={coursePanel}
                                aria-label={(active ? t.hide : t.show) + ": " + course.title}
                              >
                                <span className={styles.coursePoster}><Image src={course.poster} unoptimized width={96} height={54} sizes="76px" alt="" loading="lazy" /></span>
                                <span className={styles.courseCopy}><strong>{course.title}</strong><small>{courseVideoCount(course)} {courseVideoCount(course) === 1 ? t.video : t.videos}</small></span>
                                <ChevronDown className={styles.chevron + (active ? " " + styles.rotate : "")} aria-hidden="true" />
                              </button>
                              {active ? (
                                <div className={styles.lessonPanel} id={coursePanel}>
                                  {course.chapters.map((chapter) => (
                                    <section className={styles.chapter} key={chapter.id}>
                                      {chapter.title ? <h4>{chapter.title}</h4> : null}
                                      {chapter.videos.map((lesson, index) => {
                                        const key = course.id + "/" + chapter.id + "/" + lesson.id;
                                        const playing = playingVideo === key;
                                        return (
                                          <div className={styles.lesson} key={key}>
                                            {lesson.unavailable ? <div className={styles.lessonToggle} role="note">
                                              <span className={styles.lessonTitle}>{lesson.title}</span>
                                              <span>{t.unavailable}</span>
                                            </div> : (
                                              <div className={styles.lessonActions}>
                                                <button className={styles.lessonToggle + (playing ? " " + styles.selected : "")}
                                                  type="button" onClick={() => openVideoById(key)} aria-expanded={playing}
                                                  aria-label={t.watch + ": " + lesson.title}>
                                                  <span className={styles.lessonPoster}><Image src={poster(lesson.id)} unoptimized width={80} height={45} sizes="62px" alt="" loading="lazy" /></span>
                                                  <span className={styles.lessonTitle}>{lesson.title}</span>
                                                  <Play size={17} aria-hidden="true" />
                                                </button>
                                                <a className={styles.lessonInlineToggle}
                                                  href={"https://www.youtube.com/watch?v=" + lesson.id} target="_blank" rel="noopener noreferrer"
                                                  aria-label={t.youtube + ": " + lesson.title} title={t.youtube}>
                                                  <ArrowUpRight size={17} aria-hidden="true" />
                                                </a>
                                              </div>
                                            )}
                                            {playing ? (
                                              <div className={styles.player}>
                                                <div className={styles.frame}>
                                                  <iframe
                                                    key={lesson.id}
                                                    src={"https://www.youtube-nocookie.com/embed/" + encodeURIComponent(lesson.id) + "?autoplay=1&rel=0"}
                                                    title={lesson.title}
                                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                                                    allowFullScreen
                                                    loading="eager"
                                                  />
                                                </div>
                                                <a href={"https://www.youtube.com/watch?v=" + lesson.id} target="_blank" rel="noopener noreferrer">
                                                  {t.youtube} <ArrowUpRight size={14} aria-hidden="true" />
                                                </a>
                                              </div>
                                            ) : null}
                                          </div>
                                        );
                                      })}
                                    </section>
                                  ))}
                                  <Link className={styles.details} href={course.href}>{t.details} <ArrowUpRight size={16} aria-hidden="true" /></Link>
                                </div>
                              ) : null}
                            </div>
                          );
                        })}
                        <Link className={styles.programDetails} href={program.href}>{t.details} <ArrowUpRight size={15} aria-hidden="true" /></Link>
                      </div>
                    ) : null}
                  </article>
                );
              })}
            </div>
            {group.language === "en" ? (
              <p className={styles.sourceNote}><strong>{t.missing}</strong> {t.unverified}</p>
            ) : null}
          </section>
        );
      })}
    </section>
  );
}
