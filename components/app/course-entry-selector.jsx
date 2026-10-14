'use client'

import { useEffect, useRef, useState } from 'react'
import { ArrowRight, BookOpen, Check, Crown, LockKeyhole, Plus, ShieldCheck, Sparkles, X } from 'lucide-react'
import { GROWTH_GOALS, COURSE_TOPICS } from '@/lib/inner-growth/course-model'
import { courseProgramFromTopics } from '@/lib/inner-growth/course-programs'
import styles from './course-entry-selector.module.css'

const COPY = {
  en: {
    eyebrow: 'MY COURSES · HOLISTIC HOUSE',
    title: 'My courses', intro: 'Your personal path, at your own pace.',
    count: 'active course', current: 'CURRENT COURSE', defaultCourse: 'My personal course',
    setup: 'Setting up your course', programme: '14-day learning journey', focus: 'My development directions',
    lesson: 'Day', of: 'of', completed: 'Lessons completed', loading: 'Loading progress…',
    continue: 'Continue course', completeSetup: 'Continue setup', review: 'Review my course',
    add: 'Add a new course', first: 'Start my first course',
    addNote: 'A new topic and its own 14-day journey', firstNote: 'Choose a topic or create your personal plan',
    freeLimit: 'Free · 1 active course', currentLimit: 'The current course remains available for free.',
    upgrade: 'Add another learning journey', upgradeNote: 'One course at a time is included in Free and Start. Advanced and Premium are designed for up to five courses in parallel.',
    plans: 'Membership plans', start: 'Start', advanced: 'Advanced', premium: 'Premium',
    one: '1 active course', five: 'Up to 5 active courses', noAds: 'No ads',
    tests: 'Included tests', session: '1 personal session per month',
    perMonth: '/month', recommended: 'BEST FOR MULTIPLE COURSES',
    unavailable: 'Subscription checkout is not available yet. No payment will be taken on this screen.',
    conditions: 'Premium session scheduling and included-test terms will be confirmed before purchase.',
    close: 'Not now',
  },
  ru: {
    eyebrow: 'МОИ КУРСЫ · HOLISTIC HOUSE',
    title: 'Мои курсы', intro: 'Ваш путь развития — в собственном темпе.',
    count: 'активный курс', current: 'ТЕКУЩИЙ КУРС', defaultCourse: 'Мой персональный курс',
    setup: 'Настройка курса', programme: '14-дневный курс развития', focus: 'Направления моей работы',
    lesson: 'День', of: 'из', completed: 'Уроков завершено', loading: 'Загружаем прогресс…',
    continue: 'Продолжить курс', completeSetup: 'Продолжить настройку', review: 'Посмотреть мой курс',
    add: 'Добавить новый курс', first: 'Начать первый курс',
    addNote: 'Ещё одна тема и отдельный путь на 14 дней', firstNote: 'Выберите тему или создайте персональный курс',
    freeLimit: 'Free · 1 активный курс', currentLimit: 'Текущий курс остаётся доступен бесплатно.',
    upgrade: 'Добавить ещё один курс', upgradeNote: 'В Free и Start доступен один активный курс. Advanced и Premium рассчитаны на пять параллельных курсов.',
    plans: 'Тарифы подписки', start: 'Start', advanced: 'Advanced', premium: 'Premium',
    one: '1 активный курс', five: 'До 5 активных курсов', noAds: 'Без рекламы',
    tests: 'Тесты включены', session: '1 персональная сессия в месяц',
    perMonth: '/мес.', recommended: 'ДЛЯ НЕСКОЛЬКИХ КУРСОВ',
    unavailable: 'Оформление подписки пока недоступно. На этом экране оплата не списывается.',
    conditions: 'Условия записи на сессию и перечень включённых тестов будут подтверждены до оплаты.',
    close: 'Не сейчас',
  },
}

function courseTitle(course, locale, t) {
  const program = courseProgramFromTopics(course?.focusTags)
  if (program) return program.title[locale]
  const goal = (course?.goals || []).find(key => GROWTH_GOALS[key])
  if (goal) return GROWTH_GOALS[goal].title[locale]
  const topic = COURSE_TOPICS.find(item => course?.focusTags?.includes(item.id))
  return topic?.title?.[locale] || t.defaultCourse
}

const PLANS = [
  { id: 'start', price: 10, spots: 'one', items: ['noAds'] },
  { id: 'advanced', price: 20, spots: 'five', items: ['noAds'] },
  { id: 'premium', price: 100, spots: 'five', items: ['noAds', 'tests', 'session'] },
]

