'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight, ArrowUpRight, BookOpenCheck, LockKeyhole } from 'lucide-react'
import { appFetch } from '@/lib/app/client-fetch'
import { getCoursePreset } from '@/lib/inner-growth/course-presets'
import { energyworkLessonRanges, energyworkSequence } from '@/data/academy/energywork-ai-schema'
import styles from './academy-my-courses.module.css'

type Locale = 'en' | 'ru' | 'es'
type GrowthCourse = {
  id: string; title?: string; presetId?: string; focusTags?: string[];
  status?: string; stage?: number; completedLessons?: number; durationDays?: number; isPrimary?: boolean
}
type EnergyworkProgress = {
  enrolled?: boolean; slideId?: string; status?: string; answers?: Record<string, unknown>
}
type Snapshot = {
  locale: Locale; accountId: string | null; courses: GrowthCourse[];
  energywork: EnergyworkProgress | null; incomplete: boolean
}

const sequence = energyworkSequence()
const lessonRanges = energyworkLessonRanges(sequence)
const COPY = {
  en: {
    title: 'My courses', hint: 'Pick up where you left off.', all: 'All my courses',
    main: 'MAIN COURSE', other: 'MY COURSE', reiki: 'Reiki Practitioner',
    day: 'Day', of: 'of', lesson: 'Lesson', slide: 'Slide', intro: 'Introduction',
    completed: 'Completed', paused: 'Paused', setup: 'Course setup', continue: 'Continue course',
    resume: 'Resume from last slide', review: 'Review course', edit: 'Read or edit your Flight to the Sun review',
    empty: 'You have not started a course yet. Explore the free courses below.',
    unavailable: 'Some course progress is temporarily unavailable. You can open your courses in the cabinet.',
    progress: 'Lessons completed', position: 'Saved slide position',
  },
  ru: {
    title: 'Мои курсы', hint: 'Продолжите с того места, где остановились.', all: 'Все мои курсы',
    main: 'ГЛАВНЫЙ КУРС', other: 'МОЙ КУРС', reiki: 'Практик Рейки',
    day: 'День', of: 'из', lesson: 'Урок', slide: 'Слайд', intro: 'Введение',
    completed: 'Завершён', paused: 'На паузе', setup: 'Настройка курса', continue: 'Продолжить курс',
    resume: 'Продолжить с последнего слайда', review: 'Посмотреть курс', edit: 'Прочитать или изменить отзыв о «Полёте к Солнцу»',
    empty: 'Вы пока не начали ни один курс. Выберите бесплатный курс ниже.',
    unavailable: 'Прогресс некоторых курсов временно недоступен. Откройте список в личном кабинете.',
    progress: 'Пройдено уроков', position: 'Сохранённая позиция',
  },
  es: {
    title: 'Mis cursos', hint: 'Continúa donde lo dejaste.', all: 'Todos mis cursos',
    main: 'CURSO PRINCIPAL', other: 'MI CURSO', reiki: 'Reiki Practitioner',
    day: 'Día', of: 'de', lesson: 'Lección', slide: 'Diapositiva', intro: 'Introducción',
    completed: 'Completado', paused: 'En pausa', setup: 'Preparación del curso', continue: 'Continuar curso',
    resume: 'Continuar desde la última diapositiva', review: 'Revisar curso', edit: 'Leer o editar tu reflexión de Flight to the Sun',
    empty: 'Todavía no has comenzado un curso. Explora los cursos gratuitos más abajo.',
    unavailable: 'Parte del progreso no está disponible. Puedes abrir tus cursos en el área personal.',
    progress: 'Lecciones completadas', position: 'Última diapositiva guardada',
  },
} as const

function growthTitle(course: GrowthCourse, language: 'en' | 'ru', fallback: string) {
  const preset = getCoursePreset(course.presetId)
  if (preset?.title?.[language]) return preset.title[language]
  if (typeof course.title === 'string' && course.title.trim()) return course.title.trim()
  const tags = course.focusTags || []
  if (tags.includes('stress')) return language === 'ru' ? 'ОПОРА · Антистресс' : 'OPORA · Stress Relief'
  if (tags.includes('attention')) return language === 'ru' ? 'Фокус и энергия' : 'Focus & Energy'
  return fallback
}

