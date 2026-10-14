'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, BookOpenCheck, LockKeyhole, Plus, Sparkles } from 'lucide-react'
import styles from './public-growth-courses.module.css'

type Locale = 'ru' | 'en'
type Course = { id?: string; stage?: number; focusTags?: string[] }
type CourseResponse = { course?: Course | null }
type CourseProgress = { progress?: { practiceCount?: number } }

const copy = {
  ru: {
    eyebrow: 'ЛИЧНЫЙ КАБИНЕТ', title: 'Мои программы',
    description: 'Продолжайте с того места, где остановились.',
    current: 'ТЕКУЩИЙ КУРС', personal: 'Мой персональный курс',
    stress: 'Антистресс', confidence: 'Внутренняя уверенность',
    focus: 'Фокус и энергия', continue: 'Продолжить курс',
    setup: 'Продолжить настройку', review: 'Посмотреть курс',
    add: 'Добавить новый курс', addHint: 'Другой маршрут — через условия подписки',
    first: 'Начать первый курс', firstHint: 'Один курс доступен бесплатно',
    day: 'Урок', of: 'из', complete: 'Завершено', progress: 'Прогресс',
    loading: 'Загружаем ваши курсы…',
    go: 'Открыть личный кабинет', signIn: 'Войдите, чтобы увидеть свой курс',
    free: 'Первый курс бесплатно', badge: '14 дней · ваш темп',
  },
  en: {
    eyebrow: 'PRIVATE CABINET', title: 'My programmes',
    description: 'Pick up right where you left off.',
    current: 'CURRENT COURSE', personal: 'My personal course',
    stress: 'Stress Relief', confidence: 'Inner Confidence',
    focus: 'Focus & Energy', continue: 'Continue course',
    setup: 'Continue setup', review: 'Review course',
    add: 'Add another course', addHint: 'Additional journeys are subject to your plan',
    first: 'Start my first course', firstHint: 'Your first course is free',
    day: 'Lesson', of: 'of', complete: 'Completed', progress: 'Progress',
    loading: 'Loading your courses…',
    go: 'Open my cabinet', signIn: 'Sign in to see your current course',
    free: 'First course free', badge: '14 days · your pace',
  },
} as const

function courseTitle(course: Course, t: typeof copy.ru | typeof copy.en) {
  const tags = course.focusTags || []
  if (tags.includes('attention')) return t.focus
  if (tags.includes('relationships') && tags.includes('resources')) return t.confidence
  if (tags.includes('stress') && tags.includes('mood')) return t.stress
  return t.personal
}

export function PublicCourseCabinet({ locale }: { locale: Locale }) {
  const t = copy[locale] || copy.en
  const [loaded, setLoaded] = useState(false)
  const [course, setCourse] = useState<Course | null>(null)
  const [completed, setCompleted] = useState<number | null>(null)
  const courseUrl = '/' + locale + '/app/course'

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const response = await fetch('/api/app/course', { credentials: 'same-origin', cache: 'no-store' })
        if (!response.ok) return
        const data: CourseResponse = await response.json()
        const owned = data?.course && Number(data.course.stage || 0) > 0 ? data.course : null
        if (cancelled) return
        setCourse(owned)
        if (owned?.stage !== 4) return
        const progressResponse = await fetch('/api/app/course/progress?locale=' + encodeURIComponent(locale), {
          credentials: 'same-origin', cache: 'no-store',
        })
        if (!progressResponse.ok) return
        const details: CourseProgress = await progressResponse.json()
        if (!cancelled && Number.isInteger(details?.progress?.practiceCount)) {
          setCompleted(Math.max(0, Math.min(14, Number(details.progress?.practiceCount))))
        }
      } catch {
        // Public page stays usable when the visitor has not signed in.
      } finally {
        if (!cancelled) setLoaded(true)
      }
    }
    void load()
    return () => { cancelled = true }
  }, [locale])

  const stage = course?.stage || 0
  const hasCourse = stage > 0
  const nextLesson = completed === null ? null : Math.min(14, completed + 1)

  return <section className={styles.cabinetSection} aria-labelledby="public-course-cabinet-title" data-course-cabinet>
    <div className={styles.cabinetHeading}>
      <p className={styles.sectionKicker}><Sparkles size={15} aria-hidden="true" /> {t.eyebrow}</p>
      <h2 id="public-course-cabinet-title">{t.title}</h2>
      <p>{t.description}</p>
    </div>
    <div className={styles.cabinetGrid}>
      <article className={styles.ownedCard}>
        <div className={styles.ownedImage} aria-hidden="true">
          <img src="/images/holistic-house/course-focus-mountain-boy.webp" alt="" width={260} height={260} loading="lazy" decoding="async" />
        </div>
        <div className={styles.ownedCopy}>
          <span className={styles.ownedEyebrow}><BookOpenCheck size={15} aria-hidden="true" /> {hasCourse ? t.current : t.badge}</span>
          <h3>{hasCourse ? courseTitle(course!, t) : t.personal}</h3>
          <p>{!loaded ? t.loading : hasCourse
            ? stage === 4 && completed !== null
              ? completed === 14 ? t.complete : t.day + ' ' + nextLesson + ' ' + t.of + ' 14'
              : stage === 4 ? t.progress : t.setup
            : t.signIn}</p>
          {hasCourse && stage === 4 && completed !== null && <div className={styles.ownedProgress}
            role="progressbar" aria-label={t.progress} aria-valuemin={0} aria-valuemax={14} aria-valuenow={completed}>
            <span style={{ width: (completed / 14 * 100) + '%' }} />
          </div>}
          <Link href={courseUrl} prefetch={false} className={styles.ownedAction}>
            {hasCourse ? stage !== 4 ? t.setup : completed === 14 ? t.review : t.continue : t.go}
            <ArrowRight size={17} aria-hidden="true" />
          </Link>
        </div>
      </article>
      <Link href={courseUrl + (hasCourse ? '?add=1' : '')} prefetch={false}
        className={styles.addCourseTile} data-public-add-course>
        <span className={styles.addCourseIcon}><Plus size={26} strokeWidth={1.7} aria-hidden="true" /></span>
        <span className={styles.addCourseCopy}>
          <strong>{hasCourse ? t.add : t.first}</strong>
          <small>{hasCourse ? t.addHint : t.firstHint}</small>
        </span>
        <ArrowRight className={styles.addCourseArrow} size={19} aria-hidden="true"/>
      </Link>
    </div>
    <p className={styles.privacyLine}><LockKeyhole size={14} aria-hidden="true"/> {t.free}</p>
  </section>
}