export default function CourseEntrySelector({ course, locale = 'en', onOpen }) {
  const t = COPY[locale] || COPY.en
  const hasCourse = Boolean(course?.stage > 0)
  const [daily, setDaily] = useState(null)
  const [progressError, setProgressError] = useState(false)
  const dialogRef = useRef(null)

  useEffect(() => {
    if (!hasCourse || course.stage !== 4) return
    let cancelled = false
    fetch('/api/app/course/progress?locale=' + encodeURIComponent(locale), {
      credentials: 'same-origin', cache: 'no-store',
    }).then(response => {
      if (!response.ok) throw new Error('COURSE_PROGRESS_UNAVAILABLE')
      return response.json()
    }).then(result => {
      if (!cancelled) setDaily(result)
    }).catch(() => {
      if (!cancelled) setProgressError(true)
    })
    return () => { cancelled = true }
  }, [hasCourse, course?.id, course?.stage, locale])

  const completed = Number.isInteger(daily?.progress?.practiceCount)
    ? Math.max(0, Math.min(14, daily.progress.practiceCount)) : null
  // A day is complete only after a saved lesson, not when a calendar day passes.
  const nextLesson = completed === null ? null : Math.min(14, completed + 1)
  const axes = (course?.goals || []).filter(key => GROWTH_GOALS[key])
    .slice(0, 3).map(key => GROWTH_GOALS[key].title[locale])
  const name = courseTitle(course, locale, t)

  function addCourse() {
    if (!hasCourse) { onOpen(); return }
    // Never grant paid entitlements or create parallel courses in the browser.
    // The existing server currently supports only one course per account.
    dialogRef.current?.showModal()
  }

  return <div className={styles.page} data-my-course data-course-selector>
    <header className={styles.header}>
      <span className={styles.eyebrow}><Sparkles size={15} aria-hidden="true"/>{t.eyebrow}</span>
      <div className={styles.headline}>
        <h1>{t.title}</h1>
        <span className={styles.limitPill}><BookOpen size={16} aria-hidden="true"/>{hasCourse ? '1 / 1' : '0 / 1'}</span>
      </div>
      <p>{t.intro}</p>
    </header>

    <section className={styles.tiles} aria-label={t.title}>
      {hasCourse && <article className={styles.current} data-current-course-card>
        <div className={styles.currentTop}>
          <span className={styles.currentIcon} aria-hidden="true"><ShieldCheck size={27} strokeWidth={1.8}/></span>
          <div className={styles.currentText}>
            <span className={styles.overline}>{t.current}</span>
            <h2>{name}</h2>
            <p>{t.programme}</p>
          </div>
        </div>
        {axes.length > 0 && <div className={styles.axes} aria-label={t.focus}>
          {axes.map(axis => <span key={axis}><Check size={13} aria-hidden="true"/>{axis}</span>)}
        </div>}
        <div className={styles.progressInfo}>
          <span>{course.stage === 4 && nextLesson !== null
            ? completed === 14 ? t.completed : t.lesson + ' ' + nextLesson + ' ' + t.of + ' 14'
            : t.setup}</span>
          {course.stage === 4 && <strong>{completed === null ? '— / 14' : completed + ' / 14'}</strong>}
        </div>
        <div className={styles.progressTrack} role={completed !== null ? 'progressbar' : undefined}
          aria-label={t.completed} aria-valuemin={completed !== null ? 0 : undefined}
          aria-valuenow={completed ?? undefined} aria-valuemax={completed !== null ? 14 : undefined}>
          <span style={{ width: completed === null ? '0%' : (completed / 14 * 100) + '%' }}/>
        </div>
        {course.stage === 4 && completed === null && !progressError && <small className={styles.loading}>{t.loading}</small>}
        <button type="button" className={styles.openButton} onClick={onOpen}>
          {course.stage !== 4 ? t.completeSetup : completed === 14 ? t.review : t.continue}
          <ArrowRight size={19} aria-hidden="true"/>
        </button>
      </article>}

      <button type="button" className={styles.addTile} onClick={addCourse} data-add-course>
        <span className={styles.plusIcon}><Plus size={27} strokeWidth={1.8} aria-hidden="true"/></span>
        <strong>{hasCourse ? t.add : t.first}</strong>
        <small>{hasCourse ? t.addNote : t.firstNote}</small>
      </button>
    </section>

    <p className={styles.footnote}><LockKeyhole size={15} aria-hidden="true"/>
      {hasCourse ? t.freeLimit + ' · ' + t.currentLimit : t.freeLimit}
    </p>

    <dialog ref={dialogRef} className={styles.dialog} aria-labelledby="course-upgrade-title"
      data-course-subscription-dialog>
      <div className={styles.dialogHead}>
        <span className={styles.crown}><Crown size={21} aria-hidden="true"/></span>
        <button type="button" className={styles.closeIcon} onClick={() => dialogRef.current?.close()}
          aria-label={t.close}><X size={22} aria-hidden="true"/></button>
      </div>
      <h2 id="course-upgrade-title">{t.upgrade}</h2>
      <p className={styles.dialogIntro}>{t.upgradeNote}</p>
      <h3>{t.plans}</h3>
      <div className={styles.planGrid}>
        {PLANS.map(plan => <article className={styles.planCard} key={plan.id}
          data-recommended={plan.id === 'advanced'}>
          {plan.id === 'advanced' && <span className={styles.recommended}>{t.recommended}</span>}
          <strong>{t[plan.id]}</strong>
          <div className={styles.price}>€{plan.price}<small>{t.perMonth}</small></div>
          <p><Check size={15} aria-hidden="true"/>{t[plan.spots]}</p>
          {plan.items.map(item => <p key={item}><Check size={15} aria-hidden="true"/>{t[item]}</p>)}
        </article>)}
      </div>
      <p className={styles.unavailable} role="status">{t.unavailable}</p>
      <p className={styles.conditions}>{t.conditions}</p>
      <button type="button" className={styles.closeButton} onClick={() => dialogRef.current?.close()}>{t.close}</button>
    </dialog>
  </div>
}
