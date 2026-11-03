'use client'

import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight, LockKeyhole } from 'lucide-react'
import { antiStressBlueprint } from '@/lib/inner-growth/anti-stress-blueprint'
import styles from './opora-first-week-invite.module.css'

// Pre-enrolment preview: labels come from the existing versioned V7 day map,
// not from a second, manually maintained list of lessons.
const COPY = {
  ru: {
    kicker: 'ОПОРА · ПЕРЕД ЗАПИСЬЮ',
    title: 'Что вас ждёт в первую неделю?',
    lead: 'За 14 дней вы познакомитесь с семью способами бережной самоподдержки. Сначала — по одному навыку в день, затем — повторение с большей самостоятельностью.',
    week: 'Первые 7 дней · темы уроков',
    note: 'Ниже — базовая программа. После 8 вопросов Weekly Pulse вы сможете выбрать подходящий учебный маршрут. Дополнительные тесты необязательны.',
    guest: 'Мне интересно — войти для записи',
    accept: 'Да, хочу записаться на курс',
    saving: 'Открываем запись…',
    privacy: 'Первый курс бесплатно. Никакой автоматической записи: личные данные и прогресс сохраняются только после входа и подтверждения.',
    explore: 'Подробнее о программе',
    alt: 'Спокойный горный пейзаж',
    retry: 'Попробовать снова',
  },
  en: {
    kicker: 'OPORA · BEFORE ENROLLING',
    title: 'What will you learn in week one?',
    lead: 'Over 14 days you will explore seven gentle self-support skills: one new skill each day, then another week to practise with more independence.',
    week: 'Days 1–7 · lesson topics',
    note: 'This is the core programme. Eight Weekly Pulse questions help you choose a suitable learning path. Other assessments are optional.',
    guest: "I'm interested — sign in to enrol",
    accept: "Yes, I'd like to enrol",
    saving: 'Opening enrolment…',
    privacy: 'Your first course is free. No automatic enrolment: your choices and progress are saved privately only after sign-in and confirmation.',
    explore: 'Read the full programme',
    alt: 'Peaceful mountain landscape',
    retry: 'Try again',
  },
  es: {
    kicker: 'OPORA · ANTES DE INSCRIBIRTE',
    title: '¿Qué aprenderás en la primera semana?',
    lead: 'Durante 14 días conocerás siete recursos de apoyo: uno por día y otra semana para practicarlos con más autonomía.',
    week: 'Días 1–7 · temas de las lecciones',
    note: 'Este es el programa básico. Ocho preguntas del Weekly Pulse ayudan a elegir tu ruta. Las otras pruebas son opcionales.',
    guest: 'Me interesa — entrar para inscribirme',
    accept: 'Sí, quiero inscribirme',
    saving: 'Preparando la inscripción…',
    privacy: 'Tu primer curso es gratuito. Sin inscripción automática: tus elecciones y avances se guardan solo tras iniciar sesión y confirmar.',
    explore: 'Ver el programa completo',
    alt: 'Paisaje tranquilo de montaña',
    retry: 'Intentar de nuevo',
  },
}

export default function OporaFirstWeekInvite({
  locale = 'en', onAccept, busy = false, signedOut = false, disabled = false,
  errorMessage, onRetry,
}) {
  const lang = COPY[locale] ? locale : 'en'
  const t = COPY[lang]
  const firstWeek = antiStressBlueprint(lang).days.slice(0, 7)
  return <section className={styles.slide} data-opora-first-week-intro data-opora-week-one-count={firstWeek.length}
    aria-labelledby="opora-week-one-title">
    <header className={styles.header}>
      <div className={styles.intro}>
        <span className={styles.kicker}>{t.kicker}</span>
        <h1 id="opora-week-one-title">{t.title}</h1>
        <p>{t.lead}</p>
      </div>
      <Image className={styles.photo} src="/images/holistic-house/course-focus-mountain-boy.webp"
        width={120} height={120} alt={t.alt} sizes="(max-width: 430px) 64px, 120px" />
    </header>
    <div className={styles.week}>
      <h2>{t.week}</h2>
      <ol className={styles.days}>
        {firstWeek.map((lesson) => <li key={lesson.day} data-opora-preview-day={lesson.day}>
          <span className={styles.dayNumber}>{String(lesson.day).padStart(2, '0')}</span>
          <strong>{lesson.title}</strong>
        </li>)}
      </ol>
    </div>
    <p className={styles.routeNote}>{t.note}</p>
    {errorMessage && <p className={styles.error} role="alert">{errorMessage}
      {onRetry && <button type="button" onClick={onRetry}>{t.retry}</button>}</p>}
    <button className={styles.accept} type="button" disabled={busy || disabled}
      onClick={onAccept} data-opora-week-one-accept
      data-opora-fast-consent={signedOut ? undefined : ''}
      data-course-google-signin={signedOut ? '' : undefined}>
      <span>{busy ? t.saving : signedOut ? t.guest : t.accept}</span>
      <ArrowRight size={18} aria-hidden="true" />
    </button>
    <p className={styles.privacy}><LockKeyhole size={15} aria-hidden="true" />{t.privacy}</p>
    <Link className={styles.explore} href={`/${lang}/courses/antistress`}>{t.explore}</Link>
  </section>
}
