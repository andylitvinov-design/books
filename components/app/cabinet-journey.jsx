'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import {
  ArrowRight, BookOpen, Check, ChevronRight, CircleHelp, ClipboardList,
  GraduationCap, LockKeyhole, MessageCircle, PenLine, Sparkles,
} from 'lucide-react'
import { appFetch } from '@/lib/app/client-fetch'
import styles from './cabinet-journey.module.css'

const ICONS = {
  tests: ClipboardList,
  course: BookOpen,
  consultation: MessageCircle,
  master: GraduationCap,
  author: PenLine,
}

const COPY = {
  en: {
    eyebrow: 'MY SPACE · GROWTH ROADMAP',
    title: 'Your path',
    intro: 'From your first discoveries to your own course.',
    xp: 'XP earned', progress: 'Milestones completed',
    step: 'Step', of: 'of', here: 'You are here', next: 'Your next step',
    done: 'Done', upcoming: 'Ahead', now: 'Now',
    allDone: 'Your journey is complete', allDoneText: 'Keep sharing what you have learned.',
    allDoneAction: 'My Practice',
    loading: 'Loading your saved progress…',
    unavailable: 'Your progress could not be loaded. No points were changed.',
    retry: 'Try again',
    testsUnit: 'tests',
    courseDone: 'Course finished',
    consultationSent: 'Request sent', consultationHint: 'Not a confirmed appointment',
    masterApproved: 'Approved', masterPending: 'Review pending',
    courseDraft: 'Draft saved', coursePublished: 'Published',
    pointsNote: 'Points reward participation, not health or qualifications. A request is not a booked session. Master access requires approval.',
    details: 'How are points counted?',
    stages: [
      { id: 'tests', title: 'Discover yourself', hint: '3 free tests', action: 'Take free tests' },
      { id: 'course', title: 'Learn a skill', hint: 'Free Reiki course', action: 'Start free course' },
      { id: 'consultation', title: 'Personal guidance', hint: 'Free introduction request', action: 'Request an introduction' },
      { id: 'master', title: 'Become a master', hint: 'Apply and get approved', action: 'Open My Practice' },
      { id: 'author', title: 'Create your course', hint: 'Draft and publish', action: 'Open course editor' },
    ],
  },
  ru: {
    eyebrow: 'МОЁ ПРОСТРАНСТВО · ПУТЬ РАЗВИТИЯ',
    title: 'Твой путь',
    intro: 'От первых открытий — к собственному курсу.',
    xp: 'Накоплено XP', progress: 'Пройдено шагов',
    step: 'Шаг', of: 'из', here: 'Ты сейчас здесь', next: 'Твой следующий шаг',
    done: 'Готово', upcoming: 'Впереди', now: 'Сейчас',
    allDone: 'Все шаги пройдены', allDoneText: 'Продолжай делиться своими знаниями.',
    allDoneAction: 'Моя практика',
    loading: 'Загружаем сохранённый прогресс…',
    unavailable: 'Не удалось загрузить путь. Баллы не изменились.',
    retry: 'Повторить',
    testsUnit: 'тестов',
    courseDone: 'Курс завершён',
    consultationSent: 'Запрос отправлен', consultationHint: 'Запись ещё не подтверждена',
    masterApproved: 'Одобрен', masterPending: 'На проверке',
    courseDraft: 'Черновик сохранён', coursePublished: 'Опубликован',
    pointsNote: 'Баллы — за участие, не за здоровье или квалификацию. Запрос не означает запись на встречу. Статус мастера требует одобрения.',
    details: 'Как начисляются баллы?',
    stages: [
      { id: 'tests', title: 'Узнай себя', hint: '3 бесплатных теста', action: 'Пройти тесты' },
      { id: 'course', title: 'Освой навык', hint: 'Бесплатный курс Рейки', action: 'Начать бесплатный курс' },
      { id: 'consultation', title: 'Личная поддержка', hint: 'Запрос знакомства', action: 'Запросить знакомство' },
      { id: 'master', title: 'Стань мастером', hint: 'Заявка и одобрение', action: 'Открыть Мою практику' },
      { id: 'author', title: 'Создай свой курс', hint: 'Черновик и публикация', action: 'Открыть редактор курса' },
    ],
  },
}

const getRoute = (id, locale, canAuthor, freeConsultationServiceId = null) => {
  const lang = locale === 'ru' ? 'ru' : 'en'
  if (id === 'tests') return '/' + lang + '/app/tests'
  if (id === 'course') return '/' + lang + '/academy/principles-of-energywork/learn'
  if (id === 'consultation') return freeConsultationServiceId
    ? '/' + lang + '/app/consultations?service=' + encodeURIComponent(freeConsultationServiceId)
    : '/' + lang + '/services/free-consultation'
  if (id === 'author' && canAuthor) return '/' + lang + '/app/practice?panel=materials&materialTab=courses'
  return '/' + lang + '/app/practice'
}

const stageMeta = (id, state, t) => {
  if (!state) return ''
  if (id === 'tests') return String(state.count || 0) + ' / 3 ' + t.testsUnit
  if (id === 'course' && state.done) return t.courseDone
  if (id === 'consultation' && state.requested) return t.consultationHint
  if (id === 'master' && state.approved) return t.masterApproved
  if (id === 'master' && state.applied) return t.masterPending
  if (id === 'author' && state.published) return t.coursePublished
  if (id === 'author' && state.drafted) return t.courseDraft
  return t.stages.find(stage => stage.id === id)?.hint || ''
}

