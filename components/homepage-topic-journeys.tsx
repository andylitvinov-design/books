import Link from 'next/link'
import { ArrowUpRight, BriefcaseBusiness, HeartHandshake, Leaf, Target, Waves } from 'lucide-react'
import type { Locale } from '@/data/remedies'
import { TOPIC_JOURNEYS } from '@/lib/assessments/topic-journeys'
import styles from './homepage-topic-journeys.module.css'

const icons = { relationships: HeartHandshake, business: BriefcaseBusiness, stress: Waves, energy: Leaf, effectiveness: Target }
const text = {
  en: { kicker: 'FIND YOUR DIRECTION', title: 'What would you like to change?', intro: 'Start with a topic that matters to you. Choose a focus, then explore free tests, a support course or a personal written situation review.', action: 'Explore this topic' },
  ru: { kicker: 'ВЫБЕРИТЕ СВОЁ НАПРАВЛЕНИЕ', title: 'Что сейчас для вас важно?', intro: 'Сначала выберите сферу и конкретную тему. Затем — бесплатные тесты, курс поддержки или персональный письменный разбор.', action: 'Выбрать тему' },
} as const

export function HomepageTopicJourneys({ locale }: { locale: Locale }) {
  const language = locale === 'ru' ? 'ru' : 'en'
  const c = text[language]
  return <section className={styles.section} aria-labelledby="hh-topic-journeys" data-home-topic-journeys>
    <header className={styles.heading}>
      <p className={styles.kicker}>{c.kicker}</p>
      <h2 id="hh-topic-journeys">{c.title}</h2>
      <p>{c.intro}</p>
    </header>
    <div className={styles.grid}>
      {TOPIC_JOURNEYS.map((journey, index) => {
        const Icon = icons[journey.id as keyof typeof icons] || Target
        return <article key={journey.id} className={styles.tile} data-featured={index === 0} data-topic-id={journey.id}>
          <Link href={`/${language}/explore/${journey.id}`} className={styles.tileLink}>
            <span className={styles.icon}><Icon size={26} strokeWidth={1.65} aria-hidden="true" /></span>
            <span className={styles.tileContent}>
              <span className={styles.eyebrow}>{journey.eyebrow[language]}</span>
              <strong>{journey.title[language]}</strong>
              <span className={styles.description}>{journey.summary[language]}</span>
              <span className={styles.action}>{c.action}<ArrowUpRight size={17} aria-hidden="true" /></span>
            </span>
          </Link>
        </article>
      })}
    </div>
  </section>
}
