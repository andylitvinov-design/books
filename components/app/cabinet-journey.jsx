'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import {
  ArrowRight, BookOpen, Check, ChevronDown, ChevronRight, CircleHelp, ClipboardList,
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
    expand: 'Show actions', collapse: 'Hide actions',
    earned: 'Earned', available: 'Still available', fullyEarned: 'All XP earned',
    consultationNote: 'Sending a request earns XP but does not book or confirm a meeting.',
    masterNote: 'Approval is reviewed by a person. XP never grants professional access.',
    authorNote: 'Publishing requires master approval; a saved draft is a separate step.',
    checkApplication: 'Check my application',
    applyFirst: 'Apply to become a master',
    myRequests: 'My requests',
    tasks: {
      tests: ['Save your first test', 'Save a different second test', 'Save a third different test'],
      course: ['Complete the free learning course'],
      consultation: ['Send a free introduction request'],
      master: ['Submit your master application', 'Receive master approval'],
      author: ['Save your course draft', 'Publish your course after approval'],
    },
    stages: [
      { id: 'tests', title: 'Discover yourself', hint: '3 free tests', action: 'Choose a free test',
        doneAction: 'See my reports', detail: 'Complete 3 different tests. Each saved result earns 30 XP.' },
      { id: 'course', title: 'Learn a skill', hint: 'Free Reiki course', action: 'Start free course',
        doneAction: 'Review the course', detail: 'Complete your free learning course to earn 130 XP.' },
      { id: 'consultation', title: 'Personal guidance', hint: 'Free introduction request', action: 'Request an introduction',
        doneAction: 'My requests', detail: 'Send a free introduction request to earn 20 XP.' },
      { id: 'master', title: 'Become a master', hint: 'Apply and get approved', action: 'Apply as a master',
        doneAction: 'Open My Practice', detail: 'An application earns 45 XP; approval adds 55 XP.' },
      { id: 'author', title: 'Create your course', hint: 'Draft and publish', action: 'Create a course draft',
        doneAction: 'Manage my courses', detail: 'Save a course draft for 120 XP; publish after approval for another 80 XP.' },
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
    expand: 'Показать действия', collapse: 'Скрыть действия',
    earned: 'Получено', available: 'Можно получить', fullyEarned: 'Все XP получены',
    consultationNote: 'За отправку запроса начисляются XP, но это ещё не запись и не подтверждённая встреча.',
    masterNote: 'Заявку проверяет человек. XP сами по себе не открывают права мастера.',
    authorNote: 'Публикация требует одобрения мастера; черновик — отдельный этап.',
    checkApplication: 'Проверить заявку',
    applyFirst: 'Сначала стать мастером',
    myRequests: 'Мои заявки',
    tasks: {
      tests: ['Сохрани результат первого теста', 'Пройди второй, другой тест', 'Пройди третий, другой тест'],
      course: ['Заверши бесплатный учебный курс'],
      consultation: ['Отправь запрос на бесплатное знакомство'],
      master: ['Подай заявку на статус мастера', 'Получи одобрение мастера'],
      author: ['Сохрани черновик своего курса', 'Опубликуй курс после одобрения'],
    },
    stages: [
      { id: 'tests', title: 'Узнай себя', hint: '3 бесплатных теста', action: 'Выбрать бесплатный тест',
        doneAction: 'Посмотреть отчёты', detail: 'Пройди 3 разных теста. За каждый сохранённый результат — 30 XP.' },
      { id: 'course', title: 'Освой навык', hint: 'Бесплатный курс Рейки', action: 'Начать бесплатный курс',
        doneAction: 'Повторить курс', detail: 'Заверши бесплатный учебный курс и получи 130 XP.' },
      { id: 'consultation', title: 'Личная поддержка', hint: 'Запрос знакомства', action: 'Запросить знакомство',
        doneAction: 'Мои заявки', detail: 'Отправь запрос на бесплатное знакомство и получи 20 XP.' },
      { id: 'master', title: 'Стань мастером', hint: 'Заявка и одобрение', action: 'Подать заявку мастера',
        doneAction: 'Открыть Мою практику', detail: 'За заявку — 45 XP; после одобрения добавится ещё 55 XP.' },
      { id: 'author', title: 'Создай свой курс', hint: 'Черновик и публикация', action: 'Создать черновик курса',
        doneAction: 'Мои авторские курсы', detail: 'Сохрани черновик за 120 XP, а после одобрения опубликуй курс ещё за 80 XP.' },
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

// Read-only presentation of persisted milestones; opening a card never earns points.
const stageTasks = (id, state, t) => {
  const labels = t.tasks[id] || []
  if (id === 'tests') return labels.map((label, index) => ({
    label, reward: 30, done: Number(state?.count || 0) > index,
  }))
  if (id === 'course') return [{ label: labels[0], reward: 130, done: state?.done === true }]
  if (id === 'consultation') return [{ label: labels[0], reward: 20, done: state?.requested === true }]
  if (id === 'master') return [
    { label: labels[0], reward: 45, done: state?.applied === true },
    { label: labels[1], reward: 55, done: state?.approved === true },
  ]
  return [
    { label: labels[0], reward: 120, done: state?.drafted === true },
    { label: labels[1], reward: 80, done: state?.published === true },
  ]
}

const stageAction = (stage, state, lang, canAuthor, serviceId, t) => {
  if (stage.id === 'tests' && state?.done)
    return { href: '/' + lang + '/app/reports', label: stage.doneAction }
  if (stage.id === 'consultation' && state?.requested)
    return { href: '/' + lang + '/app/consultations', label: t.myRequests }
  if (stage.id === 'author' && !canAuthor)
    return { href: '/' + lang + '/app/practice', label: t.applyFirst }
  if (stage.id === 'master' && state?.applied && !state.approved)
    return { href: '/' + lang + '/app/practice', label: t.checkApplication }
  return {
    href: getRoute(stage.id, lang, canAuthor, serviceId),
    label: state?.done ? stage.doneAction : stage.action,
  }
}

export default function CabinetJourney({ accountId, locale = 'en' }) {
  const lang = locale === 'ru' ? 'ru' : 'en'
  const t = COPY[lang]
  const [snapshot, setSnapshot] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const [expandedId, setExpandedId] = useState(null)

  useEffect(() => {
    const controller = new AbortController()
    setSnapshot(null)
    setExpandedId(null)
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
        const points = info ? (info.earned > 0
          ? String(info.earned) + '/' + String(info.reward) + ' XP'
          : '+' + String(info.reward) + ' XP') : '— XP'
        const expanded = ready && expandedId === stage.id
        const tasks = ready ? stageTasks(stage.id, info, t) : []
        const action = ready ? stageAction(stage, info, lang, canAuthor, journey.freeConsultationServiceId, t) : null
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
          expanded ? styles.expanded : '',
        ].join(' ')} data-journey-stage={stage.id}
          data-journey-state={done ? 'done' : current ? 'next' : 'upcoming'}>
          {ready
            ? <button type="button" className={styles.stepLink}
                onClick={() => setExpandedId(value => value === stage.id ? null : stage.id)}
                aria-expanded={expanded} aria-controls={'hh-journey-step-' + stage.id}
                aria-current={current ? 'step' : undefined}
                aria-label={stage.title + ' · ' + status + ' · ' + points + ' · ' + (expanded ? t.collapse : t.expand)}>
                {contents}
                <ChevronDown size={17} className={styles.stepChevron} aria-hidden="true" />
              </button>
            : <div className={styles.stepLink}>{contents}</div>}
          {ready && <div id={'hh-journey-step-' + stage.id}
            className={styles.stageDetail} hidden={!expanded}>
            <p className={styles.detailIntro}>{stage.detail}</p>
            <ul className={styles.taskList}>
              {tasks.map((task, index) => <li key={index}
                className={task.done ? styles.taskComplete : styles.taskPending}>
                <span className={styles.taskIcon} aria-hidden="true">
                  {task.done ? <Check size={13} /> : index + 1}
                </span>
                <span className={styles.taskTitle}>{task.label}</span>
                <strong className={styles.taskXp}>{task.done ? t.earned : '+'}{task.done ? ' ' : ''}{task.reward} XP</strong>
              </li>)}
            </ul>
            <div className={styles.detailFooter}>
              <span className={styles.remaining}>
                {info.reward > info.earned
                  ? t.available + ': +' + Math.max(0, info.reward - info.earned) + ' XP'
                  : t.fullyEarned}
              </span>
              <Link href={action.href} prefetch={false} className={styles.detailAction}>
                {action.label}<ArrowRight size={16} aria-hidden="true" />
              </Link>
            </div>
            {stage.id === 'consultation' && <p className={styles.detailNote}>{t.consultationNote}</p>}
            {stage.id === 'master' && <p className={styles.detailNote}>{t.masterNote}</p>}
            {stage.id === 'author' && <p className={styles.detailNote}>{t.authorNote}</p>}
          </div>}
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
