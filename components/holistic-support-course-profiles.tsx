"use client";

import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight, BookOpen, CheckCircle2, Coins, Compass,
  Heart, HeartPulse, ListChecks, Sparkles,
} from "lucide-react";

import type { GoalSector, GoalSectorSnapshot } from "@/components/holistic-support-goal-filter";
import type { PublicLocale } from "@/lib/public-locales";
import type { SupportMobileCourse } from "@/components/holistic-support-mobile";
import styles from "./holistic-support-course-profiles.module.css";

export type CourseProfileSector = Extract<GoalSector, "energy" | "money" | "love" | "meaning">;

const profiles = [
  { id: "energy", Icon: HeartPulse },
  { id: "money", Icon: Coins },
  { id: "love", Icon: Heart },
  { id: "meaning", Icon: Compass },
] as const;

const content = {
  ru: {
    heading: "Выбери свой профиль",
    profile: {
      energy: { label: "Профиль здоровья", short: "Здоровье", hint: "Энергия и самочувствие",
        title: "Здоровье и жизненная энергия", description: "Оцени своё состояние, сон и внутренние ресурсы. Выбери, с чего начать." },
      money: { label: "Профиль денег", short: "Деньги", hint: "Доход и устойчивость",
        title: "Деньги и возможности", description: "Исследуй своё отношение к деньгам, финансовую устойчивость и желаемые изменения." },
      love: { label: "Профиль отношений", short: "Отношения", hint: "Близость и поддержка",
        title: "Отношения и близость", description: "Исследуй качество контакта, доверие и то, какой поддержки тебе сейчас не хватает." },
      meaning: { label: "Профиль смыслов", short: "Смыслы", hint: "Ценности и направление",
        title: "Смыслы и направление жизни", description: "Проясни свои ценности, внутреннюю опору и то, куда хочется двигаться." },
    },
    takeTest: "Пройти тест", fill: "Заполнить профиль", recommend: "Получить рекомендации",
    saved: "Принято", local: "Профиль на этом экране сохраняется только до закрытия страницы.",
    guidance: "Рекомендации строятся на твоих ответах, а не на диагнозе. Для персонального подбора сначала заполни профиль.",
    academy: "Курсы Академии", reiki: "Бесплатный курс Рейки",
    others: "Другие обучающие программы", open: "Открыть курс", videos: "видео",
  },
  en: {
    heading: "Choose your profile",
    profile: {
      energy: { label: "Health profile", short: "Health", hint: "Energy and wellbeing",
        title: "Health and vital energy", description: "Reflect on how you feel, your sleep and personal resources. Choose where to begin." },
      money: { label: "Money profile", short: "Money", hint: "Income and stability",
        title: "Money and opportunities", description: "Explore your relationship with money, financial stability and changes you hope to make." },
      love: { label: "Relationships profile", short: "Relationships", hint: "Connection and support",
        title: "Relationships and connection", description: "Reflect on trust, communication and the kind of support you need." },
      meaning: { label: "Meaning profile", short: "Meaning", hint: "Values and direction",
        title: "Meaning and life direction", description: "Explore your values, inner support and the direction you want to take." },
    },
    takeTest: "Take a test", fill: "Fill in profile", recommend: "Get recommendations",
    saved: "Accepted", local: "This page keeps profile answers only until you leave.",
    guidance: "Suggestions reflect your answers, not a medical diagnosis. Fill in your profile before requesting personal recommendations.",
    academy: "Academy courses", reiki: "Free Reiki course",
    others: "Other learning programmes", open: "Open course", videos: "videos",
  },
  es: {
    heading: "Elige tu perfil",
    profile: {
      energy: { label: "Perfil de salud", short: "Salud", hint: "Energía y bienestar",
        title: "Salud y energía vital", description: "Explora cómo te sientes, tu descanso y tus recursos personales." },
      money: { label: "Perfil de dinero", short: "Dinero", hint: "Ingresos y estabilidad",
        title: "Dinero y oportunidades", description: "Reflexiona sobre tus finanzas, tu estabilidad y los cambios que deseas." },
      love: { label: "Perfil de relaciones", short: "Relaciones", hint: "Conexión y apoyo",
        title: "Relaciones y conexión", description: "Explora la confianza, la comunicación y el apoyo que necesitas." },
      meaning: { label: "Perfil de sentido", short: "Sentido", hint: "Valores y dirección",
        title: "Sentido y dirección de vida", description: "Aclara tus valores y el rumbo que quieres seguir." },
    },
    takeTest: "Hacer un test", fill: "Completar perfil", recommend: "Ver recomendaciones",
    saved: "Aceptado", local: "Las respuestas de esta pantalla duran solo hasta salir de la página.",
    guidance: "Las sugerencias se basan en tus respuestas, no en un diagnóstico. Completa tu perfil para recibir recomendaciones.",
    academy: "Cursos de la Academia", reiki: "Curso de Reiki gratuito",
    others: "Otros programas de aprendizaje", open: "Abrir curso", videos: "vídeos",
  },
} as const;

