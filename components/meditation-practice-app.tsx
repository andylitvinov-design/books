"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, ArrowRight, ChevronLeft, ChevronRight, ExternalLink } from "lucide-react";
import type { MeditationVideo } from "@/data/academy/holistic-support-meditations";
import type { PublicLocale } from "@/lib/public-locales";
import styles from "./meditation-practice-app.module.css";

type Goal = "wellbeing" | "business" | "relationships" | "magic";
type Tradition = "all" | "egyptian" | "maya" | "reiki" | "greek";
type View = "meditations" | "courses";
type Course = {
  id: string; tradition: Exclude<Tradition, "all">; goals: Goal[];
  path: string; title: Record<PublicLocale, string>;
};
const goalOrder: Goal[] = ["wellbeing", "business", "relationships", "magic"];
const traditionOrder: Tradition[] = ["all", "egyptian", "maya", "reiki", "greek"];
// Existing public Academy destinations, never speculative unpublished courses.
const courses: Course[] = [
  { id: "reiki", tradition: "reiki", goals: ["wellbeing", "magic"], path: "principles-of-energywork",
    title: { en: "Reiki Practitioner · free course", ru: "Практик Рейки · бесплатный курс", es: "Practicante de Reiki · curso gratis" } },
  { id: "osiris", tradition: "egyptian", goals: ["magic", "wellbeing"], path: "egyptian-priesthood",
    title: { en: "Egyptian Priesthood · Osiris (7 videos)", ru: "Египетское жречество · Осирис (7 видео)", es: "Sacerdocio egipcio · Osiris (7 vídeos)" } },
  { id: "maya", tradition: "maya", goals: ["magic"], path: "mysteries/maya-aztec/feathered-serpent",
    title: { en: "Maya & Aztec Mysteries · Feathered Serpent", ru: "Мистерии майя и ацтеков · Пернатый змей", es: "Misterios mayas y aztecas · Serpiente Emplumada" } },
  { id: "greek", tradition: "greek", goals: ["business", "relationships", "magic"], path: "coaching/greek",
    title: { en: "Greek goal planning · interactive course", ru: "Греческая традиция · курс по целям", es: "Tradición griega · curso de metas" } },
];
const copy = {
  en: {
    title: "Meditations & courses", back: "Support", selectGoal: "Choose direction",
    goals: { wellbeing: "Health & energy", business: "Business & money", relationships: "Relationships", magic: "Magic & growth" },
    traditions: { all: "All traditions", egyptian: "Egyptian", maya: "Maya", reiki: "Reiki", greek: "Greek" },
    tradition: "Tradition", meditations: "Meditations", courses: "Courses", course: "Choose course",
    recording: "Choose recording", previous: "Previous", next: "Next", source: "Original recording",
    english: "Original audio: English", russian: "Original audio: Russian",
    courseOriginal: "Original Osiris lessons are in Russian, including on EN/ES pages.",
    unavailable: "No verified video for this selection. Open the existing course instead, or change the direction.",
    noMeditations: "No verified meditation for this tradition and direction. Choose Courses to explore the Academy.",
    openCourse: "Open course", youtube: "YouTube controls · watch, pause or seek",
    note: "The directions are discovery filters, not medical treatments or promises of results.",
    count: "of", help: "Video opens directly in the YouTube player; sound starts only when you press Play.",
  },
  ru: {
    title: "Медитации и курсы", back: "Поддержка", selectGoal: "Выберите направление",
    goals: { wellbeing: "Здоровье и энергия", business: "Бизнес и деньги", relationships: "Отношения", magic: "Магия и развитие" },
    traditions: { all: "Все традиции", egyptian: "Египетская", maya: "Майя", reiki: "Рейки", greek: "Греческая" },
    tradition: "Традиция", meditations: "Медитации", courses: "Курсы", course: "Выбрать курс",
    recording: "Выбрать запись", previous: "Назад", next: "Далее", source: "Оригинальная запись",
    english: "Оригинальный звук: английский", russian: "Оригинальный звук: русский",
    courseOriginal: "Семь уроков об Осирисе доступны с оригинальным русским звуком.",
    unavailable: "Для этого выбора нет подтверждённого видео. Откройте курс Академии или смените направление.",
    noMeditations: "Для этой традиции пока нет подтверждённых медитаций. Переключитесь на «Курсы».",
    openCourse: "Открыть курс", youtube: "YouTube: просмотр, пауза и перемотка",
    note: "Направления — фильтры каталога, а не лечение или обещание результата.",
    count: "из", help: "YouTube-плеер открыт сразу. Звук начнётся после нажатия Play.",
  },
  es: {
    title: "Meditaciones y cursos", back: "Apoyo", selectGoal: "Elige un tema",
    goals: { wellbeing: "Salud y energía", business: "Negocios y dinero", relationships: "Relaciones", magic: "Magia y crecimiento" },
    traditions: { all: "Todas las tradiciones", egyptian: "Egipcia", maya: "Maya", reiki: "Reiki", greek: "Griega" },
    tradition: "Tradición", meditations: "Meditaciones", courses: "Cursos", course: "Elegir curso",
    recording: "Elegir vídeo", previous: "Anterior", next: "Siguiente", source: "Grabación original",
    english: "Audio original: inglés", russian: "Audio original: ruso",
    courseOriginal: "Las siete lecciones de Osiris conservan el audio original en ruso.",
    unavailable: "Aún no hay vídeo verificado. Abre el curso existente o cambia de tema.",
    noMeditations: "No hay meditaciones verificadas de esta tradición. Prueba Cursos.",
    openCourse: "Abrir curso", youtube: "YouTube: reproducir, pausar y avanzar",
    note: "Los temas son filtros de navegación, no tratamientos ni garantías.",
    count: "de", help: "El reproductor de YouTube se abre directamente, sin sonido hasta pulsar Play.",
  },
} as const;

