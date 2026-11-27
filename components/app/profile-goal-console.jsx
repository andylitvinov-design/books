'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { CheckCircle2, PlayCircle, CalendarDays, ChevronDown, ChevronRight, ClipboardList, Compass, Flame, Info, Leaf, Plus, Rocket, ShieldCheck, Target } from 'lucide-react'
import { appFetch } from '@/lib/app/client-fetch'
import css from './profile-goal-console.module.css'
import ProfileProgramRequest from './profile-program-request'
import { guideGoalProgress } from '@/lib/app/daybook-guide.mjs'
import { collectJournalExport } from '@/lib/app/daybook-journal-export.mjs'
import { profileDaybookHref } from '@/lib/profile/profile-daybook-route.mjs'
import { GOAL_STAGE_IDS, goalStageRecord as stageRecord } from '@/lib/profile/goal-stage-progress.mjs'

const VALID_GOALS = new Set(['active', 'accepted', 'in_progress'])
const STEPS = [
  { id: 'result', icon: Target },
  { id: 'motivation', icon: Flame },
  { id: 'plan', icon: ClipboardList },
  { id: 'resources', icon: Leaf },
  { id: 'obstacles', icon: ShieldCheck },
  { id: 'possibilities', icon: Compass },
  { id: 'acceleration', icon: Rocket },
  { id: 'integration', icon: Rocket },
]
const COPY = {
  en: {
    goals: 'My Goals', add: 'Create a new goal', empty: 'No goal selected yet. You can explore all 8 steps now.',
    error: 'Saved goals are temporarily unavailable.', retry: 'Open my goals',
    hint: 'Choose a goal to see its eight-stage path.', plan: '8 Stages to My Goal',
    zero: 'Create a new goal', zeroDetail: 'Name your goal and describe what you want',
    progress: 'Goal progress', unmeasured: 'Not measured', ready: 'Ready', active: 'Active', done: 'Done', locked: 'Locked',
    title: ['Define the Result', 'Ignite Motivation', 'Build an Action Plan', 'Activate Resources', 'Overcome Inner Blocks', 'Find New Opportunities', 'Accelerate Toward the Goal', 'Results & New Perspectives'],
    detail: ['Clarify your desired outcome', 'Reconnect with your inner why', 'Choose your next practical actions', 'Find your energy and support', 'Work with obstacles gently', 'Discover new options and solutions', 'Strengthen what works and adjust your next actions', 'Reflect on results and choose what comes next'],
    tool: ['Goal coaching', 'AI coach & My Why', 'Coaching Daybook', 'Courses and practices', 'Guided coaching', 'AI brainstorming', 'Action review', 'Progress review'],
    noStages: 'Step progress appears after it has been saved; these are entry points, not completed stages.',
    stageProgress: 'Step progress', open: 'Explore', start: 'Start',
    lesson: 'Take lesson', week: 'Week', of: 'of', courseProgress: 'Course progress', completedWeeks: 'weeks completed', courseDone: 'Course completed', courseLoading: 'Loading course progress…', courseError: 'Course progress unavailable', courseRetry: 'Retry',
  },
  ru: {
    goals: 'Мои цели', add: 'Создать новую цель', empty: 'Цель пока не выбрана. Все 8 этапов доступны для знакомства.',
    error: 'Пока не удалось загрузить сохранённые цели.', retry: 'Открыть мои цели',
    hint: 'Выберите цель, чтобы пройти её восемь этапов.', plan: '8 этапов к моей цели',
    zero: 'Создать новую цель', zeroDetail: 'Назовите цель и опишите желаемый результат',
    progress: 'Прогресс цели', unmeasured: 'Не измерен', ready: 'Доступен', active: 'Активен', done: 'Пройден', locked: 'Закрыт',
    title: ['Определить результат', 'Зажечь мотивацию', 'Построить план', 'Активировать ресурсы', 'Преодолеть препятствия', 'Найти возможности', 'Ускорение к цели', 'Итоги и новые перспективы'],
    detail: ['Что конкретно я хочу получить', 'Зачем мне это важно', 'Мои следующие действия', 'Моя энергия, люди и поддержка', 'Мягкая работа со страхами', 'Новые пути и решения', 'Усилить работающие действия и скорректировать план', 'Оценить результаты и выбрать дальнейшее направление'],
    tool: ['Коучинг цели', 'ИИ-коуч и My Why', 'Дневник коучинга', 'Курсы и практики', 'Коучинг и образы', 'Поиск решений с ИИ', 'Обзор действий', 'Обзор прогресса'],
    noStages: 'Процент появится после сохранения прогресса этапа. Доступ к практикам не означает завершение.',
    stageProgress: 'Прогресс этапа', open: 'Открыть', start: 'Начать',
    lesson: 'Пройти урок', week: 'Неделя', of: 'из', courseProgress: 'Прогресс курса', completedWeeks: 'недель завершено', courseDone: 'Курс завершён', courseLoading: 'Загрузка прогресса курса…', courseError: 'Прогресс курса недоступен', courseRetry: 'Повторить',
  },
  es: {
    goals: 'Mis metas', add: 'Crear una nueva meta', empty: 'Aún no has elegido una meta. Puedes explorar las 8 etapas.',
    error: 'No se pudieron cargar las metas guardadas.', retry: 'Abrir mis metas',
    hint: 'Elige una meta para explorar sus ocho etapas.', plan: '8 etapas hacia mi meta',
    zero: 'Crear una nueva meta', zeroDetail: 'Nombra tu meta y describe el resultado deseado',
    progress: 'Progreso de la meta', unmeasured: 'Sin medir', ready: 'Disponible', active: 'Activo', done: 'Hecho', locked: 'Bloqueado',
    title: ['Definir el resultado', 'Encender la motivación', 'Construir un plan', 'Activar recursos', 'Superar obstáculos', 'Encontrar posibilidades', 'Acelerar hacia la meta', 'Resultados y nuevas perspectivas'],
    detail: ['Aclarar el resultado deseado', 'Reconectar con tu porqué', 'Planificar los próximos pasos', 'Encontrar energía y apoyo', 'Abordar bloqueos con cuidado', 'Explorar nuevas soluciones', 'Reforzar lo que funciona y ajustar las acciones', 'Revisar resultados y elegir el siguiente rumbo'],
    tool: ['Coaching de objetivos', 'Coach IA y My Why', 'Diario de coaching', 'Cursos y prácticas', 'Coaching guiado', 'Ideas con IA', 'Revisión de acciones', 'Revisión del progreso'],
    noStages: 'El porcentaje aparece cuando se guarda el avance. Abrir una práctica no significa completarla.',
    stageProgress: 'Progreso del paso', open: 'Explorar', start: 'Empezar',
    lesson: 'Hacer lección', week: 'Semana', of: 'de', courseProgress: 'Progreso del curso', completedWeeks: 'semanas completadas', courseDone: 'Curso completado', courseLoading: 'Cargando progreso…', courseError: 'Progreso no disponible', courseRetry: 'Reintentar',
  },
}
const LANDING = {
  en: { label: 'GOAL PROGRAM', title: 'My Goal', intro: 'A guided 8-week journey from intention to real results.', start: 'Start Program', details: 'Program Details', benefits: 'What you’ll gain', items: [['Clarity & Direction','Understand your goal'],['Energy & Motivation','Find your inner drive'],['Action Plan','Build your next steps'],['Real Results','Track meaningful progress']], subtitle: 'A practical path from intention to results.', current: 'My current goal', create: 'Choose what you want to work on', overview: 'Program overview' },
  ru: { label: 'ПРОГРАММА ЦЕЛИ', title: 'Моя цель', intro: '8 недель от намерения до реальных результатов — с ясностью и поддержкой.', start: 'Начать программу', details: 'О программе', benefits: 'Что даст программа', items: [['Ясность и направление','Понять свою цель'],['Энергия и мотивация','Найти внутреннюю силу'],['План действий','Определить шаги'],['Результаты','Отследить изменения']], subtitle: 'Практический путь от намерения к результату.', current: 'Моя текущая цель', create: 'Выберите, над чем хотите поработать', overview: 'Обзор программы' },
  es: { label: 'PROGRAMA DE METAS', title: 'Mi meta', intro: '8 semanas desde la intención hasta los resultados, con claridad y apoyo.', start: 'Iniciar programa', details: 'Ver programa', benefits: 'Qué conseguirás', items: [['Claridad y dirección','Comprender tu meta'],['Energía y motivación','Encontrar tu impulso'],['Plan de acción','Definir tus pasos'],['Resultados','Medir tu progreso']], subtitle: 'Un camino práctico hacia los resultados.', current: 'Mi meta actual', create: 'Elige en qué quieres trabajar', overview: 'Resumen del programa' },
}
const percent = value => typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 100 ? Math.round(value) : null
const validGoal = goal => goal && typeof goal.title === 'string' && goal.title.trim() && VALID_GOALS.has(goal.status)
export function goalList(data) {
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
export default function ProfileGoalConsole({ locale = 'en', root = '/en/app', accountId = null, children, selectedGoalId = null, cabinetSnapshot = null }) {
  const lang = Object.hasOwn(COPY, locale) ? locale : 'en'
  const t = COPY[lang]
  const landing = LANDING[lang]
  const [state, setState] = useState({ owner: null, loading: Boolean(accountId), error: false, plan: null })
  const [expandedStage, setExpandedStage] = useState(null)
  const [course, setCourse] = useState({ owner: null, entries: null, error: false })
  const [courseRetry, setCourseRetry] = useState(0)
  useEffect(() => {
    if (!accountId || cabinetSnapshot) return undefined
    const controller = new AbortController()
    setExpandedStage(null)
    setState({ owner: accountId, loading: true, error: false, plan: null })
    appFetch('coaching-life-plan?locale=' + lang, undefined, 'GET', { accountId, signal: controller.signal })
      .then(plan => { if (!controller.signal.aborted) setState({ owner: accountId, loading: false, error: false, plan }) })
      .catch(() => { if (!controller.signal.aborted) setState({ owner: accountId, loading: false, error: true, plan: null }) })
    return () => controller.abort()
  }, [accountId, lang, cabinetSnapshot])
  const view = cabinetSnapshot?.owner === accountId ? cabinetSnapshot : state.owner === accountId ? state : { owner: null, loading: Boolean(accountId), error: false, plan: null }
  const goals = useMemo(() => goalList(view.plan), [view.plan])
  const selected = selectedGoalId ? goals.find(goal => String(goal.id) === selectedGoalId) || null : goals[0] || null
  const records = STEPS.map(({ id }) => selected ? stageRecord(selected, GOAL_STAGE_IDS.indexOf(id)) : null)
  const scores = records.map(row => percent(row?.progressPercent ?? row?.percent))
  const hasSelected = Boolean(selected)
  useEffect(() => {
    if (!accountId || !hasSelected || cabinetSnapshot) return undefined
    const controller = new AbortController()
    setCourse({ owner: accountId, entries: null, error: false })
    const scopedFetch = (path, body, method, options) => appFetch(path, body, method, {...options, signal: controller.signal})
    collectJournalExport(scopedFetch, accountId, () => !controller.signal.aborted)
      .then(result => { if (!controller.signal.aborted) setCourse({ owner: accountId, entries: result.entries, error: false }) })
      .catch(() => { if (!controller.signal.aborted) setCourse({ owner: accountId, entries: null, error: true }) })
    return () => controller.abort()
  }, [accountId, hasSelected, courseRetry, cabinetSnapshot])
  const courseView = cabinetSnapshot?.owner === accountId ? {entries:cabinetSnapshot.entries,error:cabinetSnapshot.entriesError} : course.owner === accountId ? course : {entries: null, error: false}
  const goalId = selected ? String(selected.id) : null
  const progress = useMemo(() => courseView.entries && goalId ? guideGoalProgress(courseView.entries, goalId) : null, [courseView.entries, goalId])
  const overall = progress?.percent ?? null
  const next = progress?.next
  const lessonHref = next && goalId ? profileDaybookHref(root, goalId, next.week, next.step) : null
  const goalHref = lessonHref || profileDaybookHref(root, goalId)
  const ready = !view.loading && !view.error
  const showLanding = ready && !selected
  const startHref = root + '/daybook?start=vector'
  return <section className={css.console} data-profile-goal-console data-account-scoped={Boolean(accountId)} data-goal-selected={Boolean(selected)}>
    {showLanding && <header className={css.programHero} data-goal-program-landing data-profile-space-scenic>
      <p className={css.programEyebrow}><Target size={20} aria-hidden="true"/>{landing.label}</p>
      <h1>{landing.title}</h1><p className={css.programIntro}>{landing.intro}</p>
      <ProfileProgramRequest locale={lang} program="goal"/>
    </header>}
    {!selectedGoalId && goals.length > 1 && <div className={css.goalStrip} aria-label={t.goals}>
      <h2 className={css.stripTitle}><Target size={18} aria-hidden="true" />{t.goals} ({goals.length})</h2>
      {goals.map(goal => {
        const active = selected?.id === goal.id
        return <Link key={goal.id} href={active ? goalHref : profileDaybookHref(root, String(goal.id))} prefetch={false} className={active ? css.goalActive : css.goalChip}
          data-profile-goal-link={goal.id}>
          <Target size={23} aria-hidden="true" />
          <strong>{goal.title}</strong>{active && <CheckCircle2 size={19} aria-hidden="true" />}
        </Link>
      })}
    </div>}
    {view.loading && <p className={css.notice} role="status">…</p>}
    {view.error && <p className={css.notice} role="alert">{t.error} <Link href={root + '/daybook?tab=goals'}>{t.retry}</Link></p>}
    {!view.loading && !view.error && !selected && <span className={css.emptyHint} data-goal-empty-state hidden>{t.empty}</span>}
    {selected && !view.loading && !view.error && <>
        <div className={css.selectedGoal} data-goal-program-active>
          <div className={css.activeHero} data-profile-space-scenic><p className={css.programEyebrow}><Target size={20} aria-hidden="true"/>{landing.label}</p><h1>{selected.title}</h1>{typeof selected.desiredOutcome === 'string' && selected.desiredOutcome.trim() && <p className={css.programIntro}>{selected.desiredOutcome}</p>}</div>
          <Link className={css.goalSummary} href={goalHref} prefetch={false} data-profile-goal-summary><div className={css.goalText}><span>{landing.current}</span><h2>{t.courseProgress}</h2>
          </div>
          <div className={css.circle} style={{ '--hh-circle-value': (overall ?? 0) + '%' }}
            aria-label={t.courseProgress + ': ' + (overall === null ? t.unmeasured : overall + '%')} role="img" data-goal-course-progress={overall ?? 'unknown'}>
            <div><strong>{overall === null ? '—' : overall + '%'}</strong><small>{t.courseProgress}</small></div>
          </div></Link>
          {progress && <div className={css.lessonMeta}><CalendarDays size={16} aria-hidden="true" /><span>{next ? t.week + ' ' + next.week + ' ' + t.of + ' 8' : t.courseDone}</span><span>{progress.completedWeeks}/8 {t.completedWeeks}</span></div>}
          {lessonHref ? <Link href={lessonHref} prefetch={false} className={css.lessonButton} data-goal-current-lesson={next.week}>
            <PlayCircle size={23} aria-hidden="true" /><strong>{t.lesson} — {t.week} {next.week}</strong><ChevronRight size={20} aria-hidden="true" />
          </Link> : progress && !next ? <div className={css.lessonComplete} role="status"><CheckCircle2 size={20} aria-hidden="true" />{t.courseDone}</div> :
            <div className={css.lessonStatus} role="status">{courseView.error || progress ? <>{t.courseError} <button type="button" onClick={() => cabinetSnapshot ? cabinetSnapshot.onRetry?.() : setCourseRetry(value => value + 1)}>{t.courseRetry}</button></> : t.courseLoading}</div>}
        </div>
        <div className={css.activeUtilities}>
          <Link href={startHref} prefetch={false} data-goal-vector-entry><Plus size={20} aria-hidden="true"/>{t.add}</Link>
          <a href="#goal-program-stages"><Info size={20} aria-hidden="true"/>{landing.details}</a>
        </div>
      </>}
    {showLanding && <section className={css.benefits} aria-label={landing.benefits}>
      <h2>{landing.benefits}</h2>
      <div className={css.benefitGrid}>{landing.items.map(([title,detail],index)=><div key={title} className={css.benefit}>
        <span className={css.benefitPhoto} data-benefit-photo={index} aria-hidden="true"/>
        <span><strong>{title}</strong><small>{detail}</small></span>
      </div>)}</div>
    </section>}
    {showLanding && <div className={css.activeUtilities}><Link href={startHref} prefetch={false} data-goal-vector-entry><Plus size={20} aria-hidden="true"/>{t.add}</Link></div>}
    <div id="goal-program-stages" className={css.programStages}>
    <h2 className={css.stepsTitle}>{t.plan}</h2>
    <p className={css.programSubtitle}>{landing.subtitle}</p>
    <div className={css.steps}>
          {STEPS.map(({ id, icon: Icon }, index) => {
            const value = selected && !view.loading && !view.error ? scores[index] : null
            const status = selected && !view.loading && !view.error ? getStatus(records[index], value, t) : t.open
            const expanded = expandedStage === id
            return <div key={id} className={css.stageGroup} data-goal-stage-group={id}>
              <button type="button" id={'goal-stage-button-' + id} className={css.step}
                aria-expanded={expanded} aria-controls={'goal-stage-options-' + id}
                onClick={() => setExpandedStage(current => current === id ? null : id)}
                aria-label={(index + 1) + '. ' + t.title[index] + '. ' + t.tool[index] + '. ' + status}
                data-profile-mode-switch data-goal-step={index + 1} data-goal-step-status={selected && records[index]?.status || 'explore'} data-current-week={Boolean(selected && next?.week === index + 1)}>
              <span className={css.number}>{index + 1}</span>
              <Icon className={css.stepIcon} size={27} aria-hidden="true" />
              <span className={css.stepBody}><strong>{t.title[index]}</strong><small>{t.detail[index]}</small>
                {selected && value !== null && <span className={css.progressTrack}><span style={{ width: value + '%' }}/></span>}</span>
              {selected && <span className={css.stepState}>{value !== null && <b>{value + '%'}</b>}<small>{status}</small></span>}
              <ChevronDown size={18} aria-hidden="true" className={css.stageChevron} />
              </button>
              <div id={'goal-stage-options-' + id} role="region" aria-labelledby={'goal-stage-button-' + id}
                className={css.stageOptions} hidden={!expanded} data-goal-stage-options={id}>
                <Link href={profileDaybookHref(root, goalId, index + 1)} prefetch={false}
                  className={css.stageStart} data-goal-stage-start={index + 1}>
                  <PlayCircle size={21} aria-hidden="true"/><strong>{t.start}</strong><ChevronRight size={18} aria-hidden="true"/>
                </Link>
              </div>
            </div>
          })}
    </div>
    {selected && <p className={css.disclaimer}>{t.noStages}</p>}
    {selected && children && <div className={css.focusDetails}>{children}</div>}
    </div>
  </section>
}
