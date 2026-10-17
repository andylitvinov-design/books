'use client'

import { useState } from 'react'
import { CheckCircle2, ChevronDown, ClipboardList, SlidersHorizontal, Sparkles } from 'lucide-react'
import { nextPersonalRecommendation } from '@/lib/assessments/personal-guidance'
import { ClientReportActions } from './client-report-actions'
import styles from './my-tests-dashboard.module.css'

const COPY = {
  en: {
    kicker: 'PERSONAL TESTS', title: 'My tests', emptyTitle: 'Choose your tests',
    intro: 'Your selected tests, progress and next steps.', emptyIntro: 'Build your personal test selection to get started.',
    selected: 'Selected', completed: 'Completed', progress: 'Progress',
    choose: 'Choose matching tests', close: 'Hide test picker', review: 'Review new test selection',
    filterHint: 'Topics, concerns & recommended tests', closeHint: 'Tap to collapse the selection panel',
    guidance: 'Get recommendations',
    notMedical: 'For self-reflection only; not a diagnosis or treatment recommendation.',
    privacy: 'Your completed results and saved answers stay in your private account.',
  },
  ru: {
    kicker: 'ЛИЧНЫЕ ТЕСТЫ', title: 'Мои тесты', emptyTitle: 'Подберите свои тесты',
    intro: 'Ваши выбранные тесты, прогресс и дальнейшие шаги.', emptyIntro: 'Подберите тесты, чтобы создать личный набор.',
    selected: 'Выбрано', completed: 'Пройдено', progress: 'Прогресс',
    choose: 'Подобрать тесты', close: 'Скрыть подбор тестов', review: 'Проверить новый подбор',
    filterHint: 'Темы, проблемы и рекомендованные тесты', closeHint: 'Нажмите, чтобы свернуть подбор',
    guidance: 'Получить рекомендации',
    notMedical: 'Для самонаблюдения; не является диагнозом или лечебной рекомендацией.',
    privacy: 'Сохранённые ответы и результаты остаются в вашем приватном аккаунте.',
  },
}

export function MyTestsDashboard({
  locale = 'en', rows = [], completed = 0, results = [], snapshot, data,
  onOpenFilters, filtersOpen = false, hasNewSelection = false, hasList = false,
  explorer = null, children,
}) {
  const c = COPY[locale] || COPY.en
  const [showGuidance, setShowGuidance] = useState(false)
  const progress = rows.length ? Math.min(100, Math.max(0, Math.round(completed / rows.length * 100))) : 0
  const recommendation = nextPersonalRecommendation({ results: results || [], snapshot, locale })

  return <section className={styles.dashboard} aria-label={c.kicker} data-my-tests-dashboard>
    <div className={styles.inner}>
      {/* This disclosure is deliberately the first action, above the overview and saved tests. */}
      <button type="button" id="my-tests-picker-toggle" className={styles.filterButton}
        onClick={onOpenFilters} aria-controls="my-test-explorer" aria-expanded={filtersOpen}>
        <span className={styles.filterIcon}><SlidersHorizontal size={22} aria-hidden="true" /></span>
        <span className={styles.filterCopy}>
          <strong>{filtersOpen ? c.close : hasNewSelection ? c.review : c.choose}</strong>
          <small>{filtersOpen ? c.closeHint : c.filterHint}</small>
        </span>
        <ChevronDown className={styles.filterChevron} size={21} aria-hidden="true" />
      </button>

      {/* The picker is mounted immediately below its trigger, not after the entire saved list.
          The parent preserves the unsaved filter draft while this panel is collapsed. */}
      {explorer}

      <div className={styles.header}>
        <div className={styles.headerText}>
          <p className={styles.kicker}>{c.kicker}</p>
          <h1 className={styles.title}>{rows.length ? c.title : c.emptyTitle}</h1>
          <p className={styles.subtitle}>{rows.length ? c.intro : c.emptyIntro}</p>
        </div>
      </div>

      <div className={styles.stats} role="group" aria-label={c.progress}>
        <div className={styles.stat}><ClipboardList size={17} aria-hidden="true" /><strong>{rows.length}</strong><span>{c.selected}</span></div>
        <div className={styles.stat}><CheckCircle2 size={17} aria-hidden="true" /><strong>{completed}/{rows.length}</strong><span>{c.completed}</span></div>
        <div className={styles.stat}>
          <span className={styles.circle} style={{ '--value': progress + '%' }} aria-hidden="true" />
          <strong>{progress}%</strong><span>{c.progress}</span>
        </div>
      </div>
      <div className={styles.progressTrack} role="progressbar" aria-label={c.progress}
        aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}>
        <span style={{ width: progress + '%' }} />
      </div>

      <div className={styles.quickActions}>
        <div className={styles.reportQuick}>
          <ClientReportActions data={data} locale={locale} singleAction />
        </div>
        <button type="button" className={styles.guidanceButton} aria-expanded={showGuidance}
          onClick={() => setShowGuidance(value => !value)}>
          <Sparkles size={17} aria-hidden="true" /><span>{c.guidance}</span>
        </button>
      </div>
      {showGuidance && <aside className={styles.guidance} role="region">
        <h2>{recommendation.title}</h2>
        <p>{recommendation.reason}</p>
        {recommendation.observation && <p>{recommendation.observation}</p>}
        {recommendation.reflection && <p>{recommendation.reflection}</p>}
        <small>{c.notMedical}</small>
      </aside>}

      {hasList && children}
      <p className={styles.privacy}>{c.privacy}</p>
    </div>
  </section>
}