function matchesGoal(video: MeditationVideo, goal: Goal): boolean {
  switch (goal) {
    case "wellbeing": return video.topics.includes("energy") || video.topics.includes("health");
    case "business": return video.topics.includes("business");
    case "relationships": return video.topics.includes("love");
    case "magic": return video.topics.includes("energy");
  }
}
type Props = {
  locale: PublicLocale;
  videos: MeditationVideo[];
  egyptVideos: MeditationVideo[];
  initialVideoId?: string;
};
export function MeditationPracticeApp({ locale, videos, egyptVideos, initialVideoId }: Props) {
  const t = copy[locale];
  const [goal, setGoal] = useState<Goal>("wellbeing");
  const [tradition, setTradition] = useState<Tradition>("all");
  const [view, setView] = useState<View>("meditations");
  const [courseId, setCourseId] = useState("reiki");
  const [meditationId, setMeditationId] = useState(initialVideoId || "");
  const [egyptId, setEgyptId] = useState("");

  // A tradition without verified meditation recordings goes to its actual course.
  const filteredMeditations = tradition === "all" ? videos.filter(video => matchesGoal(video, goal)) : [];
  const matchingCourses = courses.filter(course =>
    (tradition === "all" || course.tradition === tradition) && course.goals.includes(goal),
  );
  const activeCourse = matchingCourses.find(course => course.id === courseId) ?? matchingCourses[0];
  const activePlaylist = view === "meditations" ? filteredMeditations
    : activeCourse?.id === "osiris" ? egyptVideos : [];
  const chosenId = view === "meditations" ? meditationId : egyptId;
  const activeVideo = activePlaylist.find(video => video.id === chosenId) ?? activePlaylist[0];
  const activeIndex = activeVideo ? activePlaylist.findIndex(video => video.id === activeVideo.id) : -1;
  const courseUrl = activeCourse ? "/" + locale + "/academy/" + activeCourse.path : "";
  const videoSource = activeVideo
    ? "https://www.youtube-nocookie.com/embed/" + encodeURIComponent(activeVideo.id) + "?controls=1&playsinline=1&rel=0&fs=1"
    : "";

  const selectTradition = (next: Tradition) => {
    setTradition(next);
    if (next !== "all") {
      setView("courses");
      const first = courses.find(course => course.tradition === next && course.goals.includes(goal))
        ?? courses.find(course => course.tradition === next);
      if (first) {
        setCourseId(first.id);
        if (!first.goals.includes(goal)) setGoal(first.goals[0]);
      }
    }
  };
  const selectGoal = (next: Goal) => {
    setGoal(next);
    if (view === "courses" && tradition !== "all" && !courses.some(course => course.tradition === tradition && course.goals.includes(next))) {
      setTradition("all");
    }
  };
  const setVideoId = (next: string) => {
    if (view === "meditations") setMeditationId(next);
    else setEgyptId(next);
  };
  const move = (delta: number) => {
    if (activeIndex < 0 || activePlaylist.length < 2) return;
    const index = (activeIndex + delta + activePlaylist.length) % activePlaylist.length;
    setVideoId(activePlaylist[index].id);
  };

  return (
    <div className={styles.app} data-meditation-fullscreen-app lang={locale}>
      <div className={styles.shell}>
        <header className={styles.header}>
          <Link className={styles.back} href={"/" + locale + "/holistic-support#meditation-practices"} prefetch={false}>
            <ArrowLeft size={18} aria-hidden="true" />{t.back}
          </Link>
          <h1>{t.title}</h1>
          <span className={styles.brand}>HOLISTIC HOUSE</span>
        </header>
        <main className={styles.main}>
          <div className={styles.topics} role="group" aria-label={t.selectGoal}>
            {goalOrder.map(next => (
              <button key={next} type="button" data-meditation-goal={next}
                aria-pressed={goal === next} onClick={() => selectGoal(next)} className={styles.topic}>
                {t.goals[next]}
              </button>
            ))}
          </div>

          <div className={styles.controlRow}>
            <label className={styles.field}>
              <span>{t.tradition}</span>
              <select data-meditation-tradition value={tradition} onChange={event => selectTradition(event.target.value as Tradition)}>
                {traditionOrder.map(item => <option key={item} value={item}>{t.traditions[item]}</option>)}
              </select>
            </label>
            <div className={styles.viewTabs} role="group" aria-label={t.title}>
              <button type="button" aria-pressed={view === "meditations"} onClick={() => { setView("meditations"); setTradition("all"); }}>
                {t.meditations}
              </button>
              <button type="button" aria-pressed={view === "courses"} onClick={() => setView("courses")}>
                {t.courses}
              </button>
            </div>
          </div>

          <div className={styles.pickerRow}>
            {view === "courses" ? (
              <label className={styles.field}>
                <span>{t.course}</span>
                <select data-meditation-course value={activeCourse?.id ?? ""} onChange={event => { setCourseId(event.target.value); setEgyptId(""); }}>
                  {matchingCourses.length === 0 ? <option value="">—</option> : null}
                  {matchingCourses.map(item => <option key={item.id} value={item.id}>{item.title[locale]}</option>)}
                </select>
              </label>
            ) : null}
            {activePlaylist.length > 0 ? (
              <label className={styles.field}>
                <span>{t.recording}</span>
                <select data-meditation-recording value={activeVideo?.id ?? ""} onChange={event => setVideoId(event.target.value)}>
                  {activePlaylist.map(item => <option key={item.id} value={item.id}>{item.title}</option>)}
                </select>
              </label>
            ) : null}
          </div>

          <div className={styles.mediaArea}>
            <div className={styles.videoTitle} aria-live="polite">
              <strong>{activeVideo?.title ?? activeCourse?.title[locale] ?? t.meditations}</strong>
              {activeVideo ? <small>{activeIndex + 1} {t.count} {activePlaylist.length}</small> : null}
            </div>
            <div className={styles.stage} data-meditation-player-stage data-video-id={activeVideo?.id ?? ""}>
              {activeVideo ? (
                <iframe key={activeVideo.id} src={videoSource} loading="eager" title={activeVideo.title}
                  allow="accelerometer; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                  allowFullScreen referrerPolicy="strict-origin-when-cross-origin" />
              ) : (
                <div className={styles.empty} role="status">
                  {view === "meditations" ? t.noMeditations : t.unavailable}
                  {courseUrl ? <Link href={courseUrl} prefetch={false}>{t.openCourse}<ArrowRight size={16} /></Link> : null}
                </div>
              )}
            </div>
            {activeVideo ? (
              <div className={styles.navigate} aria-label={t.recording}>
                <button type="button" disabled={activePlaylist.length < 2} onClick={() => move(-1)}>
                  <ChevronLeft size={19} aria-hidden="true" />{t.previous}
                </button>
                <small>{view === "courses" ? t.courseOriginal : locale === "ru" ? t.russian : t.english}</small>
                <button type="button" disabled={activePlaylist.length < 2} onClick={() => move(1)}>
                  {t.next}<ChevronRight size={19} aria-hidden="true" />
                </button>
              </div>
            ) : null}
          </div>

          <footer className={styles.footer}>
            <p>{t.help} {t.note}</p>
            <div className={styles.footerLinks}>
              {activeVideo ? <a href={"https://www.youtube.com/watch?v=" + encodeURIComponent(activeVideo.id)} target="_blank" rel="noopener noreferrer">
                <ExternalLink size={15} aria-hidden="true" />YouTube
              </a> : null}
              {courseUrl && view === "courses" ? <Link href={courseUrl} prefetch={false}>
                {t.openCourse}<ArrowRight size={16} aria-hidden="true" />
              </Link> : null}
            </div>
          </footer>
        </main>
      </div>
    </div>
  );
}
