'use client'

import { useState } from 'react'
import { Activity, ChartNoAxesCombined } from 'lucide-react'
import { buildLessonFocusTrends, compareLessonMoments, focusTrendAria, changeAmount, momentChangeMeaning } from '@/lib/inner-growth/course-moment-trends'
import { COURSE_ANTISTRESS_SKILLS_V6 } from '@/lib/inner-growth/anti-stress-skills-v6'
import styles from './course-moment-trends.module.css'

const COPY = {
  en: {
    title: 'My daily changes', note: 'How difficult the same focus felt before and after each practice',
    noteAvailability: 'How available a small step felt before and after each practice',
    before: 'Before', after: 'After', empty: 'Your first paired rating will appear here after you save a lesson.',
    few: 'A trend will become clearer after several observations of the same skill.',
    easier: 'less difficult after the practice', harder: 'more difficult after the practice',
    moreAvailable: 'more available after the practice', lessAvailable: 'less available after the practice',
    same: 'same rating before and after', point: 'points',
    missing: 'not rated', disclaimer: 'Optional self-reports, not a test or evidence of treatment effect.',
    day: 'Day', scale: 'Practice focus', measure: '0 = no difficulty · 10 = very difficult',
    measureAvailability: '0 = not yet available · 10 = feels available',
  },
  ru: {
    title: 'Моя динамика', note: 'Насколько трудной ощущалась одна и та же тема до и после практики',
    noteAvailability: 'Насколько доступным ощущался небольшой шаг до и после практики',
    before: 'До', after: 'После', empty: 'Первый парный замер появится после сохранения занятия.',
    few: 'Динамика станет нагляднее после нескольких замеров одной темы.',
    easier: 'меньше трудности после практики', harder: 'больше трудности после практики',
    moreAvailable: 'шаг доступнее после практики', lessAvailable: 'шаг менее доступен после практики',
    same: 'оценка до и после совпала', point: 'балла',
    missing: 'нет оценки', disclaimer: 'Добровольные самооценки, не тест и не доказательство лечебного эффекта.',
    day: 'День', scale: 'Тема практики', measure: '0 = нет трудности · 10 = очень трудно',
    measureAvailability: '0 = пока недоступно · 10 = доступно',
  },
}

const X = day => 34 + (day - 1) * (458 / 13)
const Y = value => 117 - (value / 10) * 90
function plottedValues(points, field) {
  return points.filter(p => p[field] !== null).map(p => X(p.day) + ',' + Y(p[field])).join(' ')
}

export default function CourseMomentTrends({ locale = 'en', cycle = {}, progress = {}, roadmap = [] }) {
  const words = COPY[locale] || COPY.en
  // Cycle versions are pinned: historical V6 availability responses must never
  // be treated as difficulty scores or silently reverse-coded.
  const availabilityAxis = cycle.contentVersion === COURSE_ANTISTRESS_SKILLS_V6
  const direction = availabilityAxis ? 'higher_is_more_available' : 'higher_is_more_difficult'
  const [selected, setSelected] = useState(null)
  const series = buildLessonFocusTrends(progress.days, roadmap)
  if (!series.length) return null
  const current = roadmap.find(item => item.day === cycle.day)
  const currentKey = current?.focusScaleId || current?.focusGoal || 'personal-focus'
  const group = series.find(item => item.key === selected) ||
    series.find(item => item.key === currentKey && item.ratedDays > 0) ||
    series.find(item => item.ratedDays > 0) || series[0]
  const latest = group.points[group.points.length - 1]
  const comparison = latest ? compareLessonMoments(latest.before, latest.after) : null
  const changeMeaning = comparison ? momentChangeMeaning(comparison.change, direction) : null
  const measureLabel = availabilityAxis ? words.measureAvailability : words.measure
  const label = group.label || current?.focusTitle || words.scale
  const beforeLine = plottedValues(group.points, 'before')
  const afterLine = plottedValues(group.points, 'after')

  return <section className={styles.panel} data-course-focus-trends aria-label={words.title}>
    <header className={styles.header}>
      <span className={styles.headingIcon}><ChartNoAxesCombined size={19} aria-hidden="true"/></span>
      <div><h3>{words.title}</h3><p>{availabilityAxis ? words.noteAvailability : words.note}</p></div>
      <span className={styles.count}>{group.ratedDays}/{group.dayCount}</span>
    </header>
    {series.length > 1 && <div className={styles.focusPicker} role="group" aria-label={words.scale}>
      {series.map(item => <button type="button" key={item.key}
        aria-pressed={group.key === item.key}
        onClick={() => setSelected(item.key)}>{item.label || words.scale}</button>)}
    </div>}
    <p className={styles.focusLabel}><Activity size={15} aria-hidden="true"/>{label}</p>
    {group.points.length ? <>
      <svg className={styles.graph} viewBox="0 0 520 151" role="img"
        aria-label={label + ': ' + measureLabel + '. ' + focusTrendAria(group, { before: words.before, after: words.after, missing: words.missing, day: words.day })}>
        {[0,5,10].map(level => <g key={level}>
          <line x1="34" x2="492" y1={Y(level)} y2={Y(level)} className={styles.gridline}/>
          <text x="23" y={Y(level) + 4} textAnchor="end" className={styles.axisText}>{level}</text>
        </g>)}
        {[1,4,7,10,14].map(day => <text key={day} x={X(day)} y="139"
          textAnchor="middle" className={styles.axisText}>{day}</text>)}
        {beforeLine.split(' ').length > 1 && <polyline className={styles.beforeLine} points={beforeLine}/>}
        {afterLine.split(' ').length > 1 && <polyline className={styles.afterLine} points={afterLine}/>}
        {group.points.map(point => <g key={point.day}>
          {point.before !== null && <circle className={styles.beforeDot} cx={X(point.day)} cy={Y(point.before)} r="5">
            <title>{words.day} {point.day}: {words.before} {point.before}/10</title></circle>}
          {point.after !== null && <circle className={styles.afterDot} cx={X(point.day)} cy={Y(point.after)} r="5">
            <title>{words.day} {point.day}: {words.after} {point.after}/10</title></circle>}
        </g>)}
      </svg>
      <div className={styles.legend}>
        <span><i className={styles.beforeSwatch}/>{words.before}</span>
        <span><i className={styles.afterSwatch}/>{words.after}</span>
        <small>{words.day} 1–14</small>
      </div>
      {comparison && <p className={styles.comparison}>
        {words.day} {latest.day} · {comparison.before}/10 → {comparison.after}/10 · {comparison.change === 0
          ? words.same
          : changeAmount(comparison.change, locale) + ' ' + ({
            less_difficult: words.easier,
            more_difficult: words.harder,
            more_available: words.moreAvailable,
            less_available: words.lessAvailable,
          }[changeMeaning] || words.same)}
      </p>}
      {group.ratedDays < 2 && <p className={styles.context}>{words.few}</p>}
    </> : <p className={styles.empty}>{words.empty}</p>}
    <p className={styles.disclaimer} data-course-rating-direction={direction}>{measureLabel}. {words.disclaimer}</p>
  </section>
}
