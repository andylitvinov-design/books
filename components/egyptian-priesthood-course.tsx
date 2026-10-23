import Image from "next/image";
import Link from "next/link";
import { ArrowRight, BookOpen, Compass, PlayCircle, ShieldCheck, Sparkles } from "lucide-react";

import { PublicSiteHeader } from "@/components/public-site-header";
import { egyptFurtherModules, egyptLessonTopics, egyptVideoSources, osirisOriginalVideos } from "@/data/academy/egyptian-priesthood-curriculum";
import type { PublicLocale } from "@/lib/public-locales";
import styles from "./egyptian-priesthood-course.module.css";

const COPY = {
  en: {
    eyebrow: "HOLISTIC HOUSE · ACADEMY",
    title: "Egyptian Priesthood",
    subtitle: "Osiris · 7 original video lessons",
    intro: "Enter the Osiris cycle through Andrey Litvinov's original Russian-language videos. One short idea, a gentle practice and a personal reflection at each step.",
    start: "Start the learning journey", video: "Original videos", lessons: "Seven days with Osiris",
    lessonsIntro: "The original recording order is preserved. The additional study exercises are editorial reflections, not video transcripts.",
    step: "Day", watch: "Original recording", more: "Continue with Egyptian mythology",
    moreIntro: "The wider historical programme includes six further Egyptian study themes. These are reading material, not additional recovered videos.",
    source: "Source", archive: "Open the full video archive",
    privacy: "Your slide position can be kept in this browser only. Personal reflections are not saved or sent.",
    note: "Historical and symbolic education, not clinical care, a supernatural guarantee or an automatic priesthood qualification.",
  },
  ru: {
    eyebrow: "HOLISTIC HOUSE · АКАДЕМИЯ",
    title: "Египетское жречество",
    subtitle: "Осирис · 7 оригинальных видеоуроков",
    intro: "Пройдите цикл Осириса по авторским видеозаписям Андрея Литвинова. В каждом уроке — одна мысль, мягкая практика и личное размышление.",
    start: "Начать обучение", video: "Авторские видео", lessons: "Семь дней с Осирисом",
    lessonsIntro: "Порядок исходных записей сохранён. Дополнительные упражнения — редакционный учебный маршрут, а не расшифровка видео.",
    step: "День", watch: "Оригинальная запись", more: "Продолжение: египетские мистерии",
    moreIntro: "В полной исторической программе есть ещё шесть египетских тем. Это материалы для чтения, а не якобы найденные дополнительные видео.",
    source: "Источник", archive: "Смотреть все видео архивом",
    privacy: "Прогресс по слайдам сохраняется только в этом браузере. Личные записи не сохраняются и не отправляются.",
    note: "Историческое и символическое обучение; не медицинская помощь, не гарантия необычных результатов и не присвоение религиозного статуса.",
  },
  es: {
    eyebrow: "HOLISTIC HOUSE · ACADEMIA",
    title: "Sacerdocio egipcio",
    subtitle: "Osiris · 7 videolecciones originales",
    intro: "Recorre el ciclo de Osiris con los vídeos originales en ruso de Andrey Litvinov. Cada lección contiene una idea, una práctica suave y reflexión personal.",
    start: "Empezar el curso", video: "Vídeos originales", lessons: "Siete días con Osiris",
    lessonsIntro: "Se conserva el orden original. Los ejercicios son una guía editorial, no transcripciones del vídeo.",
    step: "Día", watch: "Grabación original", more: "Continuar con la mitología egipcia",
    moreIntro: "El programa histórico incluye seis temas más para leer; no se presentan como vídeos recuperados.",
    source: "Fuente", archive: "Ver todos los vídeos originales",
    privacy: "Tu posición se guarda solo en este navegador. Las reflexiones no se almacenan ni se envían.",
    note: "Educación histórica y simbólica, no atención médica, garantía sobrenatural ni cualificación religiosa.",
  },
} as const;

