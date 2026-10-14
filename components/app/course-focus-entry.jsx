'use client'

import { useEffect, useRef, useState } from 'react'
import { ArrowRight, BookOpen, CheckCircle2, Clock3, Heart, Leaf, X } from 'lucide-react'
import styles from './course-focus-entry.module.css'

/**
 * Course focus entry v2: one fullscreen, single-action landing for an active
 * course. All private progress comes from the authoritative course/today API.
 * Intro acknowledgement is non-sensitive browser UI preference only.
 */
export default function CourseFocusEntry({
  locale = 'en', cycle, lesson, progress, programme, completed = false,
  finished = false, busy = false, onStart, onExit,
}) {
  const ru = locale === 'ru'
  const [isFirstVisit, setIsFirstVisit] = useState(true)
  const primaryRef = useRef(null)
  const duration = Number(cycle?.durationDays) || 14
  const currentDay = Math.min(duration, Math.max(1, Number(cycle?.day) || 1))
  const completedCount = Math.min(duration, Math.max(0, Number(progress?.practiceCount) || 0))
  const currentTitle = lesson?.title || lesson?.journey?.heading ||
    (ru ? 'Мой сегодняшний шаг' : 'My step for today')
  const courseTitle = programme?.title || (ru ? 'Мой ритм энергии' : 'My rhythm of energy')
  const savedDay = completed || finished
  const title = isFirstVisit
    ? (ru ? 'Добро пожаловать на курс!' : 'Welcome to your course!')
    : savedDay
      ? (ru ? 'Ваш шаг завершён' : 'Your step is complete')
      : (ru ? 'Продолжим ваш путь' : 'Continue your journey')
  const button = finished
    ? (ru ? 'Посмотреть итоги курса' : 'Review my course')
    : completed
      ? (ru ? 'Посмотреть мой путь' : 'See my journey')
      : isFirstVisit
        ? (ru ? 'Начать первый урок' : 'Start my first lesson')
        : (ru ? 'Продолжить урок' : 'Continue my lesson')
  const storageKey = 'hh-course-focus-welcomed-v2:' + String(cycle?.id || 'unknown')

  useEffect(() => {
    try { setIsFirstVisit(window.localStorage.getItem(storageKey) !== 'yes') }
    catch { setIsFirstVisit(true) }
  }, [storageKey])
  useEffect(() => { primaryRef.current?.focus({ preventScroll: true }) }, [])
  useEffect(() => {
    const oldOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = oldOverflow }
  }, [])

  function start() {
    try { window.localStorage.setItem(storageKey, 'yes') } catch {}
    setIsFirstVisit(false)
    onStart?.()
  }

  return <section
    className={styles.overlay} role="dialog" aria-modal="true"
    aria-label={ru ? 'Полноэкранный режим курса' : 'Full-screen course focus'}
    data-course-focus-active data-course-focus-entry
    onKeyDown={event => { if (event.key === 'Escape') onExit?.() }}
  >
    <div className={styles.page}>
      <div className={styles.top}>
        <span className={styles.brand}>Holistic House <small>{ru ? 'МОЙ КУРС' : 'MY COURSE'}</small></span>
        <button type="button" className={styles.close} onClick={onExit}
          aria-label={ru ? 'Выйти к моим курсам' : 'Back to my courses'}>
          <X size={22} aria-hidden="true"/>
        </button>
      </div>
      <div className={styles.main}>
        <p className={styles.eyebrow}>{ru ? 'Маленькие шаги — большие перемены' : 'Small steps. Meaningful changes.'}</p>
        <h1 className={styles.title}>{title}</h1>
        <p className={styles.intro}>{ru
          ? 'Короткие практики и понятные задания — в вашем собственном темпе.'
          : 'Short lessons and simple activities, at your own pace.'}</p>
        <div className={styles.scenery}>
          <img src="/images/holistic-house/course-focus-mountain-boy.webp"
            alt="" width="705" height="411" loading="eager" decoding="async"/>
          <div className={styles.sceneryTint} aria-hidden="true"/>
        </div>
        <div className={styles.courseMeta}>
          <span className={styles.pill}><Leaf size={14} aria-hidden="true"/>{ru ? 'ВАШ КУРС' : 'YOUR COURSE'}</span>
          <h2>{courseTitle}</h2>
          <div className={styles.dayRow}>
            <strong>{ru ? 'День ' : 'Day '}{currentDay}{ru ? ' из ' : ' of '}{duration}</strong>
            <span>{completedCount}/{duration} {ru ? 'пройдено' : 'completed'}</span>
          </div>
          <progress max={duration} value={completedCount}
            aria-label={ru ? 'Завершённые уроки' : 'Completed lessons'} />
          <p className={styles.lessonTitle}>
            {savedDay ? <CheckCircle2 size={18} aria-hidden="true"/> : <BookOpen size={18} aria-hidden="true"/>}
            {currentTitle}
          </p>
          <p className={styles.lessonHint}>{ru
            ? 'Сегодня: познакомьтесь с темой, попробуйте практику и отметьте свои наблюдения.'
            : 'Today: explore the topic, try a practice, and reflect on what you notice.'}</p>
          <div className={styles.benefits} aria-label={ru ? 'Как устроен курс' : 'How the course works'}>
            <span><Clock3 size={18} aria-hidden="true"/>{ru ? 'Небольшие уроки' : 'Short lessons'}</span>
            <span><Heart size={18} aria-hidden="true"/>{ru ? 'Бережный подход' : 'Gentle pace'}</span>
            <span><Leaf size={18} aria-hidden="true"/>{ru ? 'Прогресс без спешки' : 'Your own rhythm'}</span>
          </div>
        </div>
      </div>
      <div className={styles.bottom}>
        <button ref={primaryRef} type="button" className={styles.primary}
          disabled={busy} onClick={start} data-course-focus-primary>
          {button}<ArrowRight size={24} aria-hidden="true"/>
        </button>
        <p>{ru ? 'Можно остановиться и продолжить позже' : 'Pause and return whenever you like'}</p>
      </div>
    </div>
  </section>
}
