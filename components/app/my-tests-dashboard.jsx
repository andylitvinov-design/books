'use client'

import { useState } from 'react'
import { ArrowRight, CheckCircle2, ClipboardList, Play, Sparkles } from 'lucide-react'
import { nextPersonalRecommendation } from '@/lib/assessments/personal-guidance'
import { ClientReportActions } from './client-report-actions'
import styles from './my-tests-dashboard.module.css'

const COPY = {
  en: {
    kicker: 'MY TESTS · PERSONAL DASHBOARD',
    title: 'My tests & progress',
    emptyTitle: 'Your testing starts here',
    description: 'Your selected tests, progress and next steps in one place.',
    emptyDescription: 'Choose a few topics and build your personal test plan.',
    selected: 'Selected tests', completed: 'Completed', progress: 'Progress',
    report: 'Download report', reportHint: 'Complete a test to unlock your PDF',
    guidance: 'Get recommendations', guidanceHint: 'Your next helpful step',
    recommendationTitle: 'Your suggested next step',
    notMedical: 'These reflections are not a diagnosis or treatment recommendation.',
    start: 'Start testing', choose: 'Choose tests',
    startHint: 'Open your saved test list', chooseHint: 'Build your personal test set',
    preview: 'Your selected tests', viewAll: 'View all tests', next: 'Up next',
    notStarted: 'Not started', inProgress: 'In progress', done: 'Completed',
    emptyPreview: 'Your selected questionnaires will appear here.',
    pendingTitle: 'Another selection is ready',
    pendingText: 'You have an active test set. Keep its progress or switch to your new selection.',
    pendingCount: 'tests in new selection', keep: 'Keep saved set', replace: 'Use new selection',
  },
  ru: {
    kicker: 'МОИ ТЕСТЫ · ЛИЧНАЯ ПАНЕЛЬ',
    title: 'Мои тесты и прогресс',
    emptyTitle: 'Начните тестирование',
    description: 'Ваши выбранные тесты, прогресс и дальнейшие шаги на одном экране.',
    emptyDescription: 'Выберите несколько тем и составьте личный набор тестов.',
    selected: 'Выбрано тестов', completed: 'Пройдено', progress: 'Прогресс',
    report: 'Скачать отчёт', reportHint: 'PDF будет доступен после первого теста',
    guidance: 'Получить рекомендации', guidanceHint: 'Ваш следующий шаг',
    recommendationTitle: 'Рекомендуемый следующий шаг',
    notMedical: 'Результаты не являются диагнозом или назначением лечения.',
    start: 'Пройти тестирование', choose: 'Подобрать тесты',
    startHint: 'Открыть выбранный набор', chooseHint: 'Составить личный набор',
    preview: 'Ваши выбранные тесты', viewAll: 'Все тесты', next: 'Следующий',
    notStarted: 'Не начат', inProgress: 'В процессе', done: 'Пройден',
    emptyPreview: 'Здесь появятся выбранные вами тесты.',
    pendingTitle: 'Есть новая подборка',
    pendingText: 'Текущий набор уже сохранён. Можно продолжить его или перейти к новой подборке.',
    pendingCount: 'тестов в новой подборке', keep: 'Оставить текущий', replace: 'Применить новый',
  },
}

