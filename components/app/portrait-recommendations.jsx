'use client'

import Link from 'next/link'
import { ArrowRight, Sprout, ShieldCheck } from 'lucide-react'
import { buildPortraitRecommendations } from '@/lib/profile/portrait-recommendations'
import styles from './portrait-recommendations.module.css'

const COPY = {
  en: {
    eyebrow: 'YOUR TEST RESULTS', title: 'Personal recommendations',
    intro: 'An overview of your measured resources and areas worth exploring, based on your saved questionnaire results.',
    strengths: 'Your strengths', growth: 'Areas for growth',
    noStrengths: 'No strongly supportive positions identified in the measured scales yet. This does not mean you lack strengths.',
    noGrowth: 'No distinct areas needing attention were highlighted by the available measured scales.',
    noData: 'There are no verified, directional scale results to summarize yet. Complete a recommended test to begin.',
    verify: 'Some saved results could not be verified. They were excluded; no estimate was substituted.',
    report: 'See test report', next: 'Complete my profile',
    nextCopy: 'Explore the key tests that can fill gaps in your profile. Repeat measurements can help you observe changes over time.',
    note: 'These are relative positions within individual questionnaire scales. The display-only bands are not clinical thresholds, percentages of health, diagnoses or comparisons with other people. Unmeasured areas are not weaknesses.',
  },
  ru: {
    eyebrow: 'РЕЗУЛЬТАТЫ ВАШИХ ТЕСТОВ', title: 'Персональные рекомендации',
    intro: 'Ваши измеренные ресурсы и направления для развития по реально сохранённым результатам тестирования.',
    strengths: 'Сильные стороны', growth: 'Зоны роста',
    noStrengths: 'Пока нет выраженных благоприятных позиций по измеренным шкалам. Это не означает, что у вас нет сильных сторон.',
    noGrowth: 'Среди измеренных показателей не выделены выраженные зоны, требующие внимания.',
    noData: 'Пока нет подтверждённых результатов направленных шкал. Начните с одного рекомендованного теста.',
    verify: 'Часть сохранённых результатов не прошла проверку. Эти данные исключены, значения не подставлялись.',
    report: 'Посмотреть отчёт', next: 'Дополнить профиль',
    nextCopy: 'Пройдите ключевые недостающие тесты. При повторных замерах можно отслеживать изменения со временем.',
    note: 'Это положение внутри отдельных шкал тестов. Пороговые уровни здесь только для навигации, а не клинические нормы, проценты здоровья, диагноз или сравнение с другими людьми. Неизмеренные области не являются слабостями.',
  },
}

function RecommendationGroup({ kind, title, rows, fallback, locale, report }) {
  const Icon = kind === 'strengths' ? ShieldCheck : Sprout
  return <section className={styles.group} data-kind={kind} aria-label={title}>
    <h3><Icon size={18} aria-hidden="true" />{title}</h3>
    {rows.length ? rows.map(row =>
      <article key={row.key} className={styles.row}>
        <div className={styles.score}><strong>{row.label}</strong><b>{row.percent}%</b></div>
        <p>{row.reflection}</p>
        <Link href={`/${locale}/app/results/${encodeURIComponent(row.resultId)}`} prefetch={false}>{report} →</Link>
      </article>) : <p className={styles.empty}>{fallback}</p>}
  </section>
}

export function PortraitRecommendations({ results = [], locale = 'en' }) {
  const t = COPY[locale] || COPY.en
  const model = buildPortraitRecommendations(results, locale)
  return <section id="hh-portrait-recommendations" tabIndex={-1} className={styles.root}
    aria-labelledby="hh-portrait-recommendations-title" data-testid="portrait-recommendations">
    <header className={styles.header}>
      <p className={styles.eyebrow}>{t.eyebrow}</p>
      <h2 id="hh-portrait-recommendations-title">{t.title}</h2>
      <p>{t.intro}</p>
    </header>
    {model.rejectedCount > 0 && <p className={styles.warning} role="status">{t.verify}</p>}
    {model.measuredCount === 0
      ? <p className={styles.empty}>{t.noData}</p>
      : <div className={styles.columns}>
          <RecommendationGroup kind="strengths" title={t.strengths} rows={model.strengths}
            fallback={t.noStrengths} locale={locale} report={t.report}/>
          <RecommendationGroup kind="growth" title={t.growth} rows={model.growth}
            fallback={t.noGrowth} locale={locale} report={t.report}/>
        </div>}
    <div className={styles.footer}>
      <p>{t.nextCopy}</p>
      <Link href={`/${locale}/app/tests?profile=missing`} prefetch={false}>
        {t.next}<ArrowRight size={16} aria-hidden="true"/>
      </Link>
    </div>
    <p className={styles.disclaimer}>{t.note}</p>
  </section>
}
