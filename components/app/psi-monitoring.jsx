'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { MoodCheckIn } from './mood-checkin'
import { labelFor } from './copy'
import { getAssessmentDefinition } from '@/lib/assessments/definitions'
import { compareResults } from '@/lib/profile/history'
import {
  axisOverview,
  compatibleSeries,
  dailyMoodSeries,
  deterministicPatterns,
  latestCompatibleChange,
  monitoringPlan,
  recommendMonitoring,
} from '@/lib/assessments/monitoring'
import { monitoringCatalogItem } from '@/data/assessments/catalog'

const UI = {
  en: {
    title: 'Psi-Monitoring',
    subtitle: 'Track how your state changes over time.',
    privacy:
      'Private by default. Nothing is shared with a practitioner unless you explicitly choose to share one item.',
    recommended: 'Recommended next',
    upToDate: 'You are up to date. You can check in with your mood or explore another area when it feels useful.',
    plan: 'My Monitoring',
    recent: 'Recent change',
    axes: 'Your monitoring areas',
    moodTrend: 'Recent mood',
    moodTrendNote: 'Latest check-in for each local day. Mood is a state marker, not a score.',
    patterns: 'Your patterns',
    patternsNote:
      'Shown only after at least three compatible measurements. These are observations, not causes or diagnoses.',
    allTests: 'Explore all tests',
    openCatalog: 'Open full test catalog',
    start: 'Start',
    resume: 'Resume',
    repeat: 'Repeat',
    result: 'View result',
    trend: 'View trend',
    history: 'History',
    notMeasured: 'Not measured yet',
    noStartable: 'No startable measure is enabled in this area yet.',
    dueReason: 'This check is due based on its suggested repeat window.',
    incompleteReason: 'You have not completed this check yet.',
    resumeReason: 'You already started this check.',
    currentReason: 'Your latest measurement is still current.',
    completedReason: 'Baseline completed.',
    dueSoonReason: 'This check will be due soon.',
    status: {
      in_progress: 'In progress',
      not_completed: 'Not completed',
      completed: 'Completed',
      up_to_date: 'Up to date',
      due_soon: 'Due soon',
      due_now: 'Due now',
      planned: 'Planned',
    },
    axis: {
      state: 'State',
      symptoms: 'Symptoms',
      function: 'Function',
      resources: 'Resources',
      baseline: 'Baseline',
    },
    axisText: {
      state: 'What can change from day to day or week to week.',
      symptoms: 'Specific symptom measures only when they are appropriate and source-cleared.',
      function: 'How your current state affects daily life and activity.',
      resources: 'Support, recovery and protective factors.',
      baseline: 'More stable background measures that usually do not need frequent repetition.',
    },
    trendTitle: 'Measurement history',
    current: 'Current',
    previous: 'Previous',
    first: 'First measurement',
    compare: 'Compare measurements',
    from: 'From',
    to: 'To',
    dimension: 'Dimension',
    range: 'Range',
    days30: '30 days',
    months3: '3 months',
    all: 'All time',
    baselineRecorded:
      'Baseline recorded. Future compatible measurements can be compared with this one.',
    noTrend: 'A second compatible measurement will make comparison possible.',
    back: 'Back to Psi-Monitoring',
    points: 'points',
    improving: 'improving',
    declining: 'moving in a less favorable direction',
    stable: 'stable',
    higher: 'higher than the earlier measurement',
    lower: 'lower than the earlier measurement',
    changedAcross: 'across the last',
    measurements: 'measurements',
    lastMeasurement: 'Last measurement',
    plannedChecks: 'Planned checks',
    plannedNote:
      'These entries are visible as roadmap metadata only. They cannot be started until their source, language, rights and safety workflow are cleared.',
  },
  ru: {
    title: 'Пси-мониторинг',
    subtitle: 'Наблюдайте, как меняется ваше состояние со временем.',
    privacy:
      'По умолчанию всё приватно. Ничего не передаётся специалисту, пока вы сами явно не выберете конкретный результат.',
    recommended: 'Что пройти следующим',
    upToDate:
      'Сейчас всё актуально. Можно просто отметить настроение или исследовать другую область, когда это будет полезно.',
    plan: 'Мой мониторинг',
    recent: 'Последнее изменение',
    axes: 'Области наблюдения',
    moodTrend: 'Настроение в последние дни',
    moodTrendNote: 'Последняя отметка каждого локального дня. Настроение — маркер состояния, а не балл.',
    patterns: 'Ваши паттерны',
    patternsNote:
      'Показываются только после минимум трёх совместимых замеров. Это наблюдения, а не причины и не диагнозы.',
    allTests: 'Все тесты',
    openCatalog: 'Открыть полный каталог тестов',
    start: 'Начать',
    resume: 'Продолжить',
    repeat: 'Повторить',
    result: 'Открыть результат',
    trend: 'Динамика',
    history: 'История',
    notMeasured: 'Ещё не измерялось',
    noStartable: 'В этой области пока нет включённого теста, готового к прохождению.',
    dueReason: 'Наступил рекомендуемый срок повторного замера.',
    incompleteReason: 'Этот замер ещё не был завершён.',
    resumeReason: 'Вы уже начали этот тест.',
    currentReason: 'Последний замер пока актуален.',
    completedReason: 'Baseline уже заполнен.',
    dueSoonReason: 'Скоро наступит рекомендуемый срок повторения.',
    status: {
      in_progress: 'В процессе',
      not_completed: 'Не пройден',
      completed: 'Пройден',
      up_to_date: 'Актуален',
      due_soon: 'Скоро повторить',
      due_now: 'Пора повторить',
      planned: 'Планируется',
    },
    axis: {
      state: 'Состояние',
      symptoms: 'Симптомы',
      function: 'Функционирование',
      resources: 'Ресурсы',
      baseline: 'Baseline',
    },
    axisText: {
      state: 'То, что может заметно меняться изо дня в день или от недели к неделе.',
      symptoms: 'Специальные симптомные шкалы — только когда они уместны и проверены по источнику.',
      function: 'Как текущее состояние отражается на повседневной жизни и активности.',
      resources: 'Поддержка, восстановление и защитные факторы.',
      baseline: 'Более стабильный фон, который обычно не нужно измерять часто.',
    },
    trendTitle: 'История измерений',
    current: 'Сейчас',
    previous: 'Предыдущий',
    first: 'Первый замер',
    compare: 'Сравнить замеры',
    from: 'От',
    to: 'До',
    dimension: 'Показатель',
    range: 'Период',
    days30: '30 дней',
    months3: '3 месяца',
    all: 'Всё время',
    baselineRecorded:
      'Baseline сохранён. Следующие совместимые замеры можно будет сравнивать с ним.',
    noTrend: 'После второго совместимого замера можно будет увидеть динамику.',
    back: 'Назад в Пси-мониторинг',
    points: 'баллов',
    improving: 'улучшается',
    declining: 'двигается в менее благоприятную сторону',
    stable: 'стабилен',
    higher: 'выше раннего замера',
    lower: 'ниже раннего замера',
    changedAcross: 'за последние',
    measurements: 'замера',
    lastMeasurement: 'Последний замер',
    plannedChecks: 'Планируемые тесты',
    plannedNote:
      'Эти позиции показаны только как план развития. Их нельзя запустить, пока не проверены источник, язык, права и безопасность.',
  },
}

