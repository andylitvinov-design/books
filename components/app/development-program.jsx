'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, BookOpen, CheckCircle2, ChevronDown, CircleHelp, LockKeyhole, Save, SlidersHorizontal, Sparkles, Target } from 'lucide-react'
import { PORTRAIT_SECTORS } from '@/lib/assessments/portrait-sectors'
import { TEST_EXPLORER_AXIS_LABELS } from '@/lib/assessments/test-explorer'
import { buildDevelopmentPlan, DEFAULT_DEVELOPMENT_TARGETS, DEVELOPMENT_GOALS_VERSION } from '@/lib/profile/development-program'
import { appFetch } from '@/lib/app/client-fetch'
import styles from './development-program.module.css'

const words = {
  ru: {
    eyebrow: 'МОЙ МАРШРУТ РАЗВИТИЯ',
    title: 'Программа развития',
    description: 'Выберите, к чему хотите прийти. Сопоставим цели с вашими тестами и покажем самые важные направления практики.',
    open: 'Настроить мою программу', close: 'Свернуть',
    goals: 'Желаемые ориентиры', goalHint: 'Цель от 0 до 100 — ваш личный ориентир внутри шкал, а не медицинская норма.',
    measured: 'Сейчас', notMeasured: 'Нет замера', target: 'Цель', axes: 'подтверждённых направлений',
    details: 'Уточнить цели по отдельным шкалам', detailsHint: 'По умолчанию каждая шкала наследует цель своей сферы.',
    fineTune: 'Своя цель', inherit: 'Общая цель', save: 'Сохранить цели и подобрать программу',
    saving: 'Сохраняем…', saved: 'Цели сохранены в личном кабинете.',
    loadError: 'Не удалось получить сохранённые цели. Попробуйте открыть раздел снова.',
    saveError: 'Не удалось сохранить цели. Изменения пока доступны только на этом экране.',
    conflict: 'Цели изменились в другой вкладке. Обновите страницу, чтобы не перезаписать их.',
    results: 'Ваши направления роста', resultsDesc: 'Сначала направления с самым большим разрывом между желаемой и текущей позицией.',
    source: 'По тесту', position: 'Позиция', difference: 'До цели', more: 'Остальные шкалы',
    allScales: 'Показать все измеренные шкалы', less: 'Свернуть шкалы',
    report: 'Отчёт теста', tests: 'Дополнить замеры',
    noTests: 'Для расчёта ещё недостаточно подходящих недавних результатов. Выберите тесты: нулевые значения мы не подставляем.',
    missing: 'Пока не измерены', missingHint: 'Эти направления не считаются слабыми и не участвуют в подборе.',
    noGap: 'По доступным шкалам нет положительного разрыва с выбранными целями. При желании измените цели или уточните измерения.',
    courses: 'Подходящие курсы и программы', courseHint: 'Подбор учебных тем по выбранным целям и результатам, а не медицинское назначение.',
    now: 'Доступен', planned: 'Готовится', start: 'Открыть курс', catalog: 'Посмотреть все курсы',
    missingCourse: 'Сначала нужны измерения или изменённые цели, чтобы подобрать темы программы.',
    methodology: 'Как рассчитывается приоритет',
    methodText: 'Разрыв = желаемая позиция минус текущая, только когда разница положительная. Для разных тестов используется направление шкалы из проверенной методологии. Показатели из разных опросников не являются одной универсальной оценкой здоровья, не сравниваются с нормой и не используются для постановки диагнозов. Неизмеренные и устаревшие данные исключены.',
    private: 'Ваши цели хранятся отдельно от ответов тестов. Без вашего действия программа не назначается и специалисту ничего не отправляется.',
    scoreNote: '≈ ориентировочная позиция по имеющимся шкалам, не процент психологического здоровья',
  },
  en: {
    eyebrow: 'MY DEVELOPMENT PATH',
    title: 'Development programme',
    description: 'Choose where you want to grow. We compare your goals with saved assessments and suggest learning priorities.',
    open: 'Set my development goals', close: 'Collapse',
    goals: 'Your desired levels', goalHint: 'A 0–100 target is your own within-scale reference, not a medical norm.',
    measured: 'Current', notMeasured: 'Not measured', target: 'Goal', axes: 'measured directions',
    details: 'Customize individual scale targets', detailsHint: 'Each scale initially inherits the target of its life area.',
    fineTune: 'Custom goal', inherit: 'Area goal', save: 'Save goals & find programmes',
    saving: 'Saving…', saved: 'Your goals are saved in your private account.',
    loadError: 'Could not retrieve saved goals. Please reopen this section.',
    saveError: 'Could not save your goals. Changes are visible on this screen only.',
    conflict: 'Goals changed in another tab. Refresh to avoid overwriting them.',
    results: 'Your growth priorities', resultsDesc: 'Areas with the greatest positive difference between your chosen targets and available measures come first.',
    source: 'Assessment', position: 'Position', difference: 'To target', more: 'Other scales',
    allScales: 'Show all measured scales', less: 'Show fewer',
    report: 'Test report', tests: 'Complete more tests',
    noTests: 'There are not yet enough recent, suitable results to calculate gaps. Choose assessments; missing values are never treated as zero.',
    missing: 'Not measured yet', missingHint: 'These areas are not considered weaknesses and are excluded from the ranking.',
    noGap: 'There is no positive gap among the available suitable results and your selected targets. You can adjust your goals or take a fresh assessment.',
    courses: 'Suggested courses and programmes', courseHint: 'Learning options based on your chosen interests and suitable results, not medical treatment plans.',
    now: 'Available', planned: 'In preparation', start: 'Open course', catalog: 'Explore all courses',
    missingCourse: 'Add suitable measures or change your goals to see specific programme themes.',
    methodology: 'How priorities are calculated',
    methodText: 'Gap = your target minus your measured position, counting only positive differences. The direction of each scale is determined by its verified methodology. Scores across different questionnaires are not one universal health score, clinical norm or diagnosis. Missing and outdated measurements are excluded.',
    private: 'Your goals are stored separately from assessment answers. No course is enrolled automatically and nothing is shared with a practitioner when you open this panel.',
    scoreNote: '≈ an approximate position from the available scales, not a psychological health percentage',
  },
}
const programmeText = {
  stress: {
    en: { title: 'OPORA · Stress Relief', detail: 'Everyday grounding, regulation, recovery and self-support.' },
    ru: { title: 'ОПОРА · Антистресс', detail: 'Практики устойчивости, саморегуляции, восстановления и поддержки себя.' },
  },
  confidence: {
    en: { title: 'Inner Confidence', detail: 'Self-support, relationships and healthy boundaries.' },
    ru: { title: 'Внутренняя уверенность', detail: 'Опора на себя, отношения и личные границы.' },
  },
  focus: {
    en: { title: 'Focus & Energy', detail: 'Clarity, sustained attention and manageable daily actions.' },
    ru: { title: 'Фокус и энергия', detail: 'Ясность, концентрация и посильные шаги в ежедневных делах.' },
  },
}
const initialGoals = () => ({
  version: DEVELOPMENT_GOALS_VERSION,
  targets: { ...DEFAULT_DEVELOPMENT_TARGETS },
  details: {},
})
const percent = n => Number.isFinite(n) ? String(Math.round(n)) + '%' : '—'
const axisLabel = (axis, locale) => TEST_EXPLORER_AXIS_LABELS[axis]?.[locale] ||
  TEST_EXPLORER_AXIS_LABELS[axis]?.en || axis

