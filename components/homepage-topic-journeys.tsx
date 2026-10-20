import Image from 'next/image'
import Link from 'next/link'
import { ArrowUpRight } from 'lucide-react'
import type { Locale } from '@/data/remedies'
import { TOPIC_JOURNEYS } from '@/lib/assessments/topic-journeys'
import styles from './homepage-topic-journeys.module.css'

// Reuse the site's approved photographic assets. Keep these static and
// unoptimized to avoid consuming the exhausted Vercel image-transform quota.
const photos: Record<string, string> = {
  relationships: '/images/holistic-house/video-posters/constellations-en-v1.webp',
  business: '/images/holistic-house/portrait-static/andy-828-3dcbabded1e9.webp',
  stress: '/images/holistic-house/hero-olive-incense.webp',
  energy: '/academy/reiki-yggdrasil/source/eastern-tradition.png',
  effectiveness: '/images/holistic-house/video-posters/hypnotherapy-en-v1.webp',
}
const text = {
  en: {
    kicker: 'FIND YOUR DIRECTION',
    title: 'What matters to you right now?',
    intro: 'Choose a direction, then a focus. We will suggest two free tests to begin with.',
    action: 'Take a free test',
  },
  ru: {
    kicker: 'ВЫБЕРИТЕ СВОЁ НАПРАВЛЕНИЕ',
    title: 'Что сейчас для вас важно?',
    intro: 'Выберите направление и тему — предложим два бесплатных теста для начала.',
    action: 'Пройти тест',
  },
} as const

export function HomepageTopicJourneys({ locale }: { locale: Locale }) {
  const language = locale === 'ru' ? 'ru' : 'en'
  const c = text[language]
  return <section className={styles.section} aria-labelledby="hh-topic-journeys" id="hh-topic-journeys" data-home-topic-journeys>
    <header className={styles.heading}>
      <p className={styles.kicker}>{c.kicker}</p>
      <h2>{c.title}</h2>
      <p>{c.intro}</p>
    </header>
    <div className={styles.grid}>
      {TOPIC_JOURNEYS.map((journey) => <article key={journey.id} className={styles.tile} data-topic-id={journey.id}>
        <Link href={`/${language}/explore/${journey.id}`} className={styles.tileLink}>
          <span className={styles.photo}>
            <Image src={photos[journey.id]} alt="" fill unoptimized loading="lazy"
              sizes="(max-width: 720px) 116px, (max-width: 1024px) 145px, 185px" />
          </span>
          <span className={styles.tileContent}>
            <span className={styles.eyebrow}>{journey.eyebrow[language]}</span>
            <strong>{journey.title[language]}</strong>
            <span className={styles.description}>{journey.summary[language]}</span>
            <span className={styles.action}>{c.action}<ArrowUpRight size={17} aria-hidden="true" /></span>
          </span>
        </Link>
      </article>)}
    </div>
  </section>
}