function GrowthCard({ course, locale, featured }: { course: GrowthCourse; locale: Locale; featured: boolean }) {
  const t = COPY[locale]
  const language = locale === 'ru' ? 'ru' : 'en'
  const duration = course.durationDays === 28 ? 28 : 14
  const completed = Number.isInteger(course.completedLessons)
    ? Math.max(0, Math.min(duration, Number(course.completedLessons))) : null
  const finished = course.status === 'completed'
  const isPracticing = Number(course.stage || 0) === 4
  const subtitle = finished ? t.completed
    : !isPracticing ? t.setup
      : completed === null ? t.continue
        : t.day + ' ' + Math.min(duration, completed + 1) + ' ' + t.of + ' ' + duration
  const href = '/' + language + '/app/course?courseId=' + encodeURIComponent(course.id)
  return <article className={styles.card} data-academy-owned-growth={course.id}>
    <div className={styles.photo}>
      <Image src="/images/holistic-house/course-focus-mountain-boy.webp" alt="" fill
        sizes="(max-width: 430px) 96px, 148px" />
    </div>
    <div className={styles.body}>
      <span className={styles.eyebrow}>{featured ? t.main : t.other}{course.status === 'paused' ? ' · ' + t.paused : ''}</span>
      <h3>{growthTitle(course, language, locale === 'ru' ? 'Мой персональный курс' : locale === 'es' ? 'Mi curso personal' : 'My personal course')}</h3>
      <p>{subtitle}</p>
      {isPracticing && completed !== null ? <div className={styles.track} role="progressbar" aria-label={t.progress}
        aria-valuemin={0} aria-valuemax={duration} aria-valuenow={completed}>
        <span style={{ width: (completed / duration * 100) + '%' }} />
      </div> : null}
      <Link className={styles.action} href={href} prefetch={false}>
        {finished ? t.review : t.continue}<ArrowRight size={16} aria-hidden="true" />
      </Link>
    </div>
  </article>
}

function ReikiCard({ progress, locale }: { progress: EnergyworkProgress; locale: Locale }) {
  const t = COPY[locale]
  const language = locale === 'ru' ? 'ru' : 'en'
  const index = typeof progress.slideId === 'string' ? sequence.indexOf(progress.slideId) : -1
  const range = lessonRanges.find(item => index >= item.start && index < item.end)
  const location = index < 0 ? t.intro : range
    ? t.lesson + ' ' + range.lesson + ' · ' + t.slide + ' ' + (index - range.start + 1) + ' ' + t.of + ' ' + range.count
    : t.intro + ' · ' + t.slide + ' ' + (index + 1) + ' ' + t.of + ' ' + lessonRanges[0].start
  const href = '/' + language + '/academy/principles-of-energywork/learn'
    + (index >= 0 ? '?slide=' + encodeURIComponent(progress.slideId!) : '')
  const finished = progress.status === 'completed'
  return <article className={styles.card} data-academy-owned-reiki>
    <div className={styles.photo}>
      <Image src="/academy/reiki-yggdrasil/source/program-overview.jpg" alt="" fill
        sizes="(max-width: 430px) 96px, 148px" />
    </div>
    <div className={styles.body}>
      <span className={styles.eyebrow}>{finished ? t.completed : t.other}</span>
      <h3>{t.reiki}</h3>
      <p>{location}</p>
      {index >= 0 ? <div className={styles.track} role="progressbar" aria-label={t.position}
        aria-valuemin={0} aria-valuemax={sequence.length}
        aria-valuenow={finished ? sequence.length : index + 1}>
        <span style={{ width: ((finished ? sequence.length : index + 1) / sequence.length * 100) + '%' }} />
      </div> : null}
      <Link className={styles.action} href={href} prefetch={false}>
        {finished ? t.review : t.resume}<ArrowRight size={16} aria-hidden="true" />
      </Link>
      {progress.answers?.['flight-04'] ? <Link className={styles.review} href={'/' + language + '/academy/principles-of-energywork/learn?slide=flight-04'}
        prefetch={false}>{t.edit}<ArrowUpRight size={14} aria-hidden="true" /></Link> : null}
    </div>
  </article>
}