export function MyTestsDashboard({
  locale, rows, completed, results, snapshot, data, onStart,
  listOpen = false, conflict = null, onKeepSet, onUseNewSet, switchBusy = false,
}) {
  const c = COPY[locale] || COPY.en
  const [showGuidance, setShowGuidance] = useState(false)
  const progress = rows.length ? Math.round((completed / rows.length) * 100) : 0
  const recommendation = nextPersonalRecommendation({ results: results || [], snapshot, locale })
  const previews = rows.slice(0, 2)
  const pendingCount = Array.isArray(conflict?.keys) ? conflict.keys.length : 0

  return <section className={styles.dashboard} aria-label={c.kicker} data-my-tests-dashboard>
    <div className={styles.inner}>
      <p className={styles.kicker}>{c.kicker}</p>
      <h1 className={styles.title}>{rows.length ? c.title : c.emptyTitle}</h1>
      <p className={styles.subtitle}>{rows.length ? c.description : c.emptyDescription}</p>

      <div className={styles.stats} role="group" aria-label={c.progress}>
        <div className={styles.stat}>
          <ClipboardList size={19} aria-hidden="true" />
          <strong>{rows.length}</strong>
          <span>{c.selected}</span>
        </div>
        <div className={styles.stat}>
          <CheckCircle2 size={19} aria-hidden="true" />
          <strong>{completed} / {rows.length}</strong>
          <span>{c.completed}</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.circle} style={{ '--value': progress + '%' }} aria-hidden="true" />
          <strong>{progress}%</strong>
          <span>{c.progress}</span>
        </div>
      </div>
      <div className={styles.progressTrack} role="progressbar" aria-label={c.progress}
        aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}>
        <span style={{ width: progress + '%' }}/>
      </div>

      <div className={styles.quickActions}>
        <div className={styles.reportQuick}>
          <ClientReportActions data={data} locale={locale} singleAction />
          {!results?.length && <span className={styles.disabledHint}>{c.reportHint}</span>}
        </div>
        <button type="button" className={styles.guidanceButton} onClick={() => setShowGuidance((value) => !value)}
          aria-expanded={showGuidance}>
          <Sparkles size={21} aria-hidden="true"/>
          <span>{c.guidance}</span>
        </button>
      </div>
      {showGuidance && <aside className={styles.guidance} aria-label={c.recommendationTitle}>
        <h2>{recommendation.title}</h2>
        <p>{recommendation.reason}</p>
        {recommendation.observation && <p>{recommendation.observation}</p>}
        {recommendation.reflection && <p>{recommendation.reflection}</p>}
        <small>{c.notMedical}</small>
      </aside>}

      {conflict && <aside className={styles.pendingSelection} aria-label={c.pendingTitle} data-pending-selection>
        <div>
          <strong>{c.pendingTitle}</strong>
          <p>{c.pendingText}</p>
          <small>{pendingCount} {c.pendingCount}</small>
        </div>
        <div className={styles.pendingActions}>
          <button type="button" disabled={switchBusy} onClick={onKeepSet}>{c.keep}</button>
          <button type="button" disabled={switchBusy} onClick={onUseNewSet}>{c.replace}</button>
        </div>
      </aside>}

      <button type="button" className={styles.primary} onClick={onStart} aria-controls="my-tests-list"
        aria-expanded={listOpen}>
        <span className={styles.play}><Play aria-hidden="true" size={21} fill="currentColor"/></span>
        <span className={styles.primaryCopy}>
          <strong>{rows.length ? c.start : c.choose}</strong>
          <small>{rows.length ? c.startHint : c.chooseHint}</small>
        </span>
        <ArrowRight size={22} aria-hidden="true"/>
      </button>

      <div className={styles.preview}>
        <div className={styles.previewHeading}>
          <strong>{c.preview}</strong>
          {rows.length > 0 && <button type="button" onClick={onStart}>{c.viewAll} <ArrowRight size={16} aria-hidden="true"/></button>}
        </div>
        {previews.length ? <ul className={styles.previewList}>
          {previews.map((row) => {
            const label = row.run ? c.inProgress : row.completedInPlan ? c.done : c.notStarted
            return <li key={row.definition.id}>
              <span className={styles.previewName}>{row.title}</span>
              <span className={styles.previewStatus} data-status={row.run ? 'progress' : row.completedInPlan ? 'done' : 'pending'}>{label}</span>
            </li>
          })}
        </ul> : <p className={styles.emptyPreview}>{c.emptyPreview}</p>}
      </div>
    </div>
  </section>
}
