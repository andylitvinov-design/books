'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { ArrowLeft, ArrowRight, BookOpen, Check, ClipboardCheck, Compass, HeartHandshake, Sparkles } from 'lucide-react'
import { journeyFocusForTopics } from '@/lib/assessments/topic-journeys'
import styles from './topic-journey-selector.module.css'

type Language = 'en' | 'ru'
type Item = { id: string; title: Record<Language,string>; detail: Record<Language,string>; focus: readonly string[] }
type Journey = { id: string; title: Record<Language,string>; eyebrow: Record<Language,string>; summary: Record<Language,string>; introduction: Record<Language,string>; focus: readonly string[]; courseProgram: string; topics: readonly Item[] }
const copy = {
  en: {
    back:'All directions', eyebrow:'YOUR NEXT STEP', pickTitle:'Choose what you want to explore', pickHint:'Choose one or more themes. Your test selection will be filtered automatically; you can adjust it later.', chosen:'selected themes', default:'No theme selected yet — we will show tests for the whole direction.',
    options:'How would you like to begin?', test:'Take free tests', testDetail:'Open a short list of relevant questionnaires with your theme filters already applied.', course:'Free tests + 14-day support course', courseDetail:'Begin with questionnaires, then continue in the existing self-guided daily course. One free course at a time.', review:'Get a free personal situation review', reviewDetail:'Send a short form and a hand-drawn ME–GOAL–PROBLEM diagram. Receive a personal written reply; no free live constellation is included.',
    more:'About personal constellations', safety:'Tests and courses support self-reflection, not medical diagnosis or treatment.',
  },
  ru: {
    back:'Все направления', eyebrow:'С ЧЕГО НАЧАТЬ', pickTitle:'Выберите важные для себя темы', pickHint:'Отметьте одну или несколько тем. Подходящие тесты откроются с уже настроенным фильтром, который можно изменить.', chosen:'тем выбрано', default:'Пока темы не отмечены — предложим тесты по всему направлению.',
    options:'Как хотите продолжить?', test:'Пройти бесплатные тесты', testDetail:'Откроем подходящие опросники с настроенным тематическим фильтром.', course:'Тесты + бесплатный курс поддержки на 14 дней', courseDetail:'Начните с тестов и продолжите самостоятельную ежедневную программу. Бесплатно доступен один курс одновременно.', review:'Получить бесплатный персональный разбор ситуации', reviewDetail:'Заполните анкету и пришлите рисунок «Я — цель — проблема». Вы получите письменный разбор; живая расстановка в бесплатный формат не входит.',
    more:'О личных расстановках', safety:'Тесты и курсы предназначены для самонаблюдения, а не медицинской диагностики или лечения.',
  },
} as const

export function TopicJourneySelector({ locale, journey }: { locale: Language; journey: Journey }) {
  const language = locale === 'ru' ? 'ru' : 'en'
  const c = copy[language]
  const [selected, setSelected] = useState<string[]>([])
  const focus = useMemo(() => journeyFocusForTopics(journey, selected), [journey, selected])
  const testHref = `/${language}/client/tests?focus=${encodeURIComponent(focus.join(','))}`
  const courseHref = `/${language}/app/course?program=${encodeURIComponent(journey.courseProgram)}`
  const toggle = (id: string) => setSelected((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id])
  return <div className={styles.root} data-topic-journey={journey.id}>
    <section className={styles.hero}>
      <Link href={`/?lang=${language}#hh-topic-journeys`} className={styles.back}><ArrowLeft size={17} aria-hidden="true"/>{c.back}</Link>
      <p className={styles.eyebrow}>{journey.eyebrow[language]}</p>
      <h1>{journey.title[language]}</h1>
      <p className={styles.introduction}>{journey.introduction[language]}</p>
    </section>
    <section className={styles.selection} aria-labelledby="hh-topic-selection-heading">
      <div className={styles.sectionHead}>
        <p className={styles.eyebrow}>{c.eyebrow}</p>
        <h2 id="hh-topic-selection-heading">{c.pickTitle}</h2>
        <p>{c.pickHint}</p>
      </div>
      <div className={styles.topics} role="group" aria-label={c.pickTitle}>
        {journey.topics.map((topic) => <button key={topic.id} type="button" className={styles.topic}
          aria-pressed={selected.includes(topic.id)} data-topic-choice={topic.id} onClick={() => toggle(topic.id)}>
          <span className={styles.check}><Check size={17} aria-hidden="true" /></span>
          <span><strong>{topic.title[language]}</strong><small>{topic.detail[language]}</small></span>
        </button>)}
      </div>
      <p className={styles.selectionStatus} role="status" aria-live="polite">
        {selected.length ? `${selected.length} ${c.chosen}` : c.default}
      </p>
    </section>
    <section className={styles.actions} aria-labelledby="hh-topic-actions-heading">
      <div className={styles.sectionHead}>
        <p className={styles.eyebrow}>HOLISTIC HOUSE</p>
        <h2 id="hh-topic-actions-heading">{c.options}</h2>
      </div>
      <div className={styles.actionGrid}>
        <Link href={testHref} className={styles.actionCard} data-topic-action="tests">
          <span className={styles.actionIcon}><ClipboardCheck size={25} aria-hidden="true"/></span>
          <strong>{c.test}</strong><span>{c.testDetail}</span>
          <b>{language === 'ru' ? 'Подобрать тесты' : 'Find my tests'}<ArrowRight size={19} aria-hidden="true"/></b>
        </Link>
        <Link href={courseHref} className={styles.actionCard} data-topic-action="course">
          <span className={styles.actionIcon}><BookOpen size={25} aria-hidden="true"/></span>
          <strong>{c.course}</strong><span>{c.courseDetail}</span>
          <b>{language === 'ru' ? 'Начать курс' : 'Start a course'}<ArrowRight size={19} aria-hidden="true"/></b>
        </Link>
        <Link href={`/${language}/services/free-situation-review`} className={styles.actionCard} data-topic-action="review">
          <span className={styles.actionIcon}><HeartHandshake size={25} aria-hidden="true"/></span>
          <strong>{c.review}</strong><span>{c.reviewDetail}</span>
          <b>{language === 'ru' ? 'Получить разбор' : 'Request a written review'}<ArrowRight size={19} aria-hidden="true"/></b>
        </Link>
      </div>
      <div className={styles.footnote}>
        <span><Sparkles size={16} aria-hidden="true"/>{c.safety}</span>
        <Link href={`/${language}/services/systemic-constellations`}><Compass size={16} aria-hidden="true"/>{c.more}<ArrowRight size={15} aria-hidden="true"/></Link>
      </div>
    </section>
  </div>
}
