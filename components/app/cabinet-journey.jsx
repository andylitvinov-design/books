'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { ArrowRight, Award, Check, ChevronDown, Compass, LockKeyhole, Sparkles } from 'lucide-react'
import { appFetch } from '@/lib/app/client-fetch'
import styles from './cabinet-journey.module.css'

const COPY = {
  en: {
    eyebrow: 'YOUR PATH · HOLISTIC HOUSE',
    title: 'Your path',
    intro: 'From your first discoveries to your own course.',
    xp: 'Participation points', level: 'Stage', progress: 'Steps', of: 'of',
    levels: ['Beginning', 'Explorer', 'Practitioner', 'Creator', 'Master'],
    next: 'Your next step', all: 'Explore the whole journey', less: 'Hide the journey',
    earned: 'earned', complete: 'Done', upcoming: 'Ahead', working: 'In progress',
    loading: 'Updating your path…', unavailable: 'Your path is temporarily unavailable.',
    retry: 'Try again', milestones: [
      { id: 'tests', title: 'Discover yourself', detail: 'Complete three different tests in My Tests.', action: 'Take free tests' },
      { id: 'course', title: 'Learn a practical skill', detail: 'Finish the free Reiki Practitioner learning course.', action: 'Open free course' },
      { id: 'consultation', title: 'Ask for personal guidance', detail: 'Send a free consultation request; a booking is confirmed separately.', action: 'Request free consultation' },
      { id: 'master', title: 'Apply to become a master', detail: 'Build your professional profile and receive approval. XP does not grant professional rights.', action: 'Open My Practice' },
      { id: 'author', title: 'Create your own course', detail: 'Make an original course in the existing master editor; publishing requires approval.', action: 'Open course creator' },
    ],
    consultationPending: 'Request recorded · attendance not confirmed',
    reviewPending: 'Application submitted · under review',
    draftSaved: 'Course draft saved · not yet published',
    approved: 'Professional profile approved',
    source: 'Points reflect saved actions, not your health, talent or professional accreditation.',
  },
  ru: {
    eyebrow: 'ТВОЙ ПУТЬ · HOLISTIC HOUSE',
    title: 'Твой путь',
    intro: 'От первых открытий — к собственному курсу.',
    xp: 'Баллы за участие', level: 'Ступень', progress: 'Шагов', of: 'из',
    levels: ['Начало', 'Исследователь', 'Практик', 'Создатель', 'Мастер'],
    next: 'Твой следующий шаг', all: 'Посмотреть все этапы', less: 'Свернуть путь',
    earned: 'получено', complete: 'Готово', upcoming: 'Впереди', working: 'В процессе',
    loading: 'Проверяем твой прогресс…', unavailable: 'Пока не удалось загрузить путь.',
    retry: 'Повторить', milestones: [
      { id: 'tests', title: 'Узнай себя', detail: 'Пройди три разных теста в разделе «Мои тесты».', action: 'Пройти тесты' },
      { id: 'course', title: 'Освой новый навык', detail: 'Заверши бесплатный курс Reiki Practitioner.', action: 'Открыть бесплатный курс' },
      { id: 'consultation', title: 'Попроси личную поддержку', detail: 'Отправь заявку на бесплатную консультацию. Встреча подтверждается отдельно.', action: 'Запросить консультацию' },
      { id: 'master', title: 'Подай заявку на статус мастера', detail: 'Заполни профессиональный профиль и пройди проверку. Баллы сами по себе не дают прав.', action: 'Открыть «Мою практику»' },
      { id: 'author', title: 'Создай свой курс', detail: 'Создай авторский курс в редакторе мастера. Для публикации необходимо одобрение.', action: 'Создать свой курс' },
    ],
    consultationPending: 'Заявка сохранена · проведение встречи не подтверждено',
    reviewPending: 'Заявка мастера отправлена · ожидает проверки',
    draftSaved: 'Черновик курса сохранён · ещё не опубликован',
    approved: 'Профиль мастера одобрен',
    source: 'Баллы отражают участие, а не здоровье, личные качества или профессиональную квалификацию.',
  },
}

const getRoute = (id, locale, canAuthor, freeConsultationServiceId = null) => {
  const lang = locale === 'ru' ? 'ru' : 'en'
  if (id === 'tests') return `/${lang}/app/tests`
  if (id === 'course') return `/${lang}/academy/principles-of-energywork/learn`
  if (id === 'consultation') return freeConsultationServiceId
    ? `/${lang}/app/consultations?service=${encodeURIComponent(freeConsultationServiceId)}`
    : `/${lang}/services/free-consultation`
  if (id === 'author' && canAuthor) return `/${lang}/app/practice?panel=materials&materialTab=courses`
  return `/${lang}/app/practice`
}

