import { REIKI_FREE_COURSE_PATH } from "@/lib/academy/reiki-free-course";
import Image from "next/image";
import { cardArtworkUrl, hasCardArtwork } from "@/lib/public-card-artwork";
import Link from "next/link";
import { ArrowRight, ChevronDown, Sparkles } from "lucide-react";
import type { PublicLocale } from "@/lib/public-locales";
import styles from "./academy-free-course-banner.module.css";

const copy = {
  en: {
    eyebrow: "HOLISTIC HOUSE · FREE LEARNING",
    title: "Free AI courses & introductions",
    subtitle: "Two guided courses (one preview) and two free Reiki introductions.",
    count: "4 courses",
    open: "Choose a course",
    start: "Start course",
    details: "Details",
    note: "The Reiki introductions are free to explore; personal initiations need teacher confirmation. Stress Relief is education and support, not a substitute for professional care.",
  },
  ru: {
    eyebrow: "HOLISTIC HOUSE · БЕСПЛАТНОЕ ОБУЧЕНИЕ",
    title: "Бесплатные ИИ-курсы и вводные программы",
    subtitle: "Два интерактивных курса (один в предварительной версии) и два знакомства с Рейки.",
    count: "4 курса",
    open: "Выбрать курс",
    start: "Пройти",
    details: "Детали",
    note: "Вводные материалы Рейки бесплатны, личная инициация — по согласованию. «ОПОРА» — образовательная поддержка, не замена профессиональной помощи.",
  },
  es: {
    eyebrow: "HOLISTIC HOUSE · APRENDIZAJE GRATIS",
    title: "Cursos de IA e introducciones gratis",
    subtitle: "Dos cursos interactivos (uno preliminar) y dos introducciones a Reiki.",
    count: "4 cursos",
    open: "Elegir un curso",
    start: "Empezar",
    details: "Detalles",
    note: "Las introducciones a Reiki son gratuitas; las iniciaciones personales requieren confirmación. OPORA se abre en inglés y ofrece apoyo educativo, no atención clínica.",
  },
} as const;

// Reuse published learning paths. OPORA is the account-saved course; Energywork
// is an educational preview without durable answers until the secure API ships.
const courses = [
  {
    id: "stress",
    image: "/images/holistic-house/course-focus-mountain-boy.webp",
    path: "app/course?program=stress",
    detailsPath: "courses/antistress",
    en: {
      type: "INTERACTIVE AI COURSE · FREE",
      title: "OPORA · Stress Relief",
      description: "14 gentle lessons and seven everyday stress-management skills.",
      duration: "14 days · 5–12 min/day",
    },
    ru: {
      type: "ИНТЕРАКТИВНЫЙ ИИ-КУРС · БЕСПЛАТНО",
      title: "ОПОРА · Антистресс",
      description: "14 коротких занятий и семь навыков работы с повседневным стрессом.",
      duration: "14 дней · 5–12 мин/день",
    },
    es: {
      type: "CURSO INTERACTIVO DE IA · GRATIS",
      title: "OPORA · Antiestrés",
      description: "14 lecciones breves y siete habilidades para el estrés cotidiano.",
      duration: "14 días · 5–12 min/día",
    },
  },
  {
    id: "energywork",
    image: "/academy/reiki-yggdrasil/source/program-overview.jpg",
    path: "principles-of-energywork/learn",
    detailsPath: "academy/principles-of-energywork",
    en: {
      type: "INTERACTIVE COURSE · PREVIEW",
      title: "Principles of Energywork",
      description: "Guided slides, original videos and reflections. Private save and resume after Google sign-in.",
      duration: "At your own pace",
    },
    ru: {
      type: "ИНТЕРАКТИВНЫЙ КУРС · ПРЕВЬЮ",
      title: "Основы энергетики",
      description: "Слайды, авторские видео и рефлексия. Сохранение и продолжение после входа через Google.",
      duration: "В своём темпе",
    },
    es: {
      type: "CURSO INTERACTIVO · VISTA PREVIA EN INGLÉS",
      title: "Principios del trabajo energético",
      description: "Lecciones, vídeos originales y reflexiones. Guardado privado tras iniciar sesión.",
      duration: "A tu ritmo",
    },
  },
  {
    id: "tantra-reiki",
    image: "/images/holistic-house/tantra-reiki-yin-yang-cover.svg",
    path: "reiki/tantra-reiki/free-initiation",
    detailsPath: null,
    en: {
      type: "FREE LEVEL 1 INTRODUCTION",
      title: "Tantra Reiki",
      description: "Explore the first-level materials and practices. Initiation is arranged separately.",
      duration: "First-level materials",
    },
    ru: {
      type: "БЕСПЛАТНОЕ ВВЕДЕНИЕ · 1 СТУПЕНЬ",
      title: "Тантра Рейки",
      description: "Материалы и практики первой ступени. Инициация — по согласованию.",
      duration: "Материалы первой ступени",
    },
    es: {
      type: "INTRODUCCIÓN GRATIS · NIVEL 1",
      title: "Tantra Reiki",
      description: "Materiales y prácticas del primer nivel. Iniciación previa confirmación.",
      duration: "Materiales del nivel 1",
    },
  },
  {
    id: "reiki-yggdrasil",
    image: "/academy/reiki-yggdrasil/source/basic-program.jpg",
    path: "reiki/yggdrasil/free-initiation",
    detailsPath: null,
    en: {
      type: "FREE LEVEL 1 INTRODUCTION",
      title: "Reiki Yggdrasil",
      description: "Discover the first-level lessons and preparation. Initiation is arranged separately.",
      duration: "First-level materials",
    },
    ru: {
      type: "БЕСПЛАТНОЕ ВВЕДЕНИЕ · 1 СТУПЕНЬ",
      title: "Рейки Иггдрасиль",
      description: "Уроки и подготовка к первой ступени. Инициация — по согласованию.",
      duration: "Материалы первой ступени",
    },
    es: {
      type: "INTRODUCCIÓN GRATIS · NIVEL 1",
      title: "Reiki Yggdrasil",
      description: "Lecciones y preparación del nivel 1. Iniciación previa confirmación.",
      duration: "Materiales del nivel 1",
    },
  },
] as const;

