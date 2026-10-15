'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, BookOpenCheck, LockKeyhole, Plus, Sparkles } from 'lucide-react'
import { appFetch } from '@/lib/app/client-fetch'
import styles from './public-growth-courses.module.css'

type Locale = 'ru' | 'en'
type Course = { id?: string; stage?: number; focusTags?: string[] }
type CourseResponse = { course?: Course | null }
type CourseProgress = { courseId?: string; progress?: { practiceCount?: number } }
type CabinetSnapshot = { locale: Locale; loaded: boolean; course: Course | null; completed: number | null }

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
    go: 'Начать Антистресс', signIn: 'Войдите, чтобы начать курс «ОПОРА — Антистресс»',
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
    go: 'Start Stress Relief', signIn: 'Sign in to start OPORA Stress Relief',
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
  const [snapshot, setSnapshot] = useState<CabinetSnapshot | null>(null)
  // A locale/navigation render cannot briefly reuse the previous private view.
  const current = snapshot?.locale === locale ? snapshot : null
  const loaded = current?.loaded || false
  const course = current?.course || null
  const completed = current?.completed ?? null
  const courseUrl = '/' + locale + '/app/course'

  useEffect(() => {
    let stopped = false, leaving = false, generation = 0
    let controller: AbortController | null = null
    const empty = (loaded: boolean): CabinetSnapshot => ({ locale, loaded, course: null, completed: null })
    function clear(loaded = false) {
      generation += 1
      controller?.abort()
      controller = null
      setSnapshot(empty(loaded))
    }
    async function load() {
      if (stopped || leaving || document.visibilityState === 'hidden') return
      const version = ++generation
      controller?.abort()
      const request = new AbortController()
      controller = request
      const isCurrent = () => !stopped && !leaving && generation === version && !request.signal.aborted
      setSnapshot(empty(false))
      try {
        const bootstrap = await appFetch('bootstrap', undefined, 'GET', { signal: request.signal })
        if (!isCurrent() || bootstrap.account.onboardingState !== 'active' || !bootstrap.account.id) return
        const accountId = bootstrap.account.id
        const options = { accountId, signal: request.signal }
        const data: CourseResponse = await appFetch('course', undefined, 'GET', options)
        if (!isCurrent()) return
        const owned = typeof data?.course?.id === 'string' && data.course.id && Number(data.course.stage || 0) > 0 ? data.course : null
        let completed: number | null = null
        if (owned?.stage === 4) {
          const details: CourseProgress = await appFetch('course/progress?locale=' + encodeURIComponent(locale)
            + '&courseId=' + encodeURIComponent(owned.id!), undefined, 'GET', options)
          if (!isCurrent()) return
          if (details?.courseId !== owned.id) throw new Error('COURSE_CHANGED')
          if (Number.isInteger(details?.progress?.practiceCount)) {
            completed = Math.max(0, Math.min(14, Number(details.progress?.practiceCount)))
          }
        }
        // The cookie/session may change while an already-authorized read is in flight.
        const fresh = await appFetch('bootstrap', undefined, 'GET', options)
        if (!isCurrent()) return
        if (fresh.account.id !== accountId || fresh.account.onboardingState !== 'active') throw new Error('ACCOUNT_CHANGED')
        setSnapshot({ locale, loaded: true, course: owned, completed })
      } catch {
        // Public page stays usable when the visitor has not signed in.
        if (isCurrent()) setSnapshot(empty(true))
      } finally {
        if (isCurrent()) setSnapshot(value => value?.locale === locale ? { ...value, loaded: true } : empty(true))
      }
    }
    const hide = () => { leaving = true; clear() }
    const show = () => { leaving = false; void load() }
    const focus = () => { void load() }
    const visibility = () => { if (document.visibilityState === 'hidden') clear(); else void load() }
    let channel: BroadcastChannel | undefined
    try {
      channel = new BroadcastChannel('hh-app-session')
      channel.onmessage = event => { if (event.data === 'signed-out') clear(true) }
    } catch { /* No browser storage or persistent fallback. */ }
    window.addEventListener('pagehide', hide)
    window.addEventListener('pageshow', show)
    window.addEventListener('focus', focus)
    document.addEventListener('visibilitychange', visibility)
    void load()
    return () => {
      stopped = true; generation += 1; controller?.abort(); channel?.close()
      window.removeEventListener('pagehide', hide)
      window.removeEventListener('pageshow', show)
      window.removeEventListener('focus', focus)
      document.removeEventListener('visibilitychange', visibility)
    }
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
          <h3>{hasCourse ? courseTitle(course!, t) : t.stress}</h3>
          <p>{!loaded ? t.loading : hasCourse
            ? stage === 4 && completed !== null
              ? completed === 14 ? t.complete : t.day + ' ' + nextLesson + ' ' + t.of + ' 14'
              : stage === 4 ? t.progress : t.setup
            : t.signIn}</p>
          {hasCourse && stage === 4 && completed !== null && <div className={styles.ownedProgress}
            role="progressbar" aria-label={t.progress} aria-valuemin={0} aria-valuemax={14} aria-valuenow={completed}>
            <span style={{ width: (completed / 14 * 100) + '%' }} />
          </div>}
          <Link href={hasCourse ? courseUrl : courseUrl + '?program=stress'} prefetch={false} className={styles.ownedAction}>
            {hasCourse ? stage !== 4 ? t.setup : completed === 14 ? t.review : t.continue : t.go}
            <ArrowRight size={17} aria-hidden="true" />
          </Link>
        </div>
      </article>
      <Link href={courseUrl + (hasCourse ? '?add=1' : '?program=stress')} prefetch={false}
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
