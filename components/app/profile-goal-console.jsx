'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { CheckCircle2, ChevronDown, ChevronRight, ClipboardList, Compass, Flame, Leaf, Plus, Rocket, ShieldCheck, Target } from 'lucide-react'
import { appFetch } from '@/lib/app/client-fetch'
import css from './profile-goal-console.module.css'
import { goalStageOptions, goalOptionHref } from '@/lib/profile/goal-stage-options.mjs'
import { goalStageRecord as stageRecord } from '@/lib/profile/goal-stage-progress.mjs'

const VALID_GOALS = new Set(['active', 'accepted', 'in_progress'])
const STEPS = [
  { id: 'result', icon: Target, href: 'plan' },
  { id: 'motivation', icon: Flame, href: 'coach' },
  { id: 'resources', icon: Leaf, href: 'courses' },
  { id: 'plan', icon: ClipboardList, href: 'daybook' },
  { id: 'obstacles', icon: ShieldCheck, href: 'coach' },
  { id: 'possibilities', icon: Compass, href: 'coach' },
  { id: 'acceleration', icon: Rocket, href: 'plan' },
  { id: 'integration', icon: Rocket, href: 'daybook' },
]
const COPY = {
  en: {
    goals: 'My Goals', add: 'Add Goal', empty: 'No goal selected yet. You can explore all 8 steps now.',
    error: 'Saved goals are temporarily unavailable.', retry: 'Open my goals',
    hint: 'Choose a goal to see its eight-stage path.', plan: '8 Stages to My Goal',
    zero: 'Choose a direction', zeroDetail: 'Four life spheres, eight meaning axes and a new saved goal',
    progress: 'Goal progress', unmeasured: 'Not measured', ready: 'Ready', active: 'Active', done: 'Done', locked: 'Locked',
    title: ['Define the Result', 'Ignite Motivation', 'Activate Resources', 'Build an Action Plan', 'Overcome Inner Blocks', 'Find New Opportunities', 'Accelerate Toward the Goal', 'Results & New Perspectives'],
    detail: ['Clarify your desired outcome', 'Reconnect with your inner why', 'Find your energy and support', 'Choose your next practical actions', 'Work with obstacles gently', 'Discover new options and solutions', 'Strengthen what works and adjust your next actions', 'Reflect on results and choose what comes next'],
    tool: ['Goal coaching', 'AI coach & My Why', 'Courses and practices', 'Coaching Daybook', 'Guided coaching', 'AI brainstorming', 'Action review', 'Progress review'],
    noStages: 'Step progress appears after it has been saved; these are entry points, not completed stages.',
    stageProgress: 'Step progress', open: 'Explore',
  },
  ru: {
    goals: 'Мои цели', add: 'Добавить цель', empty: 'Цель пока не выбрана. Все 8 этапов доступны для знакомства.',
    error: 'Пока не удалось загрузить сохранённые цели.', retry: 'Открыть мои цели',
    hint: 'Выберите цель, чтобы пройти её восемь этапов.', plan: '8 этапов к моей цели',
    zero: 'Выбор направления', zeroDetail: 'Четыре сферы жизни, восемь смысловых осей и новая сохранённая цель',
    progress: 'Прогресс цели', unmeasured: 'Не измерен', ready: 'Доступен', active: 'Активен', done: 'Пройден', locked: 'Закрыт',
    title: ['Определить результат', 'Зажечь мотивацию', 'Активировать ресурсы', 'Построить план', 'Преодолеть препятствия', 'Найти возможности', 'Ускорение к цели', 'Итоги и новые перспективы'],
    detail: ['Что конкретно я хочу получить', 'Зачем мне это важно', 'Моя энергия, люди и поддержка', 'Мои следующие действия', 'Мягкая работа со страхами', 'Новые пути и решения', 'Усилить работающие действия и скорректировать план', 'Оценить результаты и выбрать дальнейшее направление'],
    tool: ['Коучинг цели', 'ИИ-коуч и My Why', 'Курсы и практики', 'Дневник коучинга', 'Коучинг и образы', 'Поиск решений с ИИ', 'Обзор действий', 'Обзор прогресса'],
    noStages: 'Процент появится после сохранения прогресса этапа. Доступ к практикам не означает завершение.',
    stageProgress: 'Прогресс этапа', open: 'Открыть',
  },
  es: {
    goals: 'Mis metas', add: 'Añadir meta', empty: 'Aún no has elegido una meta. Puedes explorar las 8 etapas.',
    error: 'No se pudieron cargar las metas guardadas.', retry: 'Abrir mis metas',
    hint: 'Elige una meta para explorar sus ocho etapas.', plan: '8 etapas hacia mi meta',
    zero: 'Elegir una dirección', zeroDetail: 'Cuatro áreas vitales, ocho ejes de sentido y una nueva meta guardada',
    progress: 'Progreso de la meta', unmeasured: 'Sin medir', ready: 'Disponible', active: 'Activo', done: 'Hecho', locked: 'Bloqueado',
    title: ['Definir el resultado', 'Encender la motivación', 'Activar recursos', 'Construir un plan', 'Superar obstáculos', 'Encontrar posibilidades', 'Acelerar hacia la meta', 'Resultados y nuevas perspectivas'],
    detail: ['Aclarar el resultado deseado', 'Reconectar con tu porqué', 'Encontrar energía y apoyo', 'Planificar los próximos pasos', 'Abordar bloqueos con cuidado', 'Explorar nuevas soluciones', 'Reforzar lo que funciona y ajustar las acciones', 'Revisar resultados y elegir el siguiente rumbo'],
    tool: ['Coaching de objetivos', 'Coach IA y My Why', 'Cursos y prácticas', 'Diario de coaching', 'Coaching guiado', 'Ideas con IA', 'Revisión de acciones', 'Revisión del progreso'],
    noStages: 'El porcentaje aparece cuando se guarda el avance. Abrir una práctica no significa completarla.',
    stageProgress: 'Progreso del paso', open: 'Explorar',
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
  const [expandedStage, setExpandedStage] = useState(null)
  useEffect(() => {
    if (!accountId) return undefined
    const controller = new AbortController()
    setSelectedId('')
    setExpandedStage(null)
    setState({ owner: accountId, loading: true, error: false, plan: null })
    appFetch('coaching-life-plan?locale=' + lang, undefined, 'GET', { accountId, signal: controller.signal })
      .then(plan => { if (!controller.signal.aborted) setState({ owner: accountId, loading: false, error: false, plan }) })
      .catch(() => { if (!controller.signal.aborted) setState({ owner: accountId, loading: false, error: true, plan: null }) })
    return () => controller.abort()
  }, [accountId, lang])
  const view = state.owner === accountId ? state : { owner: null, loading: Boolean(accountId), error: false, plan: null }
  const goals = useMemo(() => goalList(view.plan), [view.plan])
  const selected = goals.find(goal => String(goal.id) === selectedId) || goals[0] || null
  const records = STEPS.map((_, index) => selected ? stageRecord(selected, index) : null)
  const scores = records.map(row => percent(row?.progressPercent ?? row?.percent))
  const verifiedGoalPercent = selected ? percent(selected.progressPercent) : null
  const overall = verifiedGoalPercent !== null ? verifiedGoalPercent : scores.length === STEPS.length && scores.every(value => value !== null)
    ? Math.round(scores.reduce((sum, value) => sum + value, 0) / STEPS.length) : null
  const planLink = selected ? root + '/my-coaching-plan?goal=' + encodeURIComponent(selected.id) : root + '/my-coaching-plan'
  const optionHref = route => goalOptionHref(route, { lang, root, planLink })
  return <section className={css.console} data-profile-goal-console data-account-scoped={Boolean(accountId)} data-goal-selected={Boolean(selected)}>
    {goals.length > 1 && <div className={css.goalStrip} aria-label={t.goals}>
      <h2 className={css.stripTitle}><Target size={18} aria-hidden="true" />{t.goals} ({goals.length})</h2>
      {goals.map(goal => {
        const active = selected?.id === goal.id
        return <button key={goal.id} type="button" className={active ? css.goalActive : css.goalChip}
          aria-pressed={active} onClick={() => { setSelectedId(String(goal.id)); setExpandedStage(null) }}>
          <Target size={23} aria-hidden="true" />
          <strong>{goal.title}</strong>{active && <CheckCircle2 size={19} aria-hidden="true" />}
        </button>
      })}
      <Link className={css.addGoal} href={root + '/daybook?start=vector'} prefetch={false}><Plus size={26} aria-hidden="true" /><strong>{t.add}</strong></Link>
    </div>}
    {view.loading && <p className={css.notice} role="status">…</p>}
    {view.error && <p className={css.notice} role="alert">{t.error} <Link href={root + '/my-coaching-plan'}>{t.retry}</Link></p>}
    {!view.loading && !view.error && !selected && <span className={css.emptyHint} data-goal-empty-state hidden>{t.empty}</span>}
    {selected && !view.loading && !view.error && <>
        <div className={css.selectedGoal}>
          <div className={css.goalText}><span>{t.goals}</span><h2>{selected.title}</h2>
            <p>{typeof selected.desiredOutcome === 'string' && selected.desiredOutcome.trim() ? selected.desiredOutcome : t.hint}</p>
          </div>
          <div className={css.circle} style={{ '--hh-circle-value': (overall ?? 0) + '%' }}
            aria-label={t.progress + ': ' + (overall === null ? t.unmeasured : overall + '%')}>
            <div><strong>{overall === null ? '—' : overall + '%'}</strong><small>{t.progress}</small></div>
          </div>
        </div>
      </>}
    <Link className={css.step} href={root + '/daybook?start=vector'} prefetch={false} data-goal-vector-entry>
      <span className={css.number}>0</span><Compass className={css.stepIcon} size={27} aria-hidden="true" />
      <span className={css.stepBody}><strong>{t.zero}</strong><small>{t.zeroDetail}</small></span>
      <ChevronRight size={18} aria-hidden="true" />
    </Link>
    <h2 className={css.stepsTitle}>{t.plan}</h2>
    <div className={css.steps}>
          {STEPS.map(({ id, icon: Icon }, index) => {
            const value = selected && !view.loading && !view.error ? scores[index] : null
            const status = selected && !view.loading && !view.error ? getStatus(records[index], value, t) : t.open
            const isLocked = Boolean(selected && records[index]?.status === 'locked')
            const expanded = expandedStage === id
            const options = goalStageOptions(id, lang)
            return <div key={id} className={css.stageGroup} data-goal-stage-group={id}>
              <button type="button" id={'goal-stage-button-' + id} className={css.step}
                aria-expanded={expanded} aria-controls={'goal-stage-options-' + id}
                onClick={() => setExpandedStage(current => current === id ? null : id)}
                aria-label={(index + 1) + '. ' + t.title[index] + '. ' + t.tool[index] + '. ' + status}
                data-profile-mode-switch data-goal-step={index + 1} data-goal-step-status={selected && records[index]?.status || 'explore'}>
              <span className={css.number}>{index + 1}</span>
              <Icon className={css.stepIcon} size={27} aria-hidden="true" />
              <span className={css.stepBody}><strong>{t.title[index]}</strong><small>{t.detail[index]}</small>
                {selected && value !== null && <span className={css.progressTrack}><span style={{ width: value + '%' }}/></span>}</span>
              {selected && <span className={css.stepState}>{value !== null && <b>{value + '%'}</b>}<small>{status}</small></span>}
              <ChevronDown size={18} aria-hidden="true" className={css.stageChevron} />
              </button>
              <div id={'goal-stage-options-' + id} role="region" aria-labelledby={'goal-stage-button-' + id}
                className={css.stageOptions} hidden={!expanded} data-goal-stage-options={id}>
                <p className={css.optionHeading}>{({en:'Choose your support',ru:'Выберите вариант поддержки',es:'Elige tu apoyo'})[lang]}</p>
                {isLocked && <p className={css.optionNote}>{({en:'You can explore options before this stage is activated.',ru:'Варианты можно изучить до активации этапа.',es:'Puedes explorar opciones antes de activar esta etapa.'})[lang]}</p>}
                {options.map(option => <Link key={option.route} href={optionHref(option.route)} prefetch={false}
                  className={css.stageOption} data-goal-stage-option={option.route}>
                  <span><strong>{option.title}</strong><small>{option.detail}</small></span><ChevronRight size={17} aria-hidden="true"/>
                </Link>)}
              </div>
            </div>
          })}
    </div>
    {selected && <p className={css.disclaimer}>{t.noStages}</p>}
  </section>
}