export function HolisticSupportCourseProfiles({
  locale, courses, savedSectors, active, onSelect, onTests, onFillProfile, onRecommendations,
}: {
  locale: PublicLocale;
  courses: SupportMobileCourse[];
  savedSectors: Partial<Record<GoalSector, GoalSectorSnapshot>>;
  active: CourseProfileSector;
  onSelect: (sector: CourseProfileSector) => void;
  onTests: () => void;
  onFillProfile: (sector: GoalSector) => void;
  onRecommendations: (sector: GoalSector) => void;
}) {
  const t = content[locale];
  const current = t.profile[active];

  return <section className={styles.root} data-support-course-profiles aria-labelledby="support-course-profiles-title">
    <h2 className={styles.visuallyHidden} id="support-course-profiles-title">{t.heading}</h2>
    <div className={styles.profiles} role="group" aria-label={t.heading}>
      {profiles.map(({ id, Icon }) => <button type="button" key={id} className={styles.profile}
        data-support-profile={id} data-active={active === id} aria-pressed={active === id}
        onClick={() => onSelect(id)}>
        <Icon size={23} aria-hidden="true" />
        <strong>{t.profile[id].label}</strong>
        <small>{t.profile[id].hint}</small>
        {savedSectors[id] ? <span className={styles.accepted} title={t.saved} aria-label={t.saved}>
          <CheckCircle2 size={15} aria-hidden="true" />
        </span> : null}
      </button>)}
    </div>

    <div className={styles.hero} data-support-profile-hero data-sector={active}>
      <Image src="/images/holistic-house/support-mock-hero.webp" alt="" fill
        priority sizes="(max-width: 640px) 100vw, 1100px" className={styles.poster} />
      <div className={styles.overlay} aria-hidden="true" />
      <div className={styles.heroContent}>
        <span className={styles.eyebrow}><Sparkles size={17} aria-hidden="true" />{current.label}</span>
        <h3>{current.title}</h3>
        <p>{current.description}</p>
        <div className={styles.actions}>
          <button type="button" className={styles.primary} data-support-profile-test
            onClick={onTests}><ListChecks size={19} aria-hidden="true" />{t.takeTest}<ArrowRight size={17} aria-hidden="true" /></button>
          <button type="button" data-support-profile-fill
            onClick={() => onFillProfile(active)}><BookOpen size={19} aria-hidden="true" />{t.fill}<ArrowRight size={17} aria-hidden="true" /></button>
          <button type="button" data-support-profile-recommend
            onClick={() => onRecommendations(active)}><Sparkles size={19} aria-hidden="true" />{t.recommend}<ArrowRight size={17} aria-hidden="true" /></button>
        </div>
        <p className={styles.hint}>{t.guidance}</p>
      </div>
    </div>
    <div className={styles.extras} data-support-courses-panel>
      <p className={styles.localNote}><CheckCircle2 size={16} aria-hidden="true" />{t.local}</p>
      <nav className={styles.courseLinks} aria-label={t.academy}>
        <Link href={`/${locale}/academy`} prefetch={false}><BookOpen size={18} aria-hidden="true" />{t.academy}<ArrowRight size={17} aria-hidden="true" /></Link>
        <Link href={`/${locale}/academy/reiki/tantra-reiki/discover`} prefetch={false}><Sparkles size={18} aria-hidden="true" />{t.reiki}<ArrowRight size={17} aria-hidden="true" /></Link>
      </nav>
      {courses.length ? <details className={styles.moreCourses} data-support-mystery-courses>
        <summary>{t.others}<span>{courses.length}</span></summary>
        <div className={styles.originals}>
          {courses.map(course => <Link href={course.href} prefetch={false} key={course.id}>
            <Image src={course.poster} alt="" width={110} height={68} unoptimized loading="lazy" />
            <span><strong>{course.shortTitle}</strong><small>{course.videoCount} {t.videos}</small></span>
            <ArrowRight size={18} aria-hidden="true" />
          </Link>)}
        </div>
      </details> : null}
    </div>
  </section>;
}
