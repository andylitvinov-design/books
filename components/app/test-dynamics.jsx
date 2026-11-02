'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, BarChart3, CalendarDays, RotateCcw, TrendingUp } from 'lucide-react'
import { buildTestDynamicsGroups, visibleTestDynamicsBand } from '@/lib/assessments/test-dynamics'
import { ScoreGauge } from './assessment-gauge'
import { labelFor } from './copy'
import styles from './test-dynamics.module.css'

const TEXT = {
  en: {
    kicker: 'PERSONAL MEASUREMENTS', title: 'Test dynamics',
    intro: 'Review scores from verified, comparable versions of each test. Older results stay in history, but incompatible scores are never placed side by side.',
    tests: 'Completed tests', attempts: 'Total attempts', repeated: 'Comparable retests',
    period: 'Date range', all: 'All time', week: '7 days', month: '30 days',
    quarter: '3 months', custom: 'Custom dates', from: 'From', to: 'To',
    first: 'First comparable score', latest: 'Latest comparable score', change: 'Raw score difference',
    firstAttempt: 'First recorded attempt', latestAttempt: 'Latest recorded attempt',
    attemptsLabel: 'attempts', retake: 'Retake this test', report: 'Last result',
    more: 'More measured scales', noResults: 'No completed tests in this range',
    noResultsHelp: 'Choose a longer period or complete your first test to start tracking changes.',
    invalid: 'Choose a valid start and end date.', allResults: 'Show all time',
    baseline: 'Repeat this test to measure changes over time.',
    incompatible: 'Earlier versions or unverified scores remain in history, but are not used as comparison values.',
    unverifiedHistory: 'Some saved attempts could not pass the original version and score checks. Those raw records are retained for history, not treated as verified psychological measurements.',
    note: 'Only exactly comparable source versions are paired. Numeric differences describe self-reports, not reliably established or clinically important improvement or decline. Different responses can yield the same total; these are not health percentages or diagnoses.',
    unavailable: 'Retake unavailable', scales: 'scales',
    awaiting: 'No repeat measurement yet',
    currentBand: 'Your current range', position: 'Your position on the scale',
    otherLevels: 'Other score ranges', noBand: 'This measure has no verified score categories; the recorded score is shown.',
  },
  ru: {
    kicker: 'ЛИЧНЫЕ ИЗМЕРЕНИЯ', title: 'Динамика тестов',
    intro: 'Сравниваются только подтверждённые результаты одной версии теста. Несовместимые прохождения остаются в истории, без ложной динамики.',
    tests: 'Пройдено тестов', attempts: 'Всего прохождений', repeated: 'Сопоставимых повторов',
    period: 'Диапазон', all: 'Весь период', week: '7 дней', month: '30 дней',
    quarter: '3 месяца', custom: 'Свои даты', from: 'С', to: 'По',
    first: 'Первый сопоставимый балл', latest: 'Последний сопоставимый балл', change: 'Разница баллов',
    firstAttempt: 'Первое сохранённое прохождение', latestAttempt: 'Последнее сохранённое прохождение',
    attemptsLabel: 'прохождений', retake: 'Пройти тест повторно', report: 'Последний результат',
    more: 'Остальные шкалы', noResults: 'За этот период нет пройденных тестов',
    noResultsHelp: 'Выберите более длинный период или пройдите первый тест, чтобы отслеживать динамику.',
    invalid: 'Укажите корректные даты начала и конца периода.', allResults: 'Показать весь период',
    baseline: 'Повторите тест, чтобы увидеть динамику показателей.',
    incompatible: 'Старые версии и неподтверждённые результаты остаются в истории, но не используются как значения для сравнения.',
    unverifiedHistory: 'Часть сохранённых прохождений не прошла проверку исходной версии или баллов. Эти записи сохранены для истории, но не считаются подтверждёнными психологическими измерениями.',
    note: 'Сравниваются только совместимые версии теста. Разница баллов отражает самоотчёты, но не доказывает достоверное или клинически значимое улучшение либо ухудшение. Одинаковая сумма возможна при разных ответах; это не процент здоровья и не диагноз.',
    unavailable: 'Повтор пока недоступен', scales: 'шкал',
    awaiting: 'Повторного замера пока нет',
    currentBand: 'Ваш текущий диапазон', position: 'Положение на шкале',
    otherLevels: 'Другие диапазоны', noBand: 'Для этой шкалы нет подтверждённых категорий — показан измеренный балл.',
  },
}

