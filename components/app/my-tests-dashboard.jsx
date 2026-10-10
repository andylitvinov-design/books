'use client'

import { useState } from 'react'
import { ArrowRight, CheckCircle2, ChevronDown, ClipboardList, Download, Play, Sparkles } from 'lucide-react'
import { nextPersonalRecommendation } from '@/lib/assessments/personal-guidance'
import { ClientReportActions } from './client-report-actions'
import styles from './my-tests-dashboard.module.css'

const COPY = {
  en: {
    kicker: 'MY TESTS',
    title: 'Your tests are ready',
    emptyTitle: 'Start with your first test',
    description: 'Choose one of your saved tests and begin. You can return anytime.',
    emptyDescription: 'Choose the topics you would like to explore and build your personal test list.',
    selected: 'Selected',
    completed: 'Completed',
    progress: 'Progress',
    start: 'Start testing',
    choose: 'Choose tests',
    startHint: 'Choose a test to begin',
    chooseHint: 'Find the tests that suit you',
    more: 'Reports & recommendations',
    report: 'Download report',
    reportHint: 'Saved results in a PDF',
    noReport: 'Complete a test to unlock your report.',
    guidance: 'Get recommendations',
    guidanceHint: 'Suggestions based on your results',
    recommendationTitle: 'Your suggested next step',
    notMedical: 'These reflections are not a diagnosis or treatment recommendation.',
  },
  ru: {
    kicker: 'МОИ ТЕСТЫ',
    title: 'Ваши тесты готовы',
    emptyTitle: 'Начните с первого теста',
    description: 'Выберите тест и начинайте. К незавершённому можно вернуться позже.',
    emptyDescription: 'Выберите интересующие темы и составьте личную подборку тестов.',
    selected: 'Выбрано',
    completed: 'Пройдено',
    progress: 'Прогресс',
    start: 'Пройти тесты',
    choose: 'Выбрать тесты',
    startHint: 'Выберите тест и начните',
    chooseHint: 'Подобрать тесты для себя',
    more: 'Отчёты и рекомендации',
    report: 'Скачать отчёт',
    reportHint: 'Сохранённые результаты в PDF',
    noReport: 'Пройдите тест, чтобы скачать отчёт.',
    guidance: 'Получить рекомендации',
    guidanceHint: 'На основе ваших результатов',
    recommendationTitle: 'Предлагаемый следующий шаг',
    notMedical: 'Эти рекомендации не являются диагнозом или назначением лечения.',
  },
}

export function MyTestsDashboard({ locale, rows, completed, results, snapshot, data, onStart }) {
  const c = COPY[locale] || COPY.en
  const [showGuidance, setShowGuidance] = useState(false)
  const progress = rows.length ? Math.round((completed / rows.length) * 100) : 0
  const recommendation = nextPersonalRecommendation({ results: results || [], snapshot, locale })

  return (
    <section className={styles.dashboard} aria-label={c.kicker}>
      <div className={styles.hero}>
        <p className={styles.kicker}>{c.kicker}</p>
        <h1 className={styles.title}>{rows.length ? c.title : c.emptyTitle}</h1>
        <p className={styles.subtitle}>{rows.length ? c.description : c.emptyDescription}</p>

        <button className={styles.primary} type="button" onClick={onStart} aria-controls="my-tests-list">
          <span className={styles.play}><Play size={22} aria-hidden="true" fill="currentColor" /></span>
          <span className={styles.primaryCopy}>
            <strong>{rows.length ? c.start : c.choose}</strong>
            <small>{rows.length ? c.startHint : c.chooseHint}</small>
          </span>
          <ArrowRight size={22} aria-hidden="true" />
        </button>

        <div className={styles.summary} role="group" aria-label={c.progress}>
          <span><ClipboardList size={16} aria-hidden="true" /> <strong>{rows.length}</strong> {c.selected}</span>
          <span><CheckCircle2 size={16} aria-hidden="true" /> <strong>{completed}/{rows.length}</strong> {c.completed}</span>
          <span className={styles.summaryEnd}><strong>{progress}%</strong></span>
        </div>
        <div className={styles.progressTrack} role="progressbar" aria-label={c.progress} aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}>
          <span style={{ width: progress + '%' }} />
        </div>
      </div>

      <details className={styles.extras}>
        <summary><span>{c.more}</span><ChevronDown size={18} aria-hidden="true" /></summary>
        <div className={styles.extraBody}>
          <section className={styles.reportPanel} aria-label={c.report}>
            <h2><Download size={19} aria-hidden="true" />{c.report}</h2>
            <p>{(results || []).length ? c.reportHint : c.noReport}</p>
            {!!(results || []).length && <ClientReportActions data={data} locale={locale} compact />}
          </section>
          <button className={styles.guidanceButton} type="button" onClick={() => setShowGuidance((value) => !value)} aria-expanded={showGuidance}>
            <Sparkles size={19} aria-hidden="true" />
            <span><strong>{c.guidance}</strong><small>{c.guidanceHint}</small></span>
          </button>
          {showGuidance && (
            <aside className={styles.guidance} aria-label={c.recommendationTitle}>
              <h2>{recommendation.title}</h2>
              <p>{recommendation.reason}</p>
              {recommendation.observation && <p>{recommendation.observation}</p>}
              {recommendation.reflection && <p>{recommendation.reflection}</p>}
              <small>{c.notMedical}</small>
            </aside>
          )}
        </div>
      </details>
    </section>
  )
}
