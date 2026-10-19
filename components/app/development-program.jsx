'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, BookOpen, CheckCircle2, ChevronDown, CircleHelp, ClipboardList, LockKeyhole, Save, SlidersHorizontal, Sparkles, Target } from 'lucide-react'
import { PORTRAIT_SECTORS, PORTRAIT_AXIS_ORDER } from '@/lib/assessments/portrait-sectors'
import { buildPsychPortrait } from '@/lib/assessments/psych-portrait'
import { buildExplorerEntries } from '@/lib/assessments/test-explorer'
import { recommendUnmeasuredPortraitTests } from '@/lib/profile/portrait-test-suggestions'
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
    goalLink: 'Установить ориентиры и цели', goalLinkHint: 'Четыре сферы и отдельные шкалы',
    planLink: 'Просмотреть рекомендованную программу развития', planLinkHint: 'Приоритеты роста и подходящие курсы',
    defaultGoalsPreview: 'Пока личные цели не сохранены, автоматический подбор отключён. Начальные ползунки — только образец для редактирования, а не психологическая норма.',
    unsavedGoalsPreview: 'Это предварительный подбор по несохранённым изменениям. Сохраните цели, чтобы закрепить ваш маршрут.',
    goals: 'Желаемые ориентиры', goalHint: 'Ползунки — добровольные личные ориентиры, а не нормы здоровья. Неподходящие для оценки развития шкалы исключены из рекомендаций.',
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
    profileKicker: 'БЕСПЛАТНО · МОЙ ПРОФИЛЬ',
    profileTitle: 'Узнайте себя лучше',
    profileIntro: 'Пройдите пару подходящих тестов, чтобы дополнить ваш психологический портрет. Результаты останутся в личном кабинете.',
    profileProgress: 'направлений исследовано',
    profileMissing: 'Можно ещё исследовать',
    profileMinutes: 'мин', profileQuestions: 'вопросов',
    profileStart: 'Пройти тест',
    profileShowAll: 'Смотреть все рекомендованные тесты',
    profileMore: 'ещё',
    profileBrowse: 'Выбрать другие тесты',
    profileNoTests: 'Подходящих новых бесплатных тестов сейчас нет. Можно выбрать другие в каталоге.',
    profileNote: 'Неисследованные стороны не являются недостатками. Вы сами выбираете, какие тесты проходить.',
    noGap: 'По доступным шкалам нет положительного разрыва с выбранными целями. При желании измените цели или уточните измерения.',
    courses: 'Подходящие курсы и программы', courseHint: 'Подбор учебных тем по выбранным целям и результатам, а не медицинское назначение.',
    now: 'Доступен', planned: 'Готовится', start: 'Открыть курс', catalog: 'Посмотреть все курсы',
    missingCourse: 'Сначала нужны измерения или изменённые цели, чтобы подобрать темы программы.',
    methodology: 'Как рассчитывается приоритет',
    methodText: 'Разрыв = желаемая позиция минус текущая, только когда разница положительная. Для разных тестов используется направление шкалы из проверенной методологии. Показатели из разных опросников не являются одной универсальной оценкой здоровья, не сравниваются с нормой и не используются для постановки диагнозов. Неизмеренные и устаревшие данные исключены.',
    private: 'Ваши цели хранятся отдельно от ответов тестов. Без вашего действия программа не назначается и специалисту ничего не отправляется.',
    scoreNote: 'Позиции отдельных опросников нельзя считать общей оценкой здоровья или сравнивать как клинические процентили.',
  },
  en: {
    eyebrow: 'MY DEVELOPMENT PATH',
    title: 'Development programme',
    description: 'Choose where you want to grow. We compare your goals with saved assessments and suggest learning priorities.',
    open: 'Set my development goals', close: 'Collapse',
    goalLink: 'Set goals & targets', goalLinkHint: 'Four areas and individual scales',
    planLink: 'View recommended development programme', planLinkHint: 'Growth priorities and suitable courses',
    defaultGoalsPreview: 'No personal targets are saved yet. The starting sliders are editable placeholders, not a psychological norm; recommendations start after you save.',
    unsavedGoalsPreview: 'This preview uses unsaved changes. Save your targets to keep your development path.',
    goals: 'Your desired levels', goalHint: 'Sliders are optional personal preferences, not health norms; unsuitable measures cannot drive recommendations.',
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
    profileKicker: 'FREE · MY PROFILE',
    profileTitle: 'Discover more about yourself',
    profileIntro: 'Try a couple of relevant questionnaires to build a fuller personal portrait. Your results stay in your private Cabinet.',
    profileProgress: 'areas explored',
    profileMissing: 'Still to explore',
    profileMinutes: 'min', profileQuestions: 'questions',
    profileStart: 'Take test',
    profileShowAll: 'See all recommended tests',
    profileMore: 'more',
    profileBrowse: 'Explore other tests',
    profileNoTests: 'No new free questionnaires currently match these areas. You can browse the full test catalog.',
    profileNote: 'Unexplored areas are not weaknesses. You choose which questionnaires feel useful.',
    noGap: 'There is no positive gap among the available suitable results and your selected targets. You can adjust your goals or take a fresh assessment.',
    courses: 'Suggested courses and programmes', courseHint: 'Learning options based on your chosen interests and suitable results, not medical treatment plans.',
    now: 'Available', planned: 'In preparation', start: 'Open course', catalog: 'Explore all courses',
    missingCourse: 'Add suitable measures or change your goals to see specific programme themes.',
    methodology: 'How priorities are calculated',
    methodText: 'Gap = your target minus your measured position, counting only positive differences. The direction of each scale is determined by its verified methodology. Scores across different questionnaires are not one universal health score, clinical norm or diagnosis. Missing and outdated measurements are excluded.',
    private: 'Your goals are stored separately from assessment answers. No course is enrolled automatically and nothing is shared with a practitioner when you open this panel.',
    scoreNote: 'Positions from different questionnaires are not an overall health grade or comparable clinical percentiles.',
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
    en: { title: 'Focus & Energy', detail: 'Sustainable energy, attention and a calmer mind.' },
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
  const [expanded, setExpanded] = useState(true)
  const [loaded, setLoaded] = useState(false)
  const [goals, setGoals] = useState(initialGoals)
  const [revision, setRevision] = useState(0)
  const [busy, setBusy] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [savedMessage, setSavedMessage] = useState('')
  const [dirty, setDirty] = useState(false)
  const [detailed, setDetailed] = useState(false)
  const [activePanel, setActivePanel] = useState(null)
  const [allRows, setAllRows] = useState(false)

  useEffect(() => {
    const openGoalsLink = () => {
      if (window.location.hash !== '#hh-development-program') return
      setExpanded(true)
      setActivePanel('goals')
      // The target is an existing private-account panel; opening a URL is not consent to save.
      requestAnimationFrame(() => document.getElementById('hh-development-program')?.scrollIntoView({block:'start'}))
    }
    openGoalsLink()
    window.addEventListener('hashchange', openGoalsLink)
    return () => window.removeEventListener('hashchange', openGoalsLink)
  }, [])

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
        if (value.revision > 0) setActivePanel(current => current ?? 'plan')
        setError('')
      })
      .catch(() => { if (active) setError(t.loadError) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [expanded, accountId, loaded, t.loadError])

  const plan = useMemo(() => buildDevelopmentPlan({ results, goals, locale: lang }), [results, goals, lang])
  // Unlike growth-goal eligibility, portrait coverage includes audited descriptive
  // measurements. Never label an answered, descriptive profile area as missing.
  const portrait = useMemo(() => activePanel === 'plan' ? buildPsychPortrait(results) : null,
    [activePanel, results])
  const missingPortraitAxes = useMemo(() => portrait
    ? PORTRAIT_AXIS_ORDER.filter(axis => !portrait.axes[axis]) : [], [portrait])
  const recommendedTests = useMemo(() => missingPortraitAxes.length
    ? recommendUnmeasuredPortraitTests({
        entries: buildExplorerEntries({ locale: lang, audience: 'account' }),
        results, missingAxes: missingPortraitAxes,
      }) : [], [missingPortraitAxes, results, lang])
  const changeSector = (key, value) => {
    setGoals(previous => ({ ...previous, targets: { ...previous.targets, [key]: value } }))
    setDirty(true)
    setSavedMessage('')
  }
  const changeDetail = (axis, value) => {
    setGoals(previous => ({ ...previous, details: { ...previous.details, [axis]: value } }))
    setDirty(true)
    setSavedMessage('')
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
      setActivePanel('plan')
      setSavedMessage(t.saved)
    } catch (cause) {
      setError(cause?.code === 'DEVELOPMENT_GOALS_CONFLICT' ? t.conflict : t.saveError)
    } finally {
      setBusy(false)
    }
  }

  return <section id="hh-development-program" className={styles.root} data-testid="reports-development-program">
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
      <div className={styles.sectionLinks} role="group" aria-label={t.title}>
        <button type="button" className={styles.sectionLink} aria-expanded={activePanel === 'goals'}
          aria-controls="hh-development-goals-panel" onClick={() => setActivePanel(value => value === 'goals' ? null : 'goals')}>
          <span className={styles.sectionLinkIcon}><SlidersHorizontal size={18} aria-hidden="true" /></span>
          <span className={styles.sectionLinkCopy}><strong>{t.goalLink}</strong><small>{t.goalLinkHint}</small></span>
          <ChevronDown size={18} className={activePanel === 'goals' ? styles.rotated : ''} aria-hidden="true" />
        </button>
        <button type="button" className={styles.sectionLink} aria-expanded={activePanel === 'plan'}
          aria-controls="hh-development-recommendations-panel" onClick={() => setActivePanel(value => value === 'plan' ? null : 'plan')}>
          <span className={styles.sectionLinkIcon}><BookOpen size={18} aria-hidden="true" /></span>
          <span className={styles.sectionLinkCopy}><strong>{t.planLink}</strong><small>{t.planLinkHint}</small></span>
          <ChevronDown size={18} className={activePanel === 'plan' ? styles.rotated : ''} aria-hidden="true" />
        </button>
        {(savedMessage || (loaded && revision > 0 && !dirty)) && !dirty && <p className={styles.success} role="status"><CheckCircle2 size={16} aria-hidden="true" />{savedMessage || t.saved}</p>}
      </div>
      {loading && <p className={styles.status} role="status">{lang === 'ru' ? 'Загружаем цели…' : 'Loading goals…'}</p>}
      {error && <p className={styles.error} role="alert">{error}</p>}
      {activePanel === 'goals' && <div id="hh-development-goals-panel" className={styles.panel}>
      <div className={styles.sectionHeading}>
        <span className={styles.pill}><SlidersHorizontal size={15} aria-hidden="true" /> {t.goals}</span>
        <p>{t.goalHint}</p>
      </div>
      <div className={styles.sectorGrid}>
        {PORTRAIT_SECTORS.map(sector => {
          const summary = plan.sectors.find(item => item.key === sector.key)
          return <article className={styles.sectorCard} key={sector.key}>
            <div className={styles.sectorTop}>
              <strong>{sector.label[lang]}</strong>
              <span>{summary?.measuredAxes ? (summary.measuredAxes + ' / ' + sector.axes.length) : t.notMeasured}</span>
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
      </div>
      </div>}
      {activePanel === 'plan' && <div id="hh-development-recommendations-panel" className={`${styles.panel} ${styles.planPanel}`}>
        {!loaded ? <p className={styles.status}>{loading ? (lang === 'ru' ? 'Загружаем цели…' : 'Loading goals…') : t.loadError}</p> : <>
        {revision === 0 && !dirty && <p className={styles.previewNote}>{t.defaultGoalsPreview}</p>}
        {dirty && <p className={styles.previewNote}>{t.unsavedGoalsPreview}</p>}
        <div className={styles.plan} data-testid="development-recommendations">
        <header className={styles.planHeading}><span className={styles.pill}><Target size={15} aria-hidden="true" /> {t.results}</span><p>{t.resultsDesc}</p></header>
        {revision === 0 && !dirty ? <p className={styles.empty}>{t.defaultGoalsPreview}</p> : plan.priorities.length > 0 ? <div className={styles.priorityList}>
          {(allRows ? plan.priorities : plan.priorities.slice(0, 3)).map((item, index) => <article key={item.id} className={styles.priorityCard}>
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
        {plan.priorities.length > 3 && <button type="button" className={styles.textButton} onClick={() => setAllRows(value => !value)}>
          {allRows ? t.less : t.allScales}<ChevronDown size={15} aria-hidden="true" />
        </button>}
        </div>
        {portrait && missingPortraitAxes.length > 0 && <section className={styles.profileInvitation}
          aria-labelledby="hh-profile-invitation-title" data-testid="development-profile-tests">
          <div className={styles.profileInvitationHeader}>
            <span className={styles.profileInvitationIcon} aria-hidden="true"><ClipboardList size={24} /></span>
            <div className={styles.profileInvitationHeading}>
              <span className={styles.profileInvitationKicker}>{t.profileKicker}</span>
              <h3 id="hh-profile-invitation-title">{t.profileTitle}</h3>
              <p>{t.profileIntro}</p>
            </div>
            <span className={styles.profileInvitationProgress}>{portrait.answeredCount} / {portrait.totalCount}
              <small>{t.profileProgress}</small>
            </span>
          </div>
          <p className={styles.profileInvitationMissing}>
            {t.profileMissing}: {missingPortraitAxes.slice(0, 3).map(axis => axisLabel(axis, lang)).join(' · ')}
            {missingPortraitAxes.length > 3 ? ' · +' + (missingPortraitAxes.length - 3) : ''}
          </p>
          {recommendedTests.length > 0 ? <div className={styles.profileTestList}>
            {recommendedTests.slice(0, 2).map((test, index) => <Link
              key={test.key} href={'/' + lang + '/app/monitoring/' + encodeURIComponent(test.key)}
              prefetch={false} className={styles.profileTestCard} data-recommended-profile-test={test.key}>
              <span className={styles.profileTestNumber}>0{index + 1}</span>
              <span className={styles.profileTestCopy}>
                <strong>{test.title}</strong>
                <small>{test.durationMinutes ? '~' + test.durationMinutes + ' ' + t.profileMinutes : ''}
                  {test.durationMinutes && test.questionCount ? ' · ' : ''}
                  {test.questionCount ? test.questionCount + ' ' + t.profileQuestions : ''}</small>
                <span>{test.covers.slice(0, 3).map(axis => axisLabel(axis, lang)).join(' · ')}</span>
              </span>
              <span className={styles.profileTestAction}>{t.profileStart}<ArrowRight size={18} aria-hidden="true" /></span>
            </Link>)}
          </div> : <p className={styles.profileNoTests}>{t.profileNoTests}</p>}
          {recommendedTests.length > 2 && <details className={styles.profileTestMore}>
            <summary>
              <span>{t.profileShowAll}</span>
              <span>{recommendedTests.length - 2} {t.profileMore}<ChevronDown size={17} aria-hidden="true" /></span>
            </summary>
            <div className={styles.profileTestMoreList}>
              {recommendedTests.slice(2).map(test => <Link
                key={test.key} href={'/' + lang + '/app/monitoring/' + encodeURIComponent(test.key)}
                prefetch={false} className={styles.profileTestMoreRow} data-recommended-profile-test={test.key}>
                <span><strong>{test.title}</strong>
                  <small>{test.durationMinutes ? '~' + test.durationMinutes + ' ' + t.profileMinutes : ''}
                    {test.durationMinutes && test.questionCount ? ' · ' : ''}
                    {test.questionCount ? test.questionCount + ' ' + t.profileQuestions : ''}</small></span>
                <ArrowRight size={17} aria-hidden="true" />
              </Link>)}
            </div>
          </details>}
          <div className={styles.profileInvitationFooter}>
            <small>{t.profileNote}</small>
            <Link href={'/' + lang + '/app/tests?explore=1'} prefetch={false}>
              {t.profileBrowse}<ArrowRight size={15} aria-hidden="true" />
            </Link>
          </div>
        </section>}
        <div className={styles.courseSection}>
          <div className={styles.sectionHeading}><span className={styles.pill}><BookOpen size={16} aria-hidden="true" />{t.courses}</span><p>{t.courseHint}</p></div>
          {(revision > 0 || dirty) && plan.courses.length ? <div className={styles.courses}>
            {plan.courses.map(course => {
              const copy = programmeText[course.id]?.[lang]
              return <article key={course.id} className={styles.courseCard}>
                <span className={`${styles.courseArtwork} ${styles[course.id + 'Artwork'] || ''}`} aria-hidden="true" />
                <div className={styles.courseContent}>
                  <div className={styles.courseTop}><span className={course.available ? styles.available : styles.planned}>
                    {course.available ? t.now : t.planned}</span><strong>{copy?.title || course.id}</strong></div>
                  <p>{copy?.detail}</p>
                  <small>{course.matchedAxes.map(axis => axisLabel(axis, lang)).join(' · ')}</small>
                </div>
                {course.available && <Link className={styles.courseAction} href={'/' + lang + '/app/course?program=' + course.id} prefetch={false}>
                  {t.start}<ArrowRight size={16} aria-hidden="true" /></Link>}
              </article>
            })}
          </div> : <p className={styles.empty}>{t.missingCourse}</p>}
          <Link className={styles.catalogLink} href={'/' + lang + '/academy'} prefetch={false}>{t.catalog}<ArrowRight size={16} aria-hidden="true" /></Link>
        </div>
      <details className={styles.method}>
        <summary><CircleHelp size={16} aria-hidden="true" />{t.methodology}<ChevronDown size={15} aria-hidden="true" /></summary>
        <p>{t.methodText}</p>
      </details>
      <p className={styles.privacy}><LockKeyhole size={14} aria-hidden="true" />{t.private}</p>
      <p className={styles.privacy}>{t.scoreNote}</p>
        </>}
      </div>}
    </div>}
  </section>
}