export function EgyptianPriesthoodLanding({ locale }: { locale: PublicLocale }) {
  const t = COPY[locale];
  return (
    <main className={styles.landing} lang={locale} data-egypt-priesthood-landing>
      <PublicSiteHeader locale={locale} showAssessmentStrip={false} />
      <div className={styles.landingShell}>
        <section className={styles.hero} aria-labelledby="egypt-priesthood-title">
          <Image
            src="/academy/reiki-yggdrasil/source/temple-studies.png"
            fill
            sizes="100vw"
            priority
            alt=""
            className={styles.heroArt}
          />
          <div className={styles.heroShade} />
          <div className={styles.heroCopy}>
            <span className={styles.heroEyebrow}><Sparkles size={15} aria-hidden="true" />{t.eyebrow}</span>
            <h1 id="egypt-priesthood-title">{t.title}</h1>
            <strong className={styles.heroSubtitle}>{t.subtitle}</strong>
            <p>{t.intro}</p>
            <div className={styles.heroActions}>
              <Link href={"/" + locale + "/academy/egyptian-priesthood/learn"} className={styles.mainAction}>
                {t.start}<ArrowRight size={19} aria-hidden="true" />
              </Link>
              <Link className={styles.secondaryAction} href={"/" + locale + "/academy/videos/egypt-osiris"}>
                <PlayCircle size={17} aria-hidden="true" />{t.archive}
              </Link>
            </div>
            <div className={styles.heroFacts}>
              <span><PlayCircle size={14} aria-hidden="true" />7 {t.video.toLowerCase()}</span>
              <span><BookOpen size={14} aria-hidden="true" />7 {t.lessons.toLowerCase()}</span>
              <span><ShieldCheck size={14} aria-hidden="true" />{t.privacy}</span>
            </div>
          </div>
        </section>

        <section className={styles.syllabus} aria-labelledby="egypt-priesthood-lessons">
          <div className={styles.sectionTitle}>
            <span className={styles.kicker}><Compass size={16} aria-hidden="true" />{t.video}</span>
            <h2 id="egypt-priesthood-lessons">{t.lessons}</h2>
            <p>{t.lessonsIntro}</p>
          </div>
          <ol className={styles.syllabusGrid}>
            {egyptLessonTopics.map((topic, index) => {
              const original = osirisOriginalVideos[index];
              return (
                <li key={topic.id}>
                  <Link href={"/" + locale + "/academy/egyptian-priesthood/learn?lesson=" + (index + 1)}
                    className={styles.syllabusItem}>
                    <span className={styles.dayNumber}>{String(index + 1).padStart(2, "0")}</span>
                    <span className={styles.syllabusText}>
                      <small>{t.step} {index + 1} · {t.watch}</small>
                      <strong>{topic.title[locale]}</strong>
                      <span>{original?.title[locale] ?? ""}</span>
                    </span>
                    <ArrowRight size={17} aria-hidden="true" />
                  </Link>
                </li>
              );
            })}
          </ol>
        </section>
        <section className={styles.moreModules} aria-labelledby="egypt-further-modules">
          <div className={styles.sectionTitle}>
            <span className={styles.kicker}><BookOpen size={15} aria-hidden="true" />{t.more}</span>
            <h2 id="egypt-further-modules">{t.more}</h2>
            <p>{t.moreIntro}</p>
          </div>
          <div className={styles.moreGrid}>
            {egyptFurtherModules.map((module) => <div key={module.id} className={styles.module}>
              <strong>{module.title[locale]}</strong><span>{module.idea[locale]}</span>
            </div>)}
          </div>
          <Link className={styles.moreLink} href={"/" + locale + "/academy/mysteries/egypt/high-wisdom"}>
            {locale === "ru" ? "Открыть полную историческую программу" : locale === "es" ? "Abrir programa histórico" : "Read the historical programme"}
            <ArrowRight size={16} aria-hidden="true" />
          </Link>
        </section>
        <footer className={styles.source}>
          <p>{t.note}</p>
          {egyptVideoSources.map((source) => <a key={source.url} href={source.url} target="_blank" rel="noopener noreferrer">
            {t.source}: {source.label} ↗
          </a>)}
        </footer>
      </div>
    </main>
  );
}
