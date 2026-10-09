'use client'

import { useState } from 'react'
import { ArrowRight, CheckCircle2, ClipboardList, Download, Play, Sparkles } from 'lucide-react'
import { nextPersonalRecommendation } from '@/lib/assessments/personal-guidance'
import styles from './my-tests-dashboard.module.css'

const COPY = {
  en: {
    kicker: 'MY TESTING DASHBOARD',
    title: 'My tests & progress',
    description: 'Your selected tests, results and next steps — all in one place.',
    selected: 'Selected tests',
    completed: 'Completed',
    progress: 'Progress',
    report: 'Download report',
    reportHint: 'Printable results summary',
    noReport: 'Complete a test to unlock your report.',
    guidance: 'Get recommendations',
    guidanceHint: 'Suggestions based on your results',
    start: 'Start testing',
    choose: 'Choose my tests',
    startHint: 'Open your selected tests',
    chooseHint: 'Build your personal test list',
    preview: 'Your selected tests',
    viewAll: 'View all tests',
    noTests: 'No tests selected yet. Choose the topics you would like to explore.',
    pending: 'Not started',
    underway: 'In progress',
    finished: 'Completed',
    notMedical: 'These reflections are not a diagnosis or treatment recommendation.',
    recommendationTitle: 'Your suggested next step',
    print: 'Print or save as PDF',
    reportTitle: 'My test results',
    noResults: 'There are no completed test results to export.',
    summary: 'Summary of completed assessments',
    recorded: 'Completed on',
    interpretation: 'Raw recorded measures; interpretation depends on each assessment.',
  },
  ru: {
    kicker: 'МОИ ТЕСТЫ И ПРОГРЕСС',
    title: 'Мои тесты и результаты',
    description: 'Выбранные тесты, результаты и следующие шаги — в одном месте.',
    selected: 'Выбрано тестов',
    completed: 'Пройдено',
    progress: 'Прогресс',
    report: 'Скачать отчёт',
    reportHint: 'Отчёт для печати и PDF',
    noReport: 'Пройдите тест, чтобы скачать отчёт.',
    guidance: 'Получить рекомендации',
    guidanceHint: 'На основе ваших результатов',
    start: 'Пройти тестирование',
    choose: 'Выбрать тесты',
    startHint: 'Открыть выбранные тесты',
    chooseHint: 'Составить личный список',
    preview: 'Выбранные тесты',
    viewAll: 'Все тесты',
    noTests: 'Тесты пока не выбраны. Отметьте интересующие вас темы.',
    pending: 'Не начат',
    underway: 'В процессе',
    finished: 'Пройден',
    notMedical: 'Эти рекомендации не являются диагнозом или назначением лечения.',
    recommendationTitle: 'Предлагаемый следующий шаг',
    print: 'Печать или сохранение в PDF',
    reportTitle: 'Мои результаты тестов',
    noResults: 'Для отчёта ещё нет завершённых тестов.',
    summary: 'Результаты пройденных тестов',
    recorded: 'Пройден',
    interpretation: 'Сохранённые значения шкал; их интерпретация зависит от конкретного теста.',
  },
}

function escaped(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[char])
}

function reportHtml(rows, locale) {
  const c = COPY[locale] || COPY.en
  const completed = rows.filter((row) => row.result)
  const sections = completed.map((row) => {
    const recorded = row.result
    const date = recorded.measurementAt && Number.isFinite(Date.parse(recorded.measurementAt))
      ? new Intl.DateTimeFormat(locale === 'ru' ? 'ru-RU' : 'en-CA', { dateStyle: 'long' }).format(new Date(recorded.measurementAt))
      : ''
    const measures = (recorded.dimensions || []).map((axis) =>
      '<tr><th scope="row">' + escaped(axis.sourceConstruct || axis.key) + '</th><td>' + escaped(axis.value) + ' ' + escaped(axis.unit || '') + '</td></tr>'
    ).join('')
    return '<section><h2>' + escaped(row.title) + '</h2><p>' + escaped(c.recorded) + ': ' + escaped(date) + '</p>' +
      (measures ? '<table><tbody>' + measures + '</tbody></table>' : '') + '</section>'
  }).join('')
  return '<!doctype html><html lang="' + escaped(locale) + '"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">' +
    '<title>' + escaped(c.reportTitle) + ' — Holistic House</title>' +
    '<style>body{font:16px/1.6 system-ui,sans-serif;max-width:780px;margin:0 auto;padding:30px;color:#3e342e;background:#fffdf8}' +
    'h1,h2{font-family:Georgia,serif}h1{font-size:36px}h2{font-size:22px}section{margin-top:25px;padding-top:18px;border-top:1px solid #e3d8cb}' +
    'table{width:100%;border-collapse:collapse}td,th{padding:8px;border-bottom:1px solid #e5ddd3;text-align:left}td{text-align:right}' +
    '.note{color:#675e53;font-size:14px}.print{border:0;border-radius:12px;padding:12px 20px;background:#236e61;color:white;cursor:pointer}' +
    '@media print{body{padding:0}.print{display:none}}</style></head><body>' +
    '<p>HOLISTIC HOUSE</p><h1>' + escaped(c.reportTitle) + '</h1><p>' + escaped(c.summary) + '</p>' +
    '<button class="print" type="button" onclick="window.print()">' + escaped(c.print) + '</button>' +
    sections + '<p class="note">' + escaped(c.interpretation) + '</p><p class="note">' + escaped(c.notMedical) + '</p></body></html>'
}