export default function CabinetJourney({ accountId, locale = 'en' }) {
  const lang = locale === 'ru' ? 'ru' : 'en'
  const t = COPY[lang]
  const [snapshot, setSnapshot] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    setSnapshot(null)
    setError(false)
    setLoading(true)
    appFetch('journey', undefined, undefined, { accountId, signal: controller.signal })
      .then(result => {
        if (controller.signal.aborted) return
        if (!result || !Array.isArray(result.steps) || result.steps.length !== t.milestones.length ||
            !Number.isFinite(result.xp)) throw Error('INVALID_JOURNEY')
        setSnapshot({ accountId, value: result })
      })
      .catch(() => { if (!controller.signal.aborted) setError(true) })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [accountId, attempt, t.milestones.length])

  const journey = snapshot?.accountId === accountId ? snapshot.value : null
  const completed = journey?.steps.filter(step => step.done).length ?? 0
  const nextId = journey?.nextId || null
  const next = t.milestones.find(step => step.id === nextId)
  const stateFor = id => journey?.steps.find(step => step.id === id)
  const canAuthor = Boolean(journey?.practitionerStatus)
  const nextState = nextId ? stateFor(nextId) : null
  const nextAction = nextId === 'master' && nextState?.applied
    ? (lang === 'ru' ? 'Проверить заявку' : 'Review application')
    : next?.action

  return <section className={styles.shell} aria-labelledby="hh-journey-title" data-cabinet-journey>
    <div className={styles.heading}>
      <span className={styles.symbol} aria-hidden="true"><Compass size={22} /></span>
      <div className={styles.headingCopy}>
        <p className={styles.eyebrow}>{t.eyebrow}</p>
        <h2 id="hh-journey-title">{t.title}</h2>
        <p className={styles.intro}>{t.intro}</p>
      </div>
      <span className={styles.medal} aria-hidden="true"><Award size={22} /></span>
    </div>
    {loading && <p className={styles.notice} role="status">{t.loading}</p>}
    {error && !loading && <div className={styles.fallback} role="status"><span>{t.unavailable}</span>
      <button type="button" onClick={() => setAttempt(n => n + 1)}>{t.retry}</button></div>}
    {journey && !loading && !error && <>
      <div className={styles.metrics}>
        <div className={styles.points}><Sparkles size={18} aria-hidden="true" /><strong>{journey.xp} XP</strong><small>{t.xp}</small></div>
        <div className={styles.level}><small>{t.level} {journey.level}</small>
          <strong>{t.levels[Math.min(5, Math.max(1, journey.level)) - 1]}</strong></div>
        <div className={styles.count}><strong>{completed} / {journey.steps.length}</strong><small>{t.progress}</small></div>
      </div>
      <div className={styles.progressRail} role="progressbar"
        aria-label={t.xp} aria-valuemin={0} aria-valuemax={journey.maxXp} aria-valuenow={journey.xp}>
        <span style={{ width: (100 * journey.xp / journey.maxXp) + '%' }} /></div>
      <ol className={styles.track} aria-label={t.progress}>
        {t.milestones.map((stage, index) => {
          const info = stateFor(stage.id)
          return <li key={stage.id} className={info?.done ? styles.done : stage.id === nextId ? styles.current : styles.future}
            aria-label={`${index + 1}. ${stage.title}: ${info?.done ? t.complete : stage.id === nextId ? t.working : t.upcoming}`}>
            <span aria-hidden="true">{info?.done ? <Check size={16} /> : index + 1}</span>
          </li>
        })}
      </ol>
      <div className={styles.next}>
        <div><small>{next ? t.next : t.complete}</small>
          <strong>{next?.title || (lang === 'ru' ? 'Ты прошёл весь путь!' : 'You have completed the path!')}</strong>
          {next && <p>{next.id === 'master' && nextState?.applied ? t.reviewPending :
            next.id === 'author' && nextState?.drafted ? t.draftSaved :
            next.id === 'tests' ? `${journey.testsCompleted}/3 · ${next.detail}` : next.detail}</p>}
        </div>
        {next && <Link className={styles.primary} href={getRoute(next.id, lang, canAuthor, journey.freeConsultationServiceId)} prefetch={false}>
          {nextAction}<ArrowRight size={16} aria-hidden="true" />
        </Link>}
      </div>
      <details className={styles.details} open={expanded} onToggle={e => setExpanded(e.currentTarget.open)}>
        <summary>{expanded ? t.less : t.all}<ChevronDown size={16} aria-hidden="true" /></summary>
        <ol className={styles.milestones}>
          {t.milestones.map((stage, index) => {
            const state = stateFor(stage.id)
            return <li key={stage.id} className={styles.milestone}>
              <div className={styles.stepIcon} aria-hidden="true">{state?.done ? <Check size={17} /> : index + 1}</div>
              <div className={styles.stepBody}>
                <div className={styles.stepTop}><strong>{stage.title}</strong><small>+{state?.reward} XP</small></div>
                <p>{stage.detail}</p>
                {stage.id === 'consultation' && state?.requested && <em>{t.consultationPending}</em>}
                {stage.id === 'master' && state?.applied && <em>{state.approved ? t.approved : t.reviewPending}</em>}
                {stage.id === 'author' && state?.drafted && !state.published && <em>{t.draftSaved}</em>}
                <div className={styles.stepBottom}>
                  <small>{state?.earned || 0} XP {t.earned} {stage.id === 'tests' ? `· ${state?.count || 0}/3` : ''}</small>
                  <Link href={getRoute(stage.id, lang, canAuthor, journey.freeConsultationServiceId)} prefetch={false}>
                    {stage.action}<ArrowRight size={13} aria-hidden="true" />
                  </Link>
                </div>
              </div>
            </li>
          })}
        </ol>
      </details>
      <p className={styles.privacy}><LockKeyhole size={13} aria-hidden="true" />{t.source}</p>
    </>}
  </section>
}
