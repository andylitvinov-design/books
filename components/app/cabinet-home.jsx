'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import {
  ArrowRight, CalendarDays, CheckCircle2, ChevronRight, ClipboardList,
  Compass, FileText, HeartHandshake, LockKeyhole, Search, Sparkles,
} from 'lucide-react'
import { MoodCheckIn } from './mood-checkin'
import { MONITORING_CATALOG, monitoringCatalogItem } from '@/data/assessments/catalog'
import { getAssessmentDefinition, getDefinitionById } from '@/lib/assessments/definitions'
import { rankAssessmentDefinitions, TEST_RECOMMENDATION_FOCUS } from '@/lib/assessments/test-recommendations'
import { profileCompletionRecommendations } from '@/lib/profile/summary'
import styles from './cabinet-home.module.css'

const COPY = {
  en: {
    private: 'PRIVATE SPACE', greeting: 'Welcome home', headline: 'A clearer picture of how you feel.',
    intro: 'Choose a useful next step, explore your tests and keep your results together — all at your own pace.',
    testCta: 'Find my tests', historyCta: 'View my results', safe: 'Your results are private. Tests are for self-observation, not diagnosis.',
    checkin: 'CHECK IN', tests: 'Saved results', progress: 'Profile layers', latest: 'Last check',
    none: 'Not yet', next: 'YOUR NEXT STEP', continue: 'Continue your test', start: 'Start a check-in',
    continueText: 'You have an unfinished assessment. Pick up exactly where you left off.',
    startText: 'A short self-check is a simple place to begin. You can review the result afterwards.',
    active: 'YOUR TEST SET', completed: 'completed', resumeSet: 'Continue my test set',
    explorerKicker: 'EXPLORE TESTS', exploreTitle: 'What would you like to understand?',
    exploreText: 'Choose a topic or describe what is on your mind. The matching tests appear below.',
    query: 'For example: anxiety, sleep, relationships, low energy…',
    all: 'All topics', showing: 'matching tests', of: 'of', minutes: 'min', questions: 'questions',
    viewAll: 'See all tests & filters', pickSet: 'Build a test set', startTest: 'Start test', retake: 'Take again', resume: 'Resume',
    more: 'See more tests', noTests: 'No matching tests. Try another topic or clear the search.',
    recordsKicker: 'YOUR HISTORY', recordsTitle: 'Your results, in one place',
    recordsText: 'Your completed tests and their original dates are saved here.',
    noRecords: 'No results yet. Once you complete a test, it will appear here.',
    viewHistory: 'Open history', seeResult: 'View result', reports: 'Reports from your practitioner',
    tools: 'PRACTICE', toolsTitle: 'Working with clients?', toolsText: 'Open your professional tools and documents separately from your personal results.',
    openTools: 'Open practitioner tools', privacy: 'Private by default. You decide what you share.',
  },
  ru: {
    private: 'ЛИЧНОЕ ПРОСТРАНСТВО', greeting: 'Добро пожаловать домой', headline: 'Лучше понимать себя и своё состояние.',
    intro: 'Выберите полезный следующий шаг, найдите подходящие тесты и просматривайте результаты в одном месте.',
    testCta: 'Подобрать тесты', historyCta: 'Мои результаты', safe: 'Результаты конфиденциальны. Тесты служат самонаблюдению, а не постановке диагноза.',
    checkin: 'САМОЧУВСТВИЕ', tests: 'Результатов', progress: 'Слоёв профиля', latest: 'Последний тест',
    none: 'Пока нет', next: 'СЛЕДУЮЩИЙ ШАГ', continue: 'Продолжить тест', start: 'Проверить состояние',
    continueText: 'У вас остался незавершённый тест. Продолжите с того же места.',
    startText: 'Короткий тест поможет отметить текущее состояние и сохранить результат.',
    active: 'ВАШ НАБОР ТЕСТОВ', completed: 'пройдено', resumeSet: 'Продолжить набор',
    explorerKicker: 'ПОДБОР ТЕСТОВ', exploreTitle: 'Что вы хотите лучше понять?',
    exploreText: 'Выберите тему или опишите свою проблему — подходящие тесты появятся ниже.',
    query: 'Например: тревога, сон, отношения, нехватка сил…',
    all: 'Все темы', showing: 'подходящих тестов', of: 'из', minutes: 'мин', questions: 'вопросов',
    viewAll: 'Все тесты и фильтры', pickSet: 'Собрать набор тестов', startTest: 'Начать тест', retake: 'Пройти снова', resume: 'Продолжить',
    more: 'Смотреть остальные тесты', noTests: 'Ничего не найдено. Попробуйте другую тему или очистите поиск.',
    recordsKicker: 'ИСТОРИЯ', recordsTitle: 'Ваши результаты в одном месте',
    recordsText: 'Пройденные тесты сохраняются вместе с исходными датами.',
    noRecords: 'Результатов пока нет. Они появятся здесь после прохождения теста.',
    viewHistory: 'Вся история', seeResult: 'Открыть результат', reports: 'Отчёты специалиста',
    tools: 'ПРАКТИКА', toolsTitle: 'Работаете с клиентами?', toolsText: 'Рабочие инструменты и документы находятся отдельно от личных тестов.',
    openTools: 'Кабинет практика', privacy: 'По умолчанию всё приватно. Вы решаете, чем делиться.',
  },
}

