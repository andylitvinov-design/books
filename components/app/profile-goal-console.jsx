'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, BookOpen, CheckCircle2, ChevronRight, ClipboardList, Compass, Flame, Heart, Leaf, LockKeyhole, Plus, Rocket, ShieldCheck, Target } from 'lucide-react'
import { appFetch } from '@/lib/app/client-fetch'
import css from './profile-goal-console.module.css'

const VALID_GOALS = new Set(['active', 'accepted', 'in_progress'])
const STEPS = [
  { id: 'result', icon: Target, href: 'plan' },
  { id: 'motivation', icon: Flame, href: 'coach' },
  { id: 'resources', icon: Leaf, href: 'courses' },
  { id: 'plan', icon: ClipboardList, href: 'daybook' },
  { id: 'obstacles', icon: ShieldCheck, href: 'coach' },
  { id: 'possibilities', icon: Compass, href: 'coach' },
  { id: 'integration', icon: Rocket, href: 'daybook' },
]
const COPY = {
  en: {
    goals: 'My Goals', add: 'Add Goal', empty: 'Your first goal starts here. Explore your wishes and save a goal when you are ready.',
    error: 'Saved goals are temporarily unavailable.', retry: 'Open my goals',
    hint: 'Choose a goal to see its seven-step path.', plan: '7 Steps to My Goal',
    progress: 'Goal progress', unmeasured: 'Not measured', ready: 'Ready', active: 'Active', done: 'Done', locked: 'Locked',
    title: ['Define the Result', 'Ignite Motivation', 'Activate Resources', 'Build an Action Plan', 'Overcome Inner Blocks', 'Find New Opportunities', 'Achieve & Integrate'],
    detail: ['Clarify your desired outcome', 'Reconnect with your inner why', 'Find your energy and support', 'Choose your next practical actions', 'Work with obstacles gently', 'Discover new options and solutions', 'Reflect and sustain results'],
    tool: ['Goal coaching', 'AI coach & My Why', 'Courses and practices', 'Coaching Daybook', 'Guided coaching', 'AI brainstorming', 'Progress review'],
    noStages: 'Step progress appears after it has been saved; these are entry points, not completed stages.',
    stageProgress: 'Step progress', open: 'Open stage',
  },
  ru: {
    goals: 'Мои цели', add: 'Добавить цель', empty: 'Начните с одной важной цели. Определите своё желание и сохраните цель.',
    error: 'Пока не удалось загрузить сохранённые цели.', retry: 'Открыть мои цели',
    hint: 'Выберите цель, чтобы пройти её семь шагов.', plan: '7 шагов к моей цели',
    progress: 'Прогресс цели', unmeasured: 'Не измерен', ready: 'Доступен', active: 'Активен', done: 'Пройден', locked: 'Закрыт',
    title: ['Определить результат', 'Зажечь мотивацию', 'Активировать ресурсы', 'Построить план', 'Преодолеть препятствия', 'Найти возможности', 'Достичь и закрепить'],
    detail: ['Что конкретно я хочу получить', 'Зачем мне это важно', 'Моя энергия, люди и поддержка', 'Мои следующие действия', 'Мягкая работа со страхами', 'Новые пути и решения', 'Оценить и закрепить результат'],
    tool: ['Коучинг цели', 'ИИ-коуч и My Why', 'Курсы и практики', 'Дневник коучинга', 'Коучинг и образы', 'Поиск решений с ИИ', 'Обзор прогресса'],
    noStages: 'Процент появится после сохранения прогресса этапа. Доступ к практикам не означает завершение.',
    stageProgress: 'Прогресс этапа', open: 'Открыть этап',
  },
  es: {
    goals: 'Mis metas', add: 'Añadir meta', empty: 'Empieza con una meta importante. Elige tu deseo y guárdalo.',
    error: 'No se pudieron cargar las metas guardadas.', retry: 'Abrir mis metas',
    hint: 'Elige una meta para explorar sus siete pasos.', plan: '7 pasos hacia mi meta',
    progress: 'Progreso de la meta', unmeasured: 'Sin medir', ready: 'Disponible', active: 'Activo', done: 'Hecho', locked: 'Bloqueado',
    title: ['Definir el resultado', 'Encender la motivación', 'Activar recursos', 'Construir un plan', 'Superar obstáculos', 'Encontrar posibilidades', 'Lograr e integrar'],
    detail: ['Aclarar el resultado deseado', 'Reconectar con tu porqué', 'Encontrar energía y apoyo', 'Planificar los próximos pasos', 'Abordar bloqueos con cuidado', 'Explorar nuevas soluciones', 'Consolidar lo conseguido'],
    tool: ['Coaching de objetivos', 'Coach IA y My Why', 'Cursos y prácticas', 'Diario de coaching', 'Coaching guiado', 'Ideas con IA', 'Revisión del progreso'],
    noStages: 'El porcentaje aparece cuando se guarda el avance. Abrir una práctica no significa completarla.',
    stageProgress: 'Progreso del paso', open: 'Abrir paso',
  },
}
const percent = value => typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 100 ? Math.round(value) : null
const validGoal = goal => goal && typeof goal.title === 'string' && goal.title.trim() && VALID_GOALS.has(goal.status)
function goalList(data) {
  const roots = Array.isArray(data?.goals) ? data.goals : []
  const nested = Array.isArray(data?.domains) ? data.domains.flatMap(domain => Array.isArray(domain?.goals) ? domain.goals : []) : []
  const seen = new Set()
  return [...roots, ...nested].filter(validGoal).filter(goal => {
    const id = String(goal.id || '')
    if (!id || seen.has(id)) return false
    seen.add(id)
    return true
  }).slice(0, 24)
}
function stageRecord(goal, index) {
  const items = [goal?.sevenSteps, goal?.sevenStepProgress, goal?.stageProgress].find(Array.isArray)
  if (!items) return null
  const step = items.find((s, i) => s && (s.index === index + 1 || s.number === index + 1 || s.key === STEPS[index].id || (i === index && !('index' in s) && !('number' in s) && !('key' in s))))
  return step && typeof step === 'object' ? step : null
}
function getStatus(step, value, t) {
  if (step?.status === 'completed' || step?.status === 'done') return t.done
  if (step?.status === 'active' || step?.status === 'in_progress') return t.active
  if (step?.status === 'locked') return t.locked
  if (value === 100) return t.done
  return t.ready
}
export default function ProfileGoalConsole({ locale = 'en', root = '/en/app', accountId = null }) {
  const lang = Object.hasOwn(COPY, locale) ? locale : 'en'
  const t = COPY[lang]
  const [state, setState] = useState({ owner: null, loading: Boolean(accountId), error: false, plan: null })
  const [selectedId, setSelectedId] = useState('')
  useEffect(() => {
    if (!accountId) return undefined
    const controller = new AbortController()
    setSelectedId('')
    setState({ owner: accountId, loading: true, error: false, plan: null })
    appFetch('coaching-life-plan?locale=' + lang, undefined, 'GET', { accountId, signal: controller.signal })
      .then(plan => { if (!controller.signal.aborted) setState({ owner: accountId, loading: false, error: false, plan }) })
      .catch(() => { if (!controller.signal.aborted) setState({ owner: accountId, loading: false, error: true, plan: null }) })
    return () => controller.abort()
  }, [accountId, lang])
  const view = state.owner === accountId ? state : { owner: null, loading: Boolean(accountId), error: false, plan: null }
  const goals = useMemo(() => goalList(view.plan), [view.plan])
  const selected = goals.find(goal => String(goal.id) === selectedId) || goals[0] || null
  const records = selected ? STEPS.map((_, index) => stageRecord(selected, index)) : []
  const scores = records.map(row => percent(row?.progressPercent ?? row?.percent))
  const verifiedGoalPercent = selected ? percent(selected.progressPercent) : null
  const overall = verifiedGoalPercent !== null ? verifiedGoalPercent : scores.length === 7 && scores.every(value => value !== null)
    ? Math.round(scores.reduce((sum, value) => sum + value, 0) / 7) : null
  const planLink = selected ? root + '/my-coaching-plan?goal=' + encodeURIComponent(selected.id) : root + '/my-coaching-plan'
  const hrefFor = id => id === 'plan' ? planLink : id === 'coach' ? '/' + lang + '/my-coach'
    : id === 'courses' ? root + '/course?view=courses' : root + '/portrait?space=path'
  return <section className={css.console} data-profile-goal-console data-account-scoped={Boolean(accountId)}>
    <div className={css.goalsHeader}><h2><Target size={25} aria-hidden="true" />{t.goals}</h2><p>{t.hint}</p></div>
    <div className={css.goalStrip} aria-label={t.goals}>
      {goals.map(goal => {
        const active = selected?.id === goal.id
        return <button key={goal.id} type="button" className={active ? css.goalActive : css.goalChip}
          aria-pressed={active} onClick={() => setSelectedId(String(goal.id))}>
          <Target size={23} aria-hidden="true" />
          <strong>{goal.title}</strong>{active && <CheckCircle2 size={19} aria-hidden="true" />}
        </button>
      })}
      <Link className={css.addGoal} href={root + '/my-coaching-plan'} prefetch={false}><Plus size={26} aria-hidden="true" /><strong>{t.add}</strong></Link>
    </div>
    {view.loading ? <p className={css.message} role="status">…</p> : view.error ?
      <p className={css.message} role="alert">{t.error} <Link href={root + '/my-coaching-plan'}>{t.retry}</Link></p> :
      !selected ? <p className={css.message}>{t.empty}</p> :
      <>
        <div className={css.selectedGoal}>
          <div className={css.goalText}><span>{t.goals}</span><h2>{selected.title}</h2>
            <p>{typeof selected.desiredOutcome === 'string' && selected.desiredOutcome.trim() ? selected.desiredOutcome : t.hint}</p>
          </div>
          <div className={css.circle} style={{ '--hh-circle-value': (overall ?? 0) + '%' }}
            aria-label={t.progress + ': ' + (overall === null ? t.unmeasured : overall + '%')}>
            <div><strong>{overall === null ? '—' : overall + '%'}</strong><small>{t.progress}</small></div>
          </div>
        </div>
        <h2 className={css.stepsTitle}>{t.plan}</h2>
        <div className={css.steps}>
          {STEPS.map(({ id, icon: Icon, href }, index) => {
            const value = scores[index]
            const status = getStatus(records[index], value, t)
            const isLocked = records[index]?.status === 'locked'
            return <Link key={id} href={hrefFor(href)} prefetch={false} className={css.step}
              aria-label={(index + 1) + '. ' + t.title[index] + '. ' + t.tool[index] + '. ' + status}
              data-goal-step={index + 1} data-goal-step-status={records[index]?.status || 'ready'}>
              <span className={css.number}>{index + 1}</span>
              <Icon className={css.stepIcon} size={27} aria-hidden="true" />
              <span className={css.stepBody}><strong>{t.title[index]}</strong><small>{t.tool[index]} · {t.detail[index]}</small>
                <span className={css.progressTrack}><span style={{ width: (value ?? 0) + '%' }}/></span></span>
              <span className={css.stepState}><b>{value === null ? '—' : value + '%'}</b><small>{status}</small></span>
              {isLocked ? <LockKeyhole size={18} aria-hidden="true" /> : <ChevronRight size={22} aria-hidden="true" />}
            </Link>
          })}
        </div>
        <p className={css.disclaimer}>{t.noStages}</p>
        <Link className={css.daybook} href={root + '/portrait?space=path'} prefetch={false}><BookOpen size={20} aria-hidden="true" />{t.tool[3]}<ArrowRight size={19} aria-hidden="true" /></Link>
      </>}
  </section>
}