/** Public Academy is static for guests; only the existing private APIs reveal an owner's saved courses. */
export function AcademyMyCourses({ locale }: { locale: Locale }) {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null)
  const current = snapshot?.locale === locale ? snapshot : null
  const t = COPY[locale]
  const language = locale === 'ru' ? 'ru' : 'en'
  useEffect(() => {
    let stopped = false
    let leaving = false
    let generation = 0
    let controller: AbortController | null = null
    const clear = () => { generation++; controller?.abort(); controller = null; setSnapshot(null) }
    async function load() {
      if (stopped || leaving || document.visibilityState === 'hidden') return
      const version = ++generation
      controller?.abort()
      const request = new AbortController()
      controller = request
      const isCurrent = () => !stopped && !leaving && version === generation && !request.signal.aborted
      setSnapshot(null)
      try {
        const boot = await appFetch('bootstrap', undefined, 'GET', { signal: request.signal })
        if (!isCurrent()) return
        if (!boot?.account?.id || boot.account.onboardingState !== 'active') return
        const accountId = boot.account.id as string
        const options = { accountId, signal: request.signal }
        const [growth, reiki] = await Promise.allSettled([
          appFetch('course', undefined, 'GET', options),
          appFetch('academy-energywork', undefined, 'GET', options),
        ])
        if (!isCurrent()) return
        // Prevent a stale private view after sign-out, OAuth switch, or session expiry mid-request.
        const fresh = await appFetch('bootstrap', undefined, 'GET', options)
        if (!isCurrent() || fresh.account.id !== accountId || fresh.account.onboardingState !== 'active') return
        const data = growth.status === 'fulfilled' ? growth.value : null
        const list: GrowthCourse[] = Array.isArray(data?.courses) ? data.courses : data?.course ? [data.course] : []
        const owned = list.filter(item => item && typeof item.id === 'string' && Number(item.stage || 0) > 0)
        const energywork = reiki.status === 'fulfilled' && reiki.value?.enrolled === true
          ? reiki.value as EnergyworkProgress : null
        setSnapshot({ locale, accountId, courses: owned, energywork,
          incomplete: growth.status === 'rejected' || reiki.status === 'rejected' })
      } catch {
        if (isCurrent()) clear() // Never interpret an auth or network error as an empty account.
      }
    }
    const hide = () => { leaving = true; clear() }
    const show = () => { leaving = false; void load() }
    const focus = () => { void load() }
    const visibility = () => { if (document.visibilityState === 'hidden') clear(); else void load() }
    let channel: BroadcastChannel | undefined
    try {
      channel = new BroadcastChannel('hh-app-session')
      channel.onmessage = event => { if (event.data === 'signed-out') clear() }
    } catch { /* Private identity must not depend on browser storage. */ }
    window.addEventListener('pagehide', hide)
    window.addEventListener('pageshow', show)
    window.addEventListener('focus', focus)
    document.addEventListener('visibilitychange', visibility)
    void load()
    return () => {
      stopped = true; clear(); channel?.close()
      window.removeEventListener('pagehide', hide)
      window.removeEventListener('pageshow', show)
      window.removeEventListener('focus', focus)
      document.removeEventListener('visibilitychange', visibility)
    }
  }, [locale])

  if (!current?.accountId) return null
  const active = current.courses.filter(item => !['archived', 'closed'].includes(item.status || ''))
    .sort((a, b) => Number(Boolean(b.isPrimary)) - Number(Boolean(a.isPrimary))
      || Number(b.status !== 'completed') - Number(a.status !== 'completed'))
  const first = active[0]
  const rest = active.slice(1)
  const hasCourses = active.length > 0 || Boolean(current.energywork)
  return <section className={styles.section} id="academy-my-courses" data-academy-my-courses aria-labelledby="academy-my-courses-title">
    <div className={styles.heading}>
      <div><span className={styles.kicker}><BookOpenCheck size={15} aria-hidden="true" />HOLISTIC HOUSE</span>
        <h2 id="academy-my-courses-title">{t.title}</h2><p>{t.hint}</p></div>
      <Link href={'/' + language + '/app/course'} prefetch={false} className={styles.all}>
        {t.all}<ArrowUpRight size={16} aria-hidden="true" /></Link>
    </div>
    {hasCourses ? <div className={styles.cards}>
      {first ? <GrowthCard course={first} locale={locale} featured /> : null}
      {current.energywork ? <ReikiCard progress={current.energywork} locale={locale} /> : null}
      {rest.map(course => <GrowthCard key={course.id} course={course} locale={locale} featured={false} />)}
    </div> : !current.incomplete ? <p className={styles.empty}><LockKeyhole size={15} aria-hidden="true" />{t.empty}</p> : null}
    {current.incomplete ? <p className={styles.warning} role="status">{t.unavailable}</p> : null}
  </section>
}