async function monitoringFetch(path, body) {
  const response = await fetch('/api/app/' + path, {
    method: body ? 'POST' : 'GET',
    cache: 'no-store',
    credentials: 'same-origin',
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  })
  const value = await response.json().catch(() => ({ error: 'SERVICE_UNAVAILABLE' }))
  if (!response.ok) {
    const error = new Error(value.error || 'SERVICE_UNAVAILABLE')
    error.code = value.error
    throw error
  }
  return value
}

function statusReason(c, state) {
  return (
    {
      in_progress: c.resumeReason,
      not_completed: c.incompleteReason,
      completed: c.completedReason,
      up_to_date: c.currentReason,
      due_soon: c.dueSoonReason,
      due_now: c.dueReason,
    }[state] || ''
  )
}

function dateLabel(value, locale) {
  if (!value) return ''
  return new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(new Date(value))
}

function localZone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
  } catch {
    return 'UTC'
  }
}

function itemDefinition(item, locale) {
  if (!item.startable) return null
  return getAssessmentDefinition(
    item.key,
    item.version,
    item.instrumentLocale === 'dynamic' ? locale : item.instrumentLocale,
  )
}

function ItemActions({ entry, locale, c, onStarted }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const result = entry.latest

  async function start() {
    setBusy(true)
    setError('')
    try {
      if (entry.activeRun) {
        onStarted(entry.activeRun)
        return
      }
      const def = itemDefinition(entry.item, locale)
      const run = await monitoringFetch('runs', {
        definitionKey: def.key,
        definitionVersion: def.version,
        instrumentLocale: def.instrumentLocale,
        operationId: crypto.randomUUID(),
      })
      onStarted(run)
    } catch {
      setError(locale === 'ru' ? 'Не удалось начать тест.' : 'This check could not be started.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <div className="hh-psi-actions">
        {entry.item.startable && (
          <button className="hh-primary" type="button" disabled={busy} onClick={start}>
            {entry.activeRun ? c.resume : result ? c.repeat : c.start}
          </button>
        )}
        {result && (
          <Link href={'/' + locale + '/app/results/' + result.id} prefetch={false}>
            {c.result}
          </Link>
        )}
        {result && (
          <Link href={'/' + locale + '/app/monitoring/' + entry.item.key} prefetch={false}>
            {c.trend}
          </Link>
        )}
      </div>
      {error && (
        <p className="hh-psi-error" role="alert">
          {error}
        </p>
      )}
    </>
  )
}

function MonitoringItem({ entry, locale, c, onStarted, compact = false }) {
  const title = entry.item.title[locale] || entry.item.title.en
  return (
    <article className={'hh-psi-item' + (compact ? ' hh-psi-item--compact' : '')}>
      <div className="hh-psi-item-main">
        <span className="hh-psi-dot" aria-hidden="true" />
        <div>
          <div className="hh-psi-item-title-row">
            <h3>{title}</h3>
            <span className={'hh-psi-status hh-psi-status--' + entry.state}>
              {c.status[entry.state]}
            </span>
          </div>
          <p className="hh-psi-meta">
            {entry.item.questionCount
              ? entry.item.questionCount + (locale === 'ru' ? ' вопросов' : ' questions')
              : ''}
            {entry.item.durationMinutes
              ? ' · ~' + entry.item.durationMinutes + (locale === 'ru' ? ' мин' : ' min')
              : ''}
          </p>
          {!compact && <p>{entry.item.description[locale] || entry.item.description.en}</p>}
          {entry.latest && (
            <p className="hh-psi-last">
              {c.lastMeasurement}: {dateLabel(entry.latest.measurementAt, locale)}
            </p>
          )}
          {entry.item.startable && (
            <p className="hh-psi-reason">{statusReason(c, entry.state)}</p>
          )}
        </div>
      </div>
      <ItemActions entry={entry} locale={locale} c={c} onStarted={onStarted} />
    </article>
  )
}

export default function PsiMonitoring({ data, locale, instrumentKey, onStarted }) {
  const c = UI[locale] || UI.en
  if (instrumentKey) {
    const item = monitoringCatalogItem(instrumentKey)
    if (item?.startable)
      return (
        <InstrumentTrend
          item={item}
          data={data}
          locale={locale}
          c={c}
          onStarted={onStarted}
        />
      )
  }
  return <MonitoringDashboard data={data} locale={locale} c={c} onStarted={onStarted} />
}

function MonitoringDashboard({ data, locale, c, onStarted }) {
  const [moodSignal, setMoodSignal] = useState(data.moodCheckins?.[0] || null)
  const [moodError, setMoodError] = useState('')
  const plan = useMemo(
    () => monitoringPlan({ results: data.results, runs: data.runs, locale }),
    [data.results, data.runs, locale],
  )
  const recommendation = useMemo(
    () =>
      recommendMonitoring({
        results: data.results,
        runs: data.runs,
        locale,
        mood: moodSignal?.mood || null,
        category: moodSignal?.category || null,
      }),
    [data.results, data.runs, locale, moodSignal],
  )
  const axes = useMemo(
    () => axisOverview({ results: data.results, runs: data.runs, locale }),
    [data.results, data.runs, locale],
  )
  const patterns = useMemo(
    () => deterministicPatterns({ results: data.results, locale }),
    [data.results, locale],
  )
  const moodDays = useMemo(
    () => dailyMoodSeries(data.moodCheckins || [], 14),
    [data.moodCheckins],
  )
  const latestState = monitoringCatalogItem('hh-current-state')
  const changes = latestCompatibleChange(latestState, data.results, locale)
  const activePlan = plan.filter(({ item }) => item.startable)
  const completedCount = activePlan.filter((entry) =>
    ['completed', 'up_to_date', 'due_soon', 'due_now'].includes(entry.state),
  ).length

  async function persistMood(payload) {
    setMoodError('')
    try {
      const saved = await monitoringFetch('mood', {
        ...payload,
        timezone: localZone(),
        sourceSurface: 'monitoring',
      })
      setMoodSignal(saved)
      return saved
    } catch {
      setMoodError(
        locale === 'ru'
          ? 'Не удалось сохранить настроение. Повторите попытку.'
          : 'Your mood could not be saved. Please retry.',
      )
      throw new Error('MOOD_SAVE_FAILED')
    }
  }

  return (
    <section className="hh-psi">
      <div className="hh-heading hh-psi-heading">
        <p className="hh-kicker">Holistic House</p>
        <h1>{c.title}</h1>
        <p>{c.subtitle}</p>
        <p className="hh-fine">{c.privacy}</p>
      </div>

      <MoodCheckIn
        locale={locale}
        compact
        latestMood={moodSignal}
        onMoodChange={persistMood}
        onQuickCheckin={(payload) => setMoodSignal((current) => ({ ...(current || {}), ...payload }))}
      />
      {moodError && <p className="hh-psi-error" role="alert">{moodError}</p>}

      <section className="hh-psi-recommended" aria-labelledby="psi-recommended-title">
        <p className="hh-kicker">{c.recommended}</p>
        {recommendation ? (
          <>
            <h2 id="psi-recommended-title">
              {recommendation.item.title[locale] || recommendation.item.title.en}
            </h2>
            <p>{statusReason(c, recommendation.state)}</p>
            <MonitoringItem
              entry={recommendation}
              locale={locale}
              c={c}
              onStarted={onStarted}
              compact
            />
          </>
        ) : (
          <>
            <h2 id="psi-recommended-title">{c.status.up_to_date}</h2>
            <p>{c.upToDate}</p>
          </>
        )}
      </section>

      <section className="hh-psi-section" aria-labelledby="psi-plan-title">
        <div className="hh-psi-section-head">
          <div>
            <p className="hh-kicker">Personal baseline first</p>
            <h2 id="psi-plan-title">{c.plan}</h2>
          </div>
          <span className="hh-psi-progress-copy">
            {completedCount} / {activePlan.length}
          </span>
        </div>
        <div className="hh-psi-list">
          {activePlan.map((entry) => (
            <MonitoringItem
              key={entry.item.key}
              entry={entry}
              locale={locale}
              c={c}
              onStarted={onStarted}
            />
          ))}
        </div>
      </section>

      {moodDays.length > 1 && (
        <section className="hh-panel hh-psi-section">
          <p className="hh-kicker">{c.moodTrend}</p>
          <p className="hh-fine">{c.moodTrendNote}</p>
          <div className="hh-psi-mood-trend" aria-label={c.moodTrend}>
            {moodDays.map((mood) => (
              <div key={mood.id}>
                <span aria-hidden="true">
                  {mood.mood === 'sad' ? '😔' : mood.mood === 'neutral' ? '😐' : '🙂'}
                </span>
                <small>{dateLabel(mood.occurredAt, locale)}</small>
              </div>
            ))}
          </div>
        </section>
      )}

      {changes.length > 0 && (
        <section className="hh-panel hh-psi-section">
          <p className="hh-kicker">{c.recent}</p>
          <div className="hh-psi-change-grid">
            {changes.slice(0, 5).map((change) => (
              <div key={change.key}>
                <span>{labelFor(change.key, locale)}</span>
                <strong>
                  {change.prior} → {change.current}
                  <small>
                    {change.delta > 0 ? '+' : ''}
                    {change.delta}
                  </small>
                </strong>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="hh-psi-section" aria-labelledby="psi-axes-title">
        <h2 id="psi-axes-title">{c.axes}</h2>
        <div className="hh-psi-axis-grid">
          {axes.map(({ axis, items }) => {
            const visible = items.filter(({ item }) => item.startable)
            return (
              <article className="hh-psi-axis" key={axis}>
                <div>
                  <p className="hh-kicker">{c.axis[axis]}</p>
                  <p>{c.axisText[axis]}</p>
                </div>
                {visible.length ? (
                  <ul>
                    {visible.map((entry) => (
                      <li key={entry.item.key}>
                        <Link
                          href={'/' + locale + '/app/monitoring/' + entry.item.key}
                          prefetch={false}
                        >
                          {entry.item.title[locale] || entry.item.title.en}
                        </Link>
                        <span>{c.status[entry.state]}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="hh-fine">{c.noStartable}</p>
                )}
              </article>
            )
          })}
        </div>
      </section>

      {patterns.length > 0 && (
        <section className="hh-panel hh-psi-section">
          <p className="hh-kicker">{c.patterns}</p>
          <p className="hh-fine">{c.patternsNote}</p>
          <ul className="hh-psi-patterns">
            {patterns.map((pattern) => (
              <li key={pattern.instrumentKey + ':' + pattern.dimensionKey}>
                <strong>{labelFor(pattern.dimensionKey, locale)}</strong>{' '}
                {c[pattern.state]} {c.changedAcross} {pattern.count} {c.measurements}.
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="hh-psi-section">
        <div className="hh-psi-section-head">
          <div>
            <p className="hh-kicker">Registry-driven</p>
            <h2>{c.allTests}</h2>
          </div>
          <Link className="hh-primary" href={'/' + locale + '/app/tests'} prefetch={false}>
            {c.openCatalog}
          </Link>
        </div>
        <details className="hh-psi-roadmap">
          <summary>{c.plannedChecks}</summary>
          <p className="hh-fine">{c.plannedNote}</p>
          <div className="hh-psi-planned">
            {plan
              .filter(({ item }) => !item.startable)
              .map((entry) => (
                <article key={entry.item.key}>
                  <span>{c.axis[entry.item.axis]}</span>
                  <strong>{entry.item.title[locale] || entry.item.title.en}</strong>
                  <small>{c.status.planned}</small>
                </article>
              ))}
          </div>
        </details>
      </section>
    </section>
  )
}

function InstrumentTrend({ item, data, locale, c, onStarted }) {
  const entry = monitoringPlan({ results: data.results, runs: data.runs, locale }).find(
    (candidate) => candidate.item.key === item.key,
  )
  const series = compatibleSeries(item, data.results, locale)
  const latest = series.at(-1) || null
  const [range, setRange] = useState('90')
  const [dimensionKey, setDimensionKey] = useState(latest?.dimensions[0]?.key || '')
  const [fromId, setFromId] = useState(series.length > 1 ? series.at(-2).id : '')
  const [toId, setToId] = useState(latest?.id || '')
  const to = series.find((result) => result.id === toId) || latest
  const from = series.find((result) => result.id === fromId) || series.at(-2) || null
  const comparison = to && from && to.id !== from.id ? compareResults(to, from) : []
  const selected =
    to?.dimensions.find((dimension) => dimension.key === dimensionKey) || to?.dimensions[0]
  const comparePart = comparison.find((part) => part.key === selected?.key)
  const cutoff =
    range === 'all' || !latest
      ? -Infinity
      : Date.parse(latest.measurementAt) - Number(range) * 24 * 60 * 60 * 1000
  const points = selected
    ? series
        .filter((result) => Date.parse(result.measurementAt) >= cutoff)
        .map((result) => ({
          id: result.id,
          date: result.measurementAt,
          value: result.dimensions.find((dimension) => dimension.key === selected.key)?.value,
        }))
        .filter((point) => Number.isFinite(point.value))
    : []
  const minDate = points[0] ? Date.parse(points[0].date) : 0
  const maxDate = points.at(-1) ? Date.parse(points.at(-1).date) : minDate
  const x = (point) =>
    34 + (560 * (Date.parse(point.date) - minDate)) / Math.max(1, maxDate - minDate)
  const y = (point) =>
    selected
      ? 170 -
        (138 * (point.value - selected.min)) / Math.max(1, selected.max - selected.min)
      : 170

  return (
    <section className="hh-psi hh-psi-trend">
      <Link className="hh-text-link" href={'/' + locale + '/app/monitoring'} prefetch={false}>
        ← {c.back}
      </Link>
      <div className="hh-heading">
        <p className="hh-kicker">{c.title}</p>
        <h1>{item.title[locale] || item.title.en}</h1>
        <p>{item.description[locale] || item.description.en}</p>
      </div>

      {!latest ? (
        <div className="hh-panel hh-empty">
          <h2>{c.notMeasured}</h2>
          <MonitoringItem
            entry={entry}
            locale={locale}
            c={c}
            onStarted={onStarted}
            compact
          />
        </div>
      ) : (
        <>
          <section className="hh-psi-summary-grid">
            <article className="hh-panel">
              <p className="hh-kicker">{c.current}</p>
              <h2>{dateLabel(latest.measurementAt, locale)}</h2>
              <p>{c.status[entry.state]}</p>
            </article>
            <article className="hh-panel">
              <p className="hh-kicker">{series.length > 1 ? c.previous : c.first}</p>
              <h2>{dateLabel((series.at(-2) || latest).measurementAt, locale)}</h2>
              <p>{series.length > 1 ? c.compare : c.baselineRecorded}</p>
            </article>
          </section>

          <section className="hh-panel hh-psi-section">
            <h2>{c.trendTitle}</h2>
            <div className="hh-psi-controls">
              <label>
                {c.dimension}
                <select
                  value={selected?.key || ''}
                  onChange={(event) => setDimensionKey(event.target.value)}
                >
                  {latest.dimensions.map((dimension) => (
                    <option value={dimension.key} key={dimension.key}>
                      {labelFor(dimension.key, locale)}
                    </option>
                  ))}
                </select>
              </label>
              <div>
                <span className="hh-psi-control-label">{c.range}</span>
                <div className="hh-psi-range" role="group" aria-label={c.range}>
                  {[
                    ['30', c.days30],
                    ['90', c.months3],
                    ['all', c.all],
                  ].map(([value, label]) => (
                    <button
                      type="button"
                      key={value}
                      aria-pressed={range === value}
                      onClick={() => setRange(value)}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {points.length >= 2 ? (
              <svg
                className="hh-psi-chart"
                viewBox="0 0 630 200"
                role="img"
                aria-label={c.trendTitle}
              >
                <line x1="34" y1="170" x2="594" y2="170" />
                <polyline
                  points={points.map((point) => x(point) + ',' + y(point)).join(' ')}
                />
                {points.map((point) => (
                  <circle key={point.id} cx={x(point)} cy={y(point)} r="5">
                    <title>
                      {dateLabel(point.date, locale)}: {point.value}
                    </title>
                  </circle>
                ))}
              </svg>
            ) : (
              <p className="hh-fine">{c.noTrend}</p>
            )}

            <table className="hh-table">
              <thead>
                <tr>
                  <th>{locale === 'ru' ? 'Дата' : 'Date'}</th>
                  <th>{locale === 'ru' ? 'Значение' : 'Value'}</th>
                </tr>
              </thead>
              <tbody>
                {points
                  .slice()
                  .reverse()
                  .map((point) => (
                    <tr key={point.id}>
                      <th scope="row">
                        <Link
                          href={'/' + locale + '/app/results/' + point.id}
                          prefetch={false}
                        >
                          {dateLabel(point.date, locale)}
                        </Link>
                      </th>
                      <td>
                        {point.value} / {selected?.max}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </section>

          <section className="hh-panel hh-psi-section">
            <h2>{c.compare}</h2>
            <div className="hh-filter-grid">
              <label>
                {c.from}
                <select
                  value={from?.id || ''}
                  disabled={series.length < 2}
                  onChange={(event) => setFromId(event.target.value)}
                >
                  {series
                    .filter((result) => result.id !== to?.id)
                    .map((result) => (
                      <option value={result.id} key={result.id}>
                        {dateLabel(result.measurementAt, locale)}
                      </option>
                    ))}
                </select>
              </label>
              <label>
                {c.to}
                <select
                  value={to?.id || ''}
                  onChange={(event) => setToId(event.target.value)}
                >
                  {series
                    .filter((result) => result.id !== from?.id)
                    .map((result) => (
                      <option value={result.id} key={result.id}>
                        {dateLabel(result.measurementAt, locale)}
                      </option>
                    ))}
                </select>
              </label>
            </div>
            {comparePart ? (
              <p className="hh-psi-comparison">
                <strong>{labelFor(comparePart.key, locale)}</strong>{' '}
                {comparePart.prior} → {comparePart.current}{' '}
                <span>
                  ({comparePart.delta > 0 ? '+' : ''}
                  {comparePart.delta} {c.points})
                </span>
              </p>
            ) : (
              <p className="hh-fine">{c.noTrend}</p>
            )}
          </section>

          <div className="hh-actions">
            <ItemActions entry={entry} locale={locale} c={c} onStarted={onStarted} />
            <Link href={'/' + locale + '/app/history'} prefetch={false}>
              {c.history}
            </Link>
          </div>
        </>
      )}
    </section>
  )
}
