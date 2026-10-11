'use client'

import { useState } from 'react'
import { ArrowRight, CheckCircle2, ClipboardList, Play, SlidersHorizontal, Sparkles } from 'lucide-react'
import { nextPersonalRecommendation } from '@/lib/assessments/personal-guidance'
import { ClientReportActions } from './client-report-actions'
import styles from './my-tests-dashboard.module.css'

const COPY = {
  en: {
    kicker:'PERSONAL TESTS',title:'My tests',emptyTitle:'Choose your tests',
    intro:'Your test plan, progress and next steps.',emptyIntro:'Build a personal selection to get started.',
    selected:'Selected',completed:'Completed',progress:'Progress',
    filters:'Open test filters',review:'Review test filters',filterHint:'Topics, problems & recommended tests',
    choose:'Choose tests',chooseHint:'Find the most relevant questionnaires',
    guidance:'Get recommendations',notMedical:'For self-reflection only; not a diagnosis or treatment recommendation.',
    privacy:'Your completed results and saved answers stay in your private account.',
  },
  ru: {
    kicker:'ЛИЧНЫЕ ТЕСТЫ',title:'Мои тесты',emptyTitle:'Подберите свои тесты',
    intro:'Ваш набор, прогресс и дальнейшие шаги.',emptyIntro:'Выберите подходящие тесты, чтобы начать.',
    selected:'Выбрано',completed:'Пройдено',progress:'Прогресс',
    filters:'Открыть фильтр тестов',review:'Посмотреть новый подбор',filterHint:'Темы, проблемы и рекомендации',
    choose:'Подобрать тесты',chooseHint:'Выберите подходящие опросники',
    guidance:'Получить рекомендации',notMedical:'Для самонаблюдения; не является диагнозом или лечебной рекомендацией.',
    privacy:'Сохранённые ответы и результаты остаются в вашем приватном аккаунте.',
  },
}

export function MyTestsDashboard({
  locale='en',rows=[],completed=0,results=[],snapshot,data,
  onOpenFilters,filtersOpen=false,hasNewSelection=false,children,
}) {
  const c=COPY[locale]||COPY.en
  const [showGuidance,setShowGuidance]=useState(false)
  const progress=rows.length?Math.round(completed/rows.length*100):0
  const recommendation=nextPersonalRecommendation({results:results||[],snapshot,locale})
  return <section className={styles.dashboard} aria-label={c.kicker} data-my-tests-dashboard>
    <div className={styles.inner}>
      <div className={styles.header}>
        <div className={styles.headerText}>
          <p className={styles.kicker}>{c.kicker}</p>
          <h1 className={styles.title}>{rows.length?c.title:c.emptyTitle}</h1>
          <p className={styles.subtitle}>{rows.length?c.intro:c.emptyIntro}</p>
        </div>
      </div>
      <div className={styles.stats} role="group" aria-label={c.progress}>
        <div className={styles.stat}><ClipboardList size={17} aria-hidden="true"/><strong>{rows.length}</strong><span>{c.selected}</span></div>
        <div className={styles.stat}><CheckCircle2 size={17} aria-hidden="true"/><strong>{completed}/{rows.length}</strong><span>{c.completed}</span></div>
        <div className={styles.stat}>
          <span className={styles.circle} style={{'--value':progress+'%'}} aria-hidden="true"/>
          <strong>{progress}%</strong><span>{c.progress}</span>
        </div>
      </div>
      <div className={styles.progressTrack} role="progressbar" aria-label={c.progress}
        aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}>
        <span style={{width:progress+'%'}}/>
      </div>

      <button type="button" className={styles.filterButton}
        onClick={onOpenFilters} aria-controls="my-test-explorer" aria-expanded={filtersOpen}>
        <span className={styles.filterIcon}><SlidersHorizontal size={20} aria-hidden="true"/></span>
        <span><strong>{hasNewSelection?c.review:c.filters}</strong><small>{c.filterHint}</small></span>
        <ArrowRight size={18} aria-hidden="true"/>
      </button>

      {rows.length?children:<button type="button" className={styles.chooseButton} onClick={onOpenFilters}>
        <Play size={20} fill="currentColor" aria-hidden="true"/>
        <span><strong>{c.choose}</strong><small>{c.chooseHint}</small></span>
        <ArrowRight size={19} aria-hidden="true"/>
      </button>}

      <div className={styles.quickActions}>
        <div className={styles.reportQuick}>
          <ClientReportActions data={data} locale={locale} singleAction />
        </div>
        <button type="button" className={styles.guidanceButton} aria-expanded={showGuidance}
          onClick={()=>setShowGuidance(value=>!value)}>
          <Sparkles size={18} aria-hidden="true"/><span>{c.guidance}</span>
        </button>
      </div>
      {showGuidance && <aside className={styles.guidance} role="region">
        <h2>{recommendation.title}</h2>
        <p>{recommendation.reason}</p>
        {recommendation.observation&&<p>{recommendation.observation}</p>}
        {recommendation.reflection&&<p>{recommendation.reflection}</p>}
        <small>{c.notMedical}</small>
      </aside>}
      <p className={styles.privacy}>{c.privacy}</p>
    </div>
  </section>
}