function number(value) {
  const n = Number(value)
  return value === null || value === undefined || !Number.isFinite(n) ? '—'
    : new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(n)
}

function date(value, locale) {
  if (!Number.isFinite(Date.parse(value))) return '—'
  return new Intl.DateTimeFormat(locale === 'ru' ? 'ru-RU' : 'en-CA',
    { dateStyle: 'medium' }).format(new Date(value))
}

function TrendLine({ item }) {
  const range = Number(item.max) - Number(item.min)
  if (item.track.length < 2 || !Number.isFinite(range) || range <= 0) return null
  const positions = item.track.map((point, index) => ({
    x: 7 + (index * 86) / Math.max(1, item.track.length - 1),
    y: 31 - 24 * Math.max(0, Math.min(1, (point.value - Number(item.min)) / range)),
  }))
  return <svg className={styles.sparkline} viewBox="0 0 100 38"
    role="img" aria-label={item.track.map(point => number(point.value)).join(' → ')}>
    <polyline points={positions.map(p => p.x + ',' + p.y).join(' ')} />
    {positions.map((p, index) => <circle key={item.track[index].id} cx={p.x} cy={p.y} r="2.6" />)}
  </svg>
}

function bandRange(band, locale) {
  if (band.displayRange) return band.displayRange
  const formatter = new Intl.NumberFormat(locale === 'ru' ? 'ru-RU' : 'en-US', {
    maximumFractionDigits: 2,
  })
  return formatter.format(band.from) + '–' + formatter.format(band.to)
}

function ScaleRow({ item, result, c, locale, hasRepeat }) {
  const translated = labelFor(item.key, locale)
  const title = translated !== item.key ? translated : item.label
  const activeBand = visibleTestDynamicsBand(item.gaugeDimension, result, locale)
  return <div className={styles.scaleRow} data-dynamics-scale={item.key}>
    <strong className={styles.scaleTitle}>{title}</strong>
    <div className={styles.scaleMain}>
      <div className={styles.scaleDial}>
        <ScoreGauge dimension={item.gaugeDimension} locale={locale} compact result={result}
          showLegend={false} showScaleNote={false} />
      </div>
      <div className={styles.scaleContent}>
        {activeBand ? <div className={styles.activeBand} data-current-score-band={activeBand.current.code}>
          <span className={styles.activeBandCaption}>{activeBand.kind === 'descriptive' ? c.position : c.currentBand}</span>
          <div className={styles.activeBandLine}>
            <span className={styles.activeBandRange}>{bandRange(activeBand.current, locale)}</span>
            <strong>{activeBand.current.label}</strong>
          </div>
          {activeBand.current.note && <p className={styles.activeBandNote}>{activeBand.current.note}</p>}
        </div> : <p className={styles.noBandNote}>{c.noBand}</p>}
        <div className={styles.values}>
          <span><small>{c.first}</small><strong>{number(item.firstValue)}</strong></span>
          <span><small>{c.latest}</small>
            <strong className={!hasRepeat ? styles.awaiting : undefined}
              aria-label={!hasRepeat ? c.awaiting : undefined}>{hasRepeat ? number(item.lastValue) : '?'}</strong>
          </span>
          {item.delta !== null && <span className={styles.delta} aria-label={c.change + ': ' + number(item.delta)}>
            {item.delta > 0 ? '+' : ''}{number(item.delta)}
          </span>}
        </div>
        <TrendLine item={item} />
      </div>
    </div>
    {activeBand?.others.length > 0 && <details className={styles.levelDetails} data-other-score-bands>
      <summary>{c.otherLevels} ({activeBand.others.length})</summary>
      <div className={styles.levelList}>
        {activeBand.others.map(band => <div className={styles.levelItem} key={band.code}>
          <span className={styles.levelItemRange}>{bandRange(band, locale)}</span>
          <strong>{band.label}</strong>
          {band.note && <p>{band.note}</p>}
        </div>)}
      </div>
      {activeBand.caveat && <p className={styles.levelCaveat}>{activeBand.caveat}</p>}
    </details>}
  </div>
}