function TargetSlider({ title, value, onChange, compact = false }) {
  return <label className={compact ? styles.subSlider : styles.slider}>
    <span className={styles.sliderTitle}>{title}</span>
    <span className={styles.sliderValue}>{percent(value)}</span>
    <input type="range" min="0" max="100" step="5" value={value}
      aria-label={title} onChange={event => onChange(Number(event.target.value))} />
    {!compact && <span className={styles.endpoints} aria-hidden="true"><span>0</span><span>100</span></span>}
  </label>
}

export default function DevelopmentProgram({ results = [], accountId, locale = 'en' }) {
  const lang = locale === 'ru' ? 'ru' : 'en'
  const t = words[lang]
  const [expanded, setExpanded] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [goals, setGoals] = useState(initialGoals)
  const [revision, setRevision] = useState(0)
  const [busy, setBusy] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [savedMessage, setSavedMessage] = useState('')
  const [dirty, setDirty] = useState(false)
  const [detailed, setDetailed] = useState(false)
  const [showPlan, setShowPlan] = useState(false)
  const [allRows, setAllRows] = useState(false)

  useEffect(() => {
    if (!expanded || !accountId || loaded) return
    let active = true
    setLoading(true)
    appFetch('development-goals', undefined, 'GET', { accountId })
      .then(value => {
        if (!active) return
        setGoals(value.goals)
        setRevision(value.revision)
        setLoaded(true)
        setShowPlan(value.revision > 0)
        setError('')
      })
      .catch(() => { if (active) setError(t.loadError) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [expanded, accountId, loaded, t.loadError])

  const plan = useMemo(() => buildDevelopmentPlan({ results, goals, locale: lang }), [results, goals, lang])
  const missing = plan.missingAxes
  const changeSector = (key, value) => {
    setGoals(previous => ({ ...previous, targets: { ...previous.targets, [key]: value } }))
    setDirty(true)
    setSavedMessage('')
    setShowPlan(false)
  }
  const changeDetail = (axis, value) => {
    setGoals(previous => ({ ...previous, details: { ...previous.details, [axis]: value } }))
    setDirty(true)
    setSavedMessage('')
    setShowPlan(false)
  }
  const toggleDetail = axis => {
    setGoals(previous => {
      const details = { ...previous.details }
      if (Object.prototype.hasOwnProperty.call(details, axis)) delete details[axis]
      else {
        const sector = PORTRAIT_SECTORS.find(item => item.axes.includes(axis))
        details[axis] = previous.targets[sector.key]
      }
      return { ...previous, details }
    })
    setDirty(true)
    setSavedMessage('')
    setShowPlan(false)
  }
  async function saveGoals() {
    if (busy || !loaded) return
    setBusy(true)
    setError('')
    setSavedMessage('')
    try {
      const value = await appFetch('development-goals', { ...goals, revision }, 'POST', { accountId })
      setGoals(value.goals)
      setRevision(value.revision)
      setDirty(false)
      setShowPlan(true)
      setSavedMessage(t.saved)
    } catch (cause) {
      setError(cause?.code === 'DEVELOPMENT_GOALS_CONFLICT' ? t.conflict : t.saveError)
    } finally {
      setBusy(false)
    }
  }

  return <section className={styles.root} data-testid="reports-development-program">
    <button type="button" className={styles.trigger} aria-expanded={expanded} aria-controls="hh-development-program-body"
      onClick={() => setExpanded(value => !value)}>
      <span className={styles.iconCircle}><Target size={21} aria-hidden="true" /></span>
      <span className={styles.triggerCopy}>
        <span className={styles.kicker}>{t.eyebrow}</span>
        <strong>{t.title}</strong>
        <small>{t.description}</small>
      </span>
      <span className={styles.triggerAction}>{expanded ? t.close : t.open}
        <ChevronDown size={17} className={expanded ? styles.rotated : ''} aria-hidden="true" />
      </span>
    </button>
    {expanded && <div className={styles.body} id="hh-development-program-body">
      <div className={styles.sectionHeading}>
        <span className={styles.pill}><SlidersHorizontal size={15} aria-hidden="true" /> {t.goals}</span>
        <p>{t.goalHint}</p>
      </div>
      {loading && <p className={styles.status} role="status">{lang === 'ru' ? 'Загружаем цели…' : 'Loading goals…'}</p>}
      <div className={styles.sectorGrid}>
        {PORTRAIT_SECTORS.map(sector => {
          const summary = plan.sectors.find(item => item.key === sector.key)
          return <article className={styles.sectorCard} key={sector.key}>
            <div className={styles.sectorTop}>
              <strong>{sector.label[lang]}</strong>
              <span>{summary?.measuredAxes ? '≈ ' + percent(summary.current) : t.notMeasured}</span>
            </div>
            <TargetSlider title={sector.label[lang]} value={goals.targets[sector.key]}
              onChange={n => changeSector(sector.key, n)} />
            <small className={styles.coverage}>{summary?.measuredAxes || 0} / {sector.axes.length} {t.axes}</small>
          </article>
        })}
      </div>
      <details className={styles.details} open={detailed} onToggle={event => setDetailed(event.currentTarget.open)}>
        <summary><span><SlidersHorizontal size={17} aria-hidden="true" />{t.details}</span><ChevronDown size={17} aria-hidden="true" /></summary>
        <p className={styles.helper}>{t.detailsHint}</p>
        {PORTRAIT_SECTORS.map(sector => <section className={styles.detailSector} key={sector.key}>
          <h4>{sector.label[lang]}</h4>
          {sector.axes.map(axis => {
            const customized = Object.prototype.hasOwnProperty.call(goals.details, axis)
            return <div className={styles.detailRow} key={axis}>
              <div className={styles.detailRowHead}>
                <span>{axisLabel(axis, lang)}</span>
                <button type="button" onClick={() => toggleDetail(axis)}
                  className={customized ? styles.customized : styles.inherit}
                  aria-pressed={customized}>{customized ? t.fineTune : t.inherit}
                </button>
              </div>
              {customized ? <TargetSlider compact title={axisLabel(axis, lang)} value={goals.details[axis]}
                onChange={n => changeDetail(axis, n)} /> :
                <span className={styles.inheritedValue}>{t.target}: {percent(goals.targets[sector.key])}</span>}
            </div>
          })}
        </section>)}
      </details>
      <div className={styles.saveArea}>
        <button type="button" className={styles.save} disabled={busy || !loaded}
          onClick={saveGoals}>
          {busy ? <Sparkles size={17} aria-hidden="true" /> : <Save size={17} aria-hidden="true" />}
          {busy ? t.saving : t.save}
          <ArrowRight size={18} aria-hidden="true" />
        </button>
        {error && <p className={styles.error} role="alert">{error}</p>}
        {savedMessage && !dirty && <p className={styles.success} role="status"><CheckCircle2 size={16} aria-hidden="true" />{savedMessage}</p>}
      </div>
      {showPlan && <div className={styles.plan} data-testid="development-recommendations">
        <header className={styles.planHeading}><span className={styles.pill}><Target size={15} aria-hidden="true" /> {t.results}</span><p>{t.resultsDesc}</p></header>
        {plan.priorities.length > 0 ? <div className={styles.priorityList}>
          {plan.priorities.slice(0, allRows ? 8 : 5).map((item, index) => <article key={item.id} className={styles.priorityCard}>
            <div className={styles.priorityIndex}>{index + 1}</div>
            <div className={styles.priorityMain}>
              <strong>{axisLabel(item.axis, lang)} <span>· {item.label}</span></strong>
              <small>{t.source}: {item.testTitle}</small>
              <div className={styles.gapTrack} role="img"
                aria-label={t.position + ': ' + percent(item.current) + '. ' + t.target + ': ' + percent(item.target)}>
                <span className={styles.currentFill} style={{ width: item.current + '%' }} />
                <span className={styles.goalMarker} style={{ left: item.target + '%' }} />
              </div>
              <div className={styles.priorityFoot}><span>{t.position}: {percent(item.current)} · {t.target}: {percent(item.target)}</span>
                <Link href={'/' + lang + '/app/results/' + encodeURIComponent(item.resultId)} prefetch={false}>{t.report} <ArrowRight size={13} aria-hidden="true" /></Link>
              </div>
            </div>
            <span className={styles.gapValue}>+{percent(item.gap)}</span>
          </article>)}
        </div> : <p className={styles.empty}>{plan.rows.length ? t.noGap : t.noTests}</p>}
        {plan.priorities.length > 5 && <button type="button" className={styles.textButton} onClick={() => setAllRows(value => !value)}>
          {allRows ? t.less : t.allScales}<ChevronDown size={15} aria-hidden="true" />
        </button>}
        {missing.length > 0 && <div className={styles.missing}>
          <div><CircleHelp size={17} aria-hidden="true" /><strong>{t.missing} ({missing.length})</strong></div>
          <p>{missing.map(axis => axisLabel(axis, lang)).join(' · ')}</p>
          <small>{t.missingHint}</small>
          <Link href={'/' + lang + '/app/tests?profile=missing'} prefetch={false}>{t.tests}<ArrowRight size={15} aria-hidden="true" /></Link>
        </div>}
        <div className={styles.courseSection}>
          <div className={styles.sectionHeading}><span className={styles.pill}><BookOpen size={16} aria-hidden="true" />{t.courses}</span><p>{t.courseHint}</p></div>
          {plan.courses.length ? <div className={styles.courses}>
            {plan.courses.map(course => {
              const copy = programmeText[course.id]?.[lang]
              return <article key={course.id} className={styles.courseCard}>
                <div className={styles.courseTop}><span className={course.available ? styles.available : styles.planned}>
                  {course.available ? t.now : t.planned}</span><strong>{copy?.title || course.id}</strong></div>
                <p>{copy?.detail}</p>
                <small>{course.matchedAxes.map(axis => axisLabel(axis, lang)).join(' · ')}</small>
                {course.available && <Link href={'/' + lang + '/app/course?program=' + course.id} prefetch={false}>
                  {t.start}<ArrowRight size={16} aria-hidden="true" /></Link>}
              </article>
            })}
          </div> : <p className={styles.empty}>{t.missingCourse}</p>}
          <Link className={styles.catalogLink} href={'/' + lang + '/academy'} prefetch={false}>{t.catalog}<ArrowRight size={16} aria-hidden="true" /></Link>
        </div>
      </div>}
      <details className={styles.method}>
        <summary><CircleHelp size={16} aria-hidden="true" />{t.methodology}<ChevronDown size={15} aria-hidden="true" /></summary>
        <p>{t.methodText}</p>
      </details>
      <p className={styles.privacy}><LockKeyhole size={14} aria-hidden="true" />{t.private}</p>
      <p className={styles.privacy}>{t.scoreNote}</p>
    </div>}
  </section>
}