function shortDate(value, locale) {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short', year: 'numeric' }).format(date)
}

function displayTitle(item, locale) {
  return item?.title?.[locale] || item?.title?.en || item?.key || ''
}

export function CabinetHome({ data, locale = 'en', onMoodChange, onStartDefinition, onResumePlan }) {
  const c = COPY[locale] || COPY.en
  const root = '/' + locale + '/app'
  const [focus, setFocus] = useState([])
  const [query, setQuery] = useState('')
  const [busyKey, setBusyKey] = useState(null)
  const [error, setError] = useState('')
  const results = data.results || []
  const runs = data.runs || []
  const draft = runs.find((run) => ['draft', 'in_progress'].includes(run.status))
  const latestResults = [...results].sort((a, b) => Date.parse(b.measurementAt || 0) - Date.parse(a.measurementAt || 0)).slice(0, 3)
  const latest = latestResults[0]
  const profile = profileCompletionRecommendations({ snapshot: data.snapshot, results, locale })
  const activePlan = data.activeTestPlan?.status === 'active' ? data.activeTestPlan : null
  const definitions = useMemo(
    () => MONITORING_CATALOG
      .filter((item) => item.startable && item.rightsStatus === 'cleared')
      .map((item) => {
        try {
          return getAssessmentDefinition(item.key, item.version, item.instrumentLocale === 'dynamic' ? locale : item.instrumentLocale)
        } catch {
          return null
        }
      }).filter(Boolean),
    [locale],
  )
  const ranked = useMemo(
    () => rankAssessmentDefinitions(definitions, { focus }),
    [definitions, focus],
  )
  const matched = useMemo(() => {
    const words = query.trim().toLocaleLowerCase(locale)
    return ranked.filter(({ definition, matchedFocus }) => {
      if (focus.length && !matchedFocus.length) return false
      if (!words) return true
      const item = monitoringCatalogItem(definition.key)
      return [displayTitle(item, locale), item?.description?.[locale], item?.description?.en, ...(item?.topics || []), definition.title]
        .filter(Boolean).join(' ').toLocaleLowerCase(locale).includes(words)
    })
  }, [ranked, query, locale, focus])
  const explorerParams = new URLSearchParams()
  if (focus.length) explorerParams.set('focus', focus.join(','))
  if (query.trim()) explorerParams.set('q', query.trim())
  const explorerUrl = root + '/tests' + (explorerParams.size ? '?' + explorerParams.toString() : '')
  const draftDef = draft ? (() => {
    try { return getDefinitionById(draft.definitionId) } catch { return null }
  })() : null
  const nextTitle = draftDef ? displayTitle(monitoringCatalogItem(draftDef.key), locale) : null
  const recentReport = (data.savedReports || []).find((report) => report.available !== false)

  async function begin(definition) {
    if (!definition || busyKey) return
    setBusyKey(definition.key)
    setError('')
    try {
      await onStartDefinition(definition)
    } catch {
      setError(locale === 'ru' ? 'Не удалось открыть тест. Попробуйте ещё раз.' : 'Could not open this test. Please retry.')
    } finally {
      setBusyKey(null)
    }
  }

  return (
    <div className={styles.home}>
      <section className={styles.hero}>
        <div className={styles.heroCopy}>
          <p className={styles.eyebrow}><Sparkles size={15} aria-hidden="true" /> {c.private}</p>
          <p className={styles.greeting}>{c.greeting}{data.account.displayName ? ', ' + data.account.displayName : ''}.</p>
          <h1>{c.headline}</h1>
          <p className={styles.heroIntro}>{c.intro}</p>
          <div className={styles.heroActions}>
            <Link className={styles.mainButton} href={explorerUrl} prefetch={false}>{c.testCta} <ArrowRight size={18} aria-hidden="true" /></Link>
            <Link className={styles.softButton} href={root + '/history'} prefetch={false}>{c.historyCta}</Link>
          </div>
          <p className={styles.privacy}><LockKeyhole size={13} aria-hidden="true" /> {c.privacy}</p>
        </div>
        <div className={styles.moodCard}>
          <MoodCheckIn
            locale={locale}
            compact
            latestMood={data.moodCheckins?.[0] || null}
            onMoodChange={onMoodChange}
            onQuickCheckin={() => begin(getAssessmentDefinition('hh-current-state', 'v2', locale))}
          />
        </div>
      </section>

      <div className={styles.metrics} aria-label={locale === 'ru' ? 'Сводка аккаунта' : 'Account summary'}>
        <div><ClipboardList size={19} aria-hidden="true" /><span>{c.tests}</span><strong>{results.length}</strong></div>
        <div><Compass size={19} aria-hidden="true" /><span>{c.progress}</span><strong><Link className={styles.metricLink} href={root + '/portfolio'} prefetch={false}>{profile.coveredAxes.length} / 5 <ArrowRight size={14} aria-hidden="true" /></Link></strong></div>
        <div><CalendarDays size={19} aria-hidden="true" /><span>{c.latest}</span><strong className={styles.date}>{shortDate(latest?.measurementAt, locale) || c.none}</strong></div>
      </div>

      {activePlan && (
        <section className={styles.planBar}>
          <div className={styles.planIcon}><ClipboardList size={24} aria-hidden="true" /></div>
          <div className={styles.planInfo}>
            <p className={styles.eyebrow}>{c.active}</p>
            <strong>{Math.min(activePlan.completedRunIds?.length || 0, activePlan.definitionIds?.length || 0)} {c.of} {activePlan.definitionIds?.length || 0} {c.completed}</strong>
            <div className={styles.planTrack} role="progressbar" aria-valuemin={0} aria-valuemax={activePlan.definitionIds?.length || 1} aria-valuenow={activePlan.completedRunIds?.length || 0} aria-label={c.active}><span style={{ width: ((activePlan.completedRunIds?.length || 0) / Math.max(activePlan.definitionIds?.length || 1, 1) * 100) + '%' }} /></div>
          </div>
          <button type="button" className={styles.smallButton} onClick={() => onResumePlan(activePlan)}>{c.resumeSet} <ArrowRight size={16} aria-hidden="true" /></button>
        </section>
      )}

      <section className={styles.nextStep}>
        <div className={styles.nextSymbol}><Sparkles size={25} aria-hidden="true" /></div>
        <div>
          <p className={styles.eyebrow}>{c.next}</p>
          <h2>{draft ? c.continue : c.start}</h2>
          <p>{draft ? c.continueText : c.startText}</p>
          {nextTitle && <small>{nextTitle}</small>}
        </div>
        {draft ? (
          <Link className={styles.nextAction} href={root + '/runs/' + draft.id} prefetch={false}>{c.continue} <ArrowRight size={17} aria-hidden="true" /></Link>
        ) : (
          <button className={styles.nextAction} disabled={!!busyKey} onClick={() => begin(getAssessmentDefinition('hh-current-state', 'v2', locale))}>{c.start} <ArrowRight size={17} aria-hidden="true" /></button>
        )}
      </section>

      <div className={styles.columns}>
        <section className={styles.testPanel} aria-labelledby="cabinet-find-tests">
          <p className={styles.eyebrow}>{c.explorerKicker}</p>
          <div className={styles.sectionHeading}><div><h2 id="cabinet-find-tests">{c.exploreTitle}</h2><p>{c.exploreText}</p></div></div>
          <label className={styles.search}>
            <Search size={20} aria-hidden="true" />
            <span className={styles.srOnly}>{c.query}</span>
            <input value={query} onChange={(event) => setQuery(event.target.value)} type="search" placeholder={c.query} />
          </label>
          <div className={styles.focusList} role="group" aria-label={c.exploreTitle}>
            {TEST_RECOMMENDATION_FOCUS.slice(0, 8).map((item) => (
              <button type="button" key={item.key} aria-pressed={focus.includes(item.key)} onClick={() => setFocus((current) => current.includes(item.key) ? current.filter((v) => v !== item.key) : [...current, item.key])}>{item.label[locale] || item.label.en}</button>
            ))}
            {(focus.length > 0 || query.trim()) && <button type="button" className={styles.clear} onClick={() => { setFocus([]); setQuery('') }}>{c.all} ×</button>}
          </div>
          <div className={styles.resultCount}><strong>{matched.length}</strong> {c.showing} <span>· {definitions.length} {c.of === 'из' ? 'всего' : 'total'}</span></div>
          <div className={styles.testList}>
            {matched.slice(0, 3).map(({ definition }) => {
              const item = monitoringCatalogItem(definition.key)
              const unfinished = runs.find((run) => run.definitionId === definition.id && ['draft', 'in_progress'].includes(run.status))
              const completed = results.filter((result) => result.definitionId === definition.id).sort((a, b) => Date.parse(b.measurementAt) - Date.parse(a.measurementAt))[0]
              return <article className={styles.testRow} key={definition.id}>
                <div className={styles.testIcon}><ClipboardList size={22} aria-hidden="true" /></div>
                <div className={styles.testDescription}>
                  <h3>{displayTitle(item, locale)}</h3>
                  <span>{item?.questionCount || definition.questions.length} {c.questions} · ~{item?.durationMinutes || 2} {c.minutes}</span>
                  {completed && <span className={styles.done}><CheckCircle2 size={13} aria-hidden="true" /> {shortDate(completed.measurementAt, locale)}</span>}
                </div>
                {unfinished ? (
                  <Link className={styles.testAction} href={root + '/runs/' + unfinished.id} aria-label={c.resume + ': ' + displayTitle(item, locale)} prefetch={false}>{c.resume} <ChevronRight size={16} aria-hidden="true" /></Link>
                ) : (
                  <button className={styles.testAction} disabled={!!busyKey} onClick={() => begin(definition)} aria-label={(completed ? c.retake : c.startTest) + ': ' + displayTitle(item, locale)}>{completed ? c.retake : c.startTest} <ChevronRight size={16} aria-hidden="true" /></button>
                )}
              </article>
            })}
            {!matched.length && <p className={styles.empty}>{c.noTests}</p>}
          </div>
          {error && <p role="alert" className={styles.error}>{error}</p>}
          <Link className={styles.allTests} href={explorerUrl} prefetch={false}>{c.viewAll} <ArrowRight size={17} aria-hidden="true" /></Link>
        </section>

        <aside className={styles.historyPanel}>
          <div className={styles.panelHeader}>
            <p className={styles.eyebrow}>{c.recordsKicker}</p>
            <h2>{c.recordsTitle}</h2>
            <p>{c.recordsText}</p>
          </div>
          {latestResults.length ? <div className={styles.historyList}>
            {latestResults.map((result) => (
              <Link key={result.id} href={root + '/results/' + result.id} className={styles.historyItem} prefetch={false}>
                <span className={styles.historyIcon}><FileText size={20} aria-hidden="true" /></span>
                <span><strong>{displayTitle(monitoringCatalogItem(result.definitionKey), locale)}</strong><small>{shortDate(result.measurementAt, locale)}</small></span>
                <ChevronRight size={17} aria-hidden="true" />
              </Link>
            ))}
          </div> : <p className={styles.empty}>{c.noRecords}</p>}
          {recentReport && <Link className={styles.reportLink} href={root + '/reports/' + recentReport.id} prefetch={false}><FileText size={18} aria-hidden="true" />{c.reports}<ArrowRight size={15} aria-hidden="true" /></Link>}
          <Link className={styles.historyLink} href={root + '/history'} prefetch={false}>{c.viewHistory} <ArrowRight size={17} aria-hidden="true" /></Link>
          <div className={styles.support}>
            <HeartHandshake size={24} aria-hidden="true" />
            <span>{locale === 'ru' ? 'Нужна личная поддержка?' : 'Want personal support?'}</span>
            <Link href={root + '/consultations'} prefetch={false}>{locale === 'ru' ? 'Консультации' : 'Consultations'} <ArrowRight size={15} aria-hidden="true" /></Link>
          </div>
        </aside>
      </div>
      {data.practitioner && <aside className={styles.practiceStrip}>
        <div><p className={styles.eyebrow}>{c.tools}</p><h2>{c.toolsTitle}</h2><p>{c.toolsText}</p></div>
        <Link href={root + '/tools'} prefetch={false}>{c.openTools} <ArrowRight size={16} aria-hidden="true" /></Link>
      </aside>}
      <p className={styles.safetyNote}>{c.safe}</p>
    </div>
  )
}
