'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, BarChart3, CalendarDays, RotateCcw, TrendingUp } from 'lucide-react'
import { buildTestDynamicsGroups } from '@/lib/assessments/test-dynamics'
import styles from './test-dynamics.module.css'

const TEXT = {
  en: {
    kicker: 'PERSONAL MEASUREMENTS', title: 'Test dynamics',
    intro: 'Compare your first and latest recorded values for each completed test. Only compatible measurements are compared.',
    tests: 'Completed tests', attempts: 'Total attempts', repeated: 'Repeated tests',
    period: 'Date range', all: 'All time', week: '7 days', month: '30 days',
    quarter: '3 months', custom: 'Custom dates', from: 'From', to: 'To',
    first: 'First value', latest: 'Latest value', change: 'Change',
    attemptsLabel: 'attempts', retake: 'Retake this test', report: 'Last result',
    more: 'More measured scales', noResults: 'No completed tests in this range',
    noResultsHelp: 'Choose a longer period or complete your first test to start tracking changes.',
    invalid: 'Choose a valid start and end date.', allResults: 'Show all time',
    baseline: 'Repeat this test to measure changes over time.',
    incompatible: 'Some measurement versions or scales are not comparable. Values are shown without an inferred change.',
    note: 'Scores reflect responses within individual instruments, not an overall health percentage or a diagnosis.',
    unavailable: 'Retake unavailable', scales: 'scales',
  },
  ru: {
    kicker: 'ЛИЧНЫЕ ИЗМЕРЕНИЯ', title: 'Динамика тестов',
    intro: 'Первый и последний замеры каждого пройденного теста. Изменение рассчитываем только для совместимых измерений.',
    tests: 'Пройдено тестов', attempts: 'Всего прохождений', repeated: 'Повторных замеров',
    period: 'Диапазон', all: 'Весь период', week: '7 дней', month: '30 дней',
    quarter: '3 месяца', custom: 'Свои даты', from: 'С', to: 'По',
    first: 'Первое значение', latest: 'Последнее значение', change: 'Изменение',
    attemptsLabel: 'прохождений', retake: 'Пройти тест повторно', report: 'Последний результат',
    more: 'Остальные шкалы', noResults: 'За этот период нет пройденных тестов',
    noResultsHelp: 'Выберите более длинный период или пройдите первый тест, чтобы отслеживать динамику.',
    invalid: 'Укажите корректные даты начала и конца периода.', allResults: 'Показать весь период',
    baseline: 'Повторите тест, чтобы увидеть динамику показателей.',
    incompatible: 'Часть версий или шкал теста несопоставима. Значения показаны без расчёта изменения.',
    note: 'Баллы относятся к шкалам отдельных тестов, а не к проценту здоровья или диагнозу.',
    unavailable: 'Повтор пока недоступен', scales: 'шкал',
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

function ScaleRow({ item, c }) {
  return <div className={styles.scaleRow}>
    <div className={styles.scaleName}>
      <strong>{item.label}</strong>
      <TrendLine item={item} />
    </div>
    <div className={styles.values}>
      <span><small>{c.first}</small><strong>{number(item.firstValue)}</strong></span>
      <span><small>{c.latest}</small><strong>{number(item.lastValue)}</strong></span>
    </div>
    {item.delta !== null && <span className={styles.delta} aria-label={c.change + ': ' + number(item.delta)}>
      {item.delta > 0 ? '+' : ''}{number(item.delta)}
    </span>}
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
              <time dateTime={group.first.measurementAt}>{c.first}: {date(group.first.measurementAt, locale)}</time>
              <time dateTime={group.latest.measurementAt}>{c.latest}: {date(group.latest.measurementAt, locale)}</time>
            </div>
            <div className={styles.scales}>
              {group.scales.slice(0,3).map(item => <ScaleRow item={item} c={c} key={item.key} />)}
              {group.scales.length > 3 && <details className={styles.more}>
                <summary>{c.more} ({group.scales.length - 3})</summary>
                {group.scales.slice(3).map(item => <ScaleRow item={item} c={c} key={item.key} />)}
              </details>}
            </div>
            {group.count === 1 && <p className={styles.footnote}>{c.baseline}</p>}
            {group.count > 1 && group.scales.some(item => item.delta === null) &&
              <p className={styles.footnote}>{c.incompatible}</p>}
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
