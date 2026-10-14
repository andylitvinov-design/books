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
    options:'How would you like to begin?', test:'Take tests', testDetail:'Open a short list of relevant questionnaires with your theme filters already applied.', course:'Free support course', courseDetail:'Begin with questionnaires, then continue in the existing self-guided daily course. One free course at a time.', review:'Personal situation review (constellation)', reviewDetail:'Send a short form and a hand-drawn ME–GOAL–PROBLEM diagram. Receive a personal written reply; no free live constellation is included.',
    more:'About personal constellations', safety:'Tests and courses support self-reflection, not medical diagnosis or treatment.',
  },
  ru: {
    back:'Все направления', eyebrow:'С ЧЕГО НАЧАТЬ', pickTitle:'Выберите важные для себя темы', pickHint:'Отметьте одну или несколько тем. Подходящие тесты откроются с уже настроенным фильтром, который можно изменить.', chosen:'тем выбрано', default:'Пока темы не отмечены — предложим тесты по всему направлению.',
    options:'Как хотите продолжить?', test:'Пройти тесты', testDetail:'Откроем подходящие опросники с настроенным тематическим фильтром.', course:'Бесплатный курс поддержки', courseDetail:'Начните с тестов и продолжите самостоятельную ежедневную программу. Бесплатно доступен один курс одновременно.', review:'Личная диагностика (расстановка)', reviewDetail:'Заполните анкету и пришлите рисунок «Я — цель — проблема». Вы получите письменный разбор; живая расстановка в бесплатный формат не входит.',
    more:'О личных расстановках', safety:'Тесты и курсы предназначены для самонаблюдения, а не медицинской диагностики или лечения.',
  },
} as const

export function TopicJourneySelector({ locale, journey }: { locale: Language; journey: Journey }) {
  const language = locale === 'ru' ? 'ru' : 'en'
  const c = copy[language]
  const [selected, setSelected] = useState<string[]>([])
  const focus = useMemo(() => journeyFocusForTopics(journey, selected), [journey, selected])
  const testHref = `/${language}/client/tests?focus=${encodeURIComponent(focus.join(','))}&journey=${journey.id}&topics=${encodeURIComponent(selected.join(','))}`
  // Starting from the free-course option keeps the same filtered test battery,
  // then activates the personal-course mode after the visitor reviews it.
  const courseHref = testHref + '&mode=course'
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
      <Link href={testHref} className={styles.primaryAction} data-topic-action="tests">
        <span className={styles.primaryIcon}><ClipboardCheck size={27} aria-hidden="true"/></span>
        <span className={styles.primaryContent}><strong>{c.test}</strong><small>{c.testDetail}</small></span>
        <ArrowRight size={28} aria-hidden="true" className={styles.primaryArrow}/>
      </Link>
      <div className={styles.secondaryActions} aria-label={language === 'ru' ? 'Другие варианты' : 'Other ways to begin'}>
        <Link href={courseHref} className={styles.secondaryLink} data-topic-action="course">
          <BookOpen size={20} aria-hidden="true"/>
          <span><strong>{c.course}</strong><small>{c.courseDetail}</small></span>
          <ArrowRight size={17} aria-hidden="true"/>
        </Link>
        <Link href={`/${language}/services/free-situation-review`} className={styles.secondaryLink} data-topic-action="review">
          <HeartHandshake size={20} aria-hidden="true"/>
          <span><strong>{c.review}</strong><small>{c.reviewDetail}</small></span>
          <ArrowRight size={17} aria-hidden="true"/>
        </Link>
      </div>
      <div className={styles.footnote}>
        <span><Sparkles size={16} aria-hidden="true"/>{c.safety}</span>
        <Link href={`/${language}/services/systemic-constellations`}><Compass size={16} aria-hidden="true"/>{c.more}<ArrowRight size={15} aria-hidden="true"/></Link>
      </div>
    </section>
  </div>
}