export function TestDynamics({ results = [], locale = 'en', onRetake, canRetake, busy = false }) {
  const c = TEXT[locale] || TEXT.en
  const [period, setPeriod] = useState('all')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const view = useMemo(() =>
    buildTestDynamicsGroups(results, locale, period, from, to),
    [results, locale, period, from, to])
  return <section className={styles.root} aria-labelledby="hh-test-dynamics-title" data-test-dynamics>
    <header className={styles.hero}>
      <div>
        <p className={styles.kicker}><TrendingUp size={15} aria-hidden="true" />{c.kicker}</p>
        <h2 id="hh-test-dynamics-title">{c.title}</h2>
        <p>{c.intro}</p>
      </div>
      <BarChart3 className={styles.heroIcon} aria-hidden="true" size={33} />
    </header>
    <div className={styles.stats} role="group" aria-label={c.title}>
      <div><strong>{view.groups.length}</strong><span>{c.tests}</span></div>
      <div><strong>{view.attempts}</strong><span>{c.attempts}</span></div>
      <div><strong>{view.repeated}</strong><span>{c.repeated}</span></div>
    </div>
    <div className={styles.filters}>
      <label><CalendarDays size={17} aria-hidden="true" /><span>{c.period}</span>
        <select value={period} onChange={event => setPeriod(event.target.value)}>
          {[['all',c.all],['week',c.week],['month',c.month],['quarter',c.quarter],['custom',c.custom]]
            .map(([value,label]) => <option key={value} value={value}>{label}</option>)}
        </select>
      </label>
      {period === 'custom' && <div className={styles.dates} role="group" aria-label={c.period}>
        <label>{c.from}<input type="date" value={from} onChange={e => setFrom(e.target.value)} /></label>
        <label>{c.to}<input type="date" value={to} onChange={e => setTo(e.target.value)} /></label>
      </div>}
    </div>
    {!view.valid ? <p className={styles.message} role="status">{c.invalid}</p> : view.groups.length === 0
      ? <div className={styles.empty} role="status"><h3>{c.noResults}</h3><p>{c.noResultsHelp}</p>
          <button type="button" onClick={() => { setPeriod('all'); setFrom(''); setTo('') }}>{c.allResults}</button>
        </div>
      : <div className={styles.list}>
          {view.groups.map(group => <article key={group.key} className={styles.card} data-dynamics-test={group.key}>
            <header className={styles.cardHeader}>
              <div><h3>{group.title}</h3><small>{group.count} {c.attemptsLabel}</small></div>
              <Link href={'/' + locale + '/app/results/' + encodeURIComponent(group.latest.id)} prefetch={false}>
                {c.report} <ArrowRight size={15} aria-hidden="true" />
              </Link>
            </header>
            <div className={styles.dateRow}>
              <time dateTime={group.first.measurementAt}>{c.firstAttempt}: {date(group.first.measurementAt, locale)}</time>
              {group.count > 1 &&
                <time dateTime={group.latest.measurementAt}>{c.latestAttempt}: {date(group.latest.measurementAt, locale)}</time>}
            </div>
            <div className={styles.scales}>
              {group.scales.slice(0,1).map(item => <ScaleRow item={item} result={group.latest} c={c} locale={locale} hasRepeat={item.track.length > 1} key={item.key} />)}
              {group.scales.length > 1 && <details className={styles.more}>
                <summary>{c.more} ({group.scales.length - 1})</summary>
                {group.scales.slice(1).map(item => <ScaleRow item={item} result={group.latest} c={c} locale={locale} hasRepeat={item.track.length > 1} key={item.key} />)}
              </details>}
            </div>
            {group.count === 1 && <p className={styles.footnote}>{c.baseline}</p>}
            {group.count > 1 && group.scales.some(item => item.delta === null) &&
              <p className={styles.footnote}>{c.incompatible}</p>}
            {group.unverifiedCount > 0 &&
              <p className={styles.footnote} role="note" data-dynamics-unverified-history>{c.unverifiedHistory}</p>}
            <button type="button" className={styles.retake}
              onClick={() => onRetake?.(group.latest.definitionId)}
              disabled={busy || !canRetake?.(group.latest.definitionId)}>
              <RotateCcw size={16} aria-hidden="true" />
              {canRetake?.(group.latest.definitionId) ? c.retake : c.unavailable}
              <ArrowRight size={15} aria-hidden="true" />
            </button>
          </article>)}
        </div>}
    <p className={styles.disclaimer}>{c.note}</p>
  </section>
}