function downloadReport(rows, locale) {
  const html = reportHtml(rows, locale)
  const url = URL.createObjectURL(new Blob([html], { type: 'text/html;charset=utf-8' }))
  const link = document.createElement('a')
  link.href = url
  link.download = 'holistic-house-test-report.html'
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 2000)
}

function status(row, c) {
  if (row.run) return { name: c.underway, kind: 'underway', percent: row.progress }
  if (row.result) return { name: c.finished, kind: 'finished', percent: 100 }
  return { name: c.pending, kind: 'pending', percent: 0 }
}

export function MyTestsDashboard({ locale, rows, completed, results, snapshot, onStart, onViewAll }) {
  const c = COPY[locale] || COPY.en
  const [showGuidance, setShowGuidance] = useState(false)
  const [message, setMessage] = useState('')
  const progress = rows.length ? Math.round((completed / rows.length) * 100) : 0
  const recommendation = nextPersonalRecommendation({ results: results || [], snapshot, locale })

  function exportReport() {
    if (completed < 1) {
      setMessage(c.noReport)
      return
    }
    downloadReport(rows, locale)
    setMessage('')
  }

  return (
    <div className={styles.dashboard} aria-label={c.title}>
      <p className={styles.kicker}>{c.kicker}</p>
      <h1 className={styles.title}>{c.title}</h1>
      <p className={styles.subtitle}>{c.description}</p>

      <div className={styles.statistics} role="group" aria-label={c.progress}>
        <div className={styles.stat}>
          <ClipboardList aria-hidden="true" size={22} />
          <span>{c.selected}</span>
          <strong>{rows.length}</strong>
        </div>
        <div className={styles.stat}>
          <CheckCircle2 aria-hidden="true" size={22} />
          <span>{c.completed}</span>
          <strong>{completed} / {rows.length}</strong>
        </div>
        <div className={styles.stat}>
          <span className={styles.miniRing} style={{ '--percent': progress + '%' }} aria-hidden="true" />
          <span>{c.progress}</span>
          <strong>{progress}%</strong>
        </div>
      </div>
      <div className={styles.progressTrack} role="progressbar" aria-label={c.progress} aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}>
        <span style={{ width: progress + '%' }} />
      </div>

      <div className={styles.quickActions}>
        <button type="button" onClick={exportReport} title={completed ? c.reportHint : c.noReport}>
          <Download aria-hidden="true" size={24} />
          <span><strong>{c.report}</strong><small>{c.reportHint}</small></span>
        </button>
        <button type="button" onClick={() => setShowGuidance((value) => !value)} aria-expanded={showGuidance}>
          <Sparkles aria-hidden="true" size={24} />
          <span><strong>{c.guidance}</strong><small>{c.guidanceHint}</small></span>
        </button>
      </div>
      {message && <p className={styles.notice} role="status">{message}</p>}
      {showGuidance && (
        <aside className={styles.guidance} aria-label={c.recommendationTitle}>
          <p className={styles.kicker}>{c.recommendationTitle}</p>
          <h2>{recommendation.title}</h2>
          <p>{recommendation.reason}</p>
          {recommendation.observation && <p>{recommendation.observation}</p>}
          {recommendation.reflection && <p>{recommendation.reflection}</p>}
          <small>{c.notMedical}</small>
        </aside>
      )}

      <button className={styles.primary} type="button" onClick={onStart}>
        <Play size={22} aria-hidden="true" fill="currentColor" />
        <span><strong>{rows.length ? c.start : c.choose}</strong><small>{rows.length ? c.startHint : c.chooseHint}</small></span>
        <ArrowRight size={21} aria-hidden="true" />
      </button>

      <div className={styles.preview}>
        <div className={styles.previewHeading}><h2>{c.preview}</h2><button type="button" onClick={onViewAll}>{c.viewAll} <ArrowRight size={16} aria-hidden="true" /></button></div>
        {rows.length ? <ul className={styles.previewList}>
          {rows.slice(0, 3).map((row) => {
            const state = status(row, c)
            return <li key={row.definition.id}>
              <span className={styles.previewTitle}>{row.title}</span>
              <span className={styles.state} data-state={state.kind}>{state.name}{state.kind === 'underway' ? ' · ' + state.percent + '%' : ''}</span>
            </li>
          })}
        </ul> : <p className={styles.empty}>{c.noTests}</p>}
      </div>
    </div>
  )
}