const stageStatus = (id, state, current, t) => {
  if (!state) return '—'
  if (id === 'consultation' && state.requested) return t.consultationSent
  if (id === 'master' && state.approved) return t.masterApproved
  if (id === 'master' && state.applied) return t.masterPending
  if (id === 'author' && state.published) return t.coursePublished
  if (id === 'author' && state.drafted) return t.courseDraft
  if (state.done) return t.done
  return current ? t.now : t.upcoming
}

export default function CabinetJourney({ accountId, locale = 'en' }) {
  const lang = locale === 'ru' ? 'ru' : 'en'
  const t = COPY[lang]
  const [snapshot, setSnapshot] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    setSnapshot(null)
    setLoading(true)
    setError(false)
    appFetch('journey', undefined, undefined, { accountId, signal: controller.signal })
      .then(result => {
        if (controller.signal.aborted) return
        if (!result || !Array.isArray(result.steps) || result.steps.length !== 5 ||
            !Number.isFinite(result.xp) || result.maxXp !== 540) throw Error('INVALID_JOURNEY')
        setSnapshot({ accountId, value: result })
      })
      .catch(() => { if (!controller.signal.aborted) setError(true) })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [accountId, attempt])

  const journey = snapshot?.accountId === accountId ? snapshot.value : null
  const ready = Boolean(journey && !error && !loading)
  const completed = ready ? journey.steps.filter(step => step.done).length : 0
  const next = ready ? t.stages.find(stage => stage.id === journey.nextId) : null
  const currentIndex = next ? t.stages.findIndex(stage => stage.id === next.id) : 4
  const canAuthor = Boolean(journey?.practitionerStatus)
  const nextHref = next ? getRoute(next.id, lang, canAuthor, journey.freeConsultationServiceId)
    : '/' + lang + '/app/practice'
  const nextAction = next?.action || t.allDoneAction

  return <section className={styles.shell} data-cabinet-journey
    aria-labelledby="hh-journey-title" aria-busy={loading ? 'true' : undefined}>
    <header className={styles.heading}>
      <div className={styles.headingCopy}>
        <p className={styles.eyebrow}><Sparkles size={13} aria-hidden="true" />{t.eyebrow}</p>
        <h2 id="hh-journey-title">{t.title}</h2>
        <p className={styles.intro}>{t.intro}</p>
      </div>
      <div className={styles.xp} aria-label={t.xp}>
        <span>{ready ? journey.xp : '—'} <strong>XP</strong></span>
        <small>{t.xp}</small>
      </div>
    </header>

    {ready && <div className={styles.overview}>
      <p className={styles.position}>
        <span>{t.here} · {t.step} {currentIndex + 1} {t.of} {t.stages.length}</span>
        <strong>{next?.title || t.allDone}</strong>
      </p>
      <div className={styles.completion}>
        <span>{completed} / {t.stages.length} · {t.progress}</span>
        <div className={styles.progressRail} role="progressbar" aria-label={t.progress}
          aria-valuemin={0} aria-valuemax={t.stages.length} aria-valuenow={completed}>
          <span style={{ width: (completed * 100 / t.stages.length) + '%' }} />
        </div>
      </div>
    </div>}

    {loading && <p role="status" className={styles.notice}>{t.loading}</p>}
    {error && !loading && <div className={styles.fallback} role="alert">
      <span>{t.unavailable}</span>
      <button type="button" onClick={() => setAttempt(value => value + 1)}>{t.retry}</button>
    </div>}

    <ol className={styles.roadmap} aria-label={t.progress} data-journey-visible-steps>
      {t.stages.map(stage => {
        const info = ready ? journey.steps.find(item => item.id === stage.id) : null
        const done = info?.done === true
        const current = ready && next?.id === stage.id
        const status = stageStatus(stage.id, info, current, t)
        const description = info ? stageMeta(stage.id, info, t) : stage.hint
        const Icon = ICONS[stage.id]
        const points = info ? (info.earned > 0 && !done
          ? String(info.earned) + '/' + String(info.reward) + ' XP'
          : '+' + String(info.reward) + ' XP') : '— XP'
        const contents = <>
          <span className={styles.marker} aria-hidden="true">
            {done ? <Check size={18} /> : <Icon size={17} />}
          </span>
          <span className={styles.stepCopy}>
            <strong>{stage.title}</strong>
            <small>{description}</small>
          </span>
          <span className={styles.stepTail}>
            <span className={styles.status}>{status}</span>
            <small className={styles.stepReward}>{points}</small>
          </span>
        </>
        return <li key={stage.id} className={[
          styles.stage, done ? styles.complete : current ? styles.active : styles.upcoming,
        ].join(' ')} data-journey-stage={stage.id}
          data-journey-state={done ? 'done' : current ? 'next' : 'upcoming'}>
          {ready
            ? <Link className={styles.stepLink}
                href={getRoute(stage.id, lang, canAuthor, journey.freeConsultationServiceId)}
                prefetch={false} aria-current={current ? 'step' : undefined}
                aria-label={stage.title + ' · ' + status}>
                {contents}
              </Link>
            : <div className={styles.stepLink}>{contents}</div>}
        </li>
      })}
    </ol>

    {ready && <div className={styles.next}>
      <div className={styles.nextText}>
        <small>{next ? t.next : t.allDone}</small>
        <strong>{next?.title || t.allDoneText}</strong>
      </div>
      <Link href={nextHref} prefetch={false} className={styles.primary}>
        {nextAction}<ArrowRight size={17} aria-hidden="true" />
      </Link>
    </div>}

    {ready && <details className={styles.help}>
      <summary><CircleHelp size={14} aria-hidden="true" />{t.details}<ChevronRight size={14} aria-hidden="true" /></summary>
      <p><LockKeyhole size={13} aria-hidden="true" />{t.pointsNote}</p>
    </details>}
  </section>
}