export function AcademyFreeCourseBanner({ locale }: { locale: PublicLocale }) {
  const t = copy[locale];
  // The personal AI-course workspace is currently available only in EN/RU.
  const courseLocale = locale === "es" ? "en" : locale;

  return (
    <section className={styles.banner} aria-labelledby="academy-free-course-title" data-academy-free-course-list>
      <details className={styles.disclosure}>
        <summary className={styles.summary}>
          <span className={styles.icon}><Sparkles size={21} aria-hidden="true" /></span>
          <span className={styles.heading}>
            <span className={styles.eyebrow}>{t.eyebrow}</span>
            <span className={styles.title} id="academy-free-course-title">{t.title}</span>
            <span className={styles.subtitle}>{t.subtitle}</span>
          </span>
          <span className={styles.toggle}>
            <span className={styles.count}>{t.count}</span>
            <span className={styles.toggleHint}>{t.open}</span>
            <ChevronDown className={styles.chevron} size={22} aria-hidden="true" />
          </span>
        </summary>
        <div className={styles.body}>
          <div className={styles.courses}>
            {courses.map((course) => {
              const info = course[locale];
              const href = course.id === "stress"
                ? `/${courseLocale}/${course.path}`
                : course.id === "energywork"
                  ? REIKI_FREE_COURSE_PATH
                  : `/${locale}/academy/${course.path}`;
              return (
                <article className={styles.course} key={course.id} data-free-course-id={course.id}>
                  <span className={styles.photo}>
                    <Image src={cardArtworkUrl(course.image)} unoptimized={hasCardArtwork(course.image)} alt="" fill sizes="(max-width: 540px) 96px, 132px" />
                  </span>
                  <div className={styles.courseContent}>
                    <span className={styles.courseType}>{info.type}</span>
                    <h3>{info.title}</h3>
                    <p>{info.description}</p>
                    <div className={styles.courseFooter}>
                      <span className={styles.duration}>{info.duration}</span>
                      <span className={styles.actions}>
                        {course.detailsPath && (
                          <Link className={styles.details} href={`/${locale}/${course.detailsPath}`}>
                            {t.details}
                          </Link>
                        )}
                        <Link className={styles.start} href={href} prefetch={false}>
                          {t.start}<ArrowRight size={17} aria-hidden="true" />
                        </Link>
                      </span>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
          <p className={styles.note}>{t.note}</p>
        </div>
      </details>
    </section>
  );
}
