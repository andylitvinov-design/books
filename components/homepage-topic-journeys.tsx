import Image from 'next/image'
import Link from 'next/link'
import { ArrowUpRight } from 'lucide-react'
import type { PublicLocale } from '@/lib/public-locales'
import styles from './homepage-topic-journeys.module.css'

// Approved local artwork; images are not transformed at request time.
const directions = [
  { id: 'energy', image: '/images/holistic-house/reiki-approved-sunrise-v3.webp' },
  { id: 'relationships', image: '/images/holistic-house/video-posters/constellations-en-v1.webp' },
  { id: 'business', image: '/images/holistic-house/portrait-static/andy-828-3dcbabded1e9.webp' },
] as const

const copy = {
  en: {
    kicker: 'FIND YOUR DIRECTION',
    title: 'Energy · Love · Business',
    intro: 'Choose the area that matters to you. Each offers a free test, a practical course and personal guidance.',
    action: 'Explore options',
    energy: { title: 'Energy', eyebrow: 'WELLBEING & BALANCE', detail: 'Stress, recovery, Reiki and inner resources.' },
    relationships: { title: 'Love', eyebrow: 'CONNECTION & CLOSENESS', detail: 'Trust, communication and personal boundaries.' },
    business: { title: 'Business', eyebrow: 'WORK & DEVELOPMENT', detail: 'Career, focus, decisions and project growth.' },
  },
  ru: {
    kicker: 'ВЫБЕРИТЕ СВОЁ НАПРАВЛЕНИЕ',
    title: 'Энергия · Любовь · Бизнес',
    intro: 'Выберите важную вам сферу. В каждой — бесплатный тест, практический курс и личная консультация.',
    action: 'Посмотреть предложения',
    energy: { title: 'Энергия', eyebrow: 'РЕСУРСЫ И РАВНОВЕСИЕ', detail: 'Стресс, восстановление, Рейки и внутренняя опора.' },
    relationships: { title: 'Любовь', eyebrow: 'КОНТАКТ И БЛИЗОСТЬ', detail: 'Доверие, общение и личные границы.' },
    business: { title: 'Бизнес', eyebrow: 'РАБОТА И РАЗВИТИЕ', detail: 'Карьера, решения, фокус и рост проекта.' },
  },
  es: {
    kicker: 'ELIGE TU DIRECCIÓN',
    title: 'Energía · Amor · Negocios',
    intro: 'Elige tu área. Encuentra un test gratuito, un curso práctico y apoyo personal.',
    action: 'Explorar opciones',
    energy: { title: 'Energía', eyebrow: 'BIENESTAR Y EQUILIBRIO', detail: 'Estrés, recuperación, Reiki y recursos personales.' },
    relationships: { title: 'Amor', eyebrow: 'CONEXIÓN Y CERCANÍA', detail: 'Confianza, comunicación y límites personales.' },
    business: { title: 'Negocios', eyebrow: 'TRABAJO Y DESARROLLO', detail: 'Carrera, decisiones, foco y crecimiento del proyecto.' },
  },
} as const

export function HomepageTopicJourneys({ locale }: { locale: PublicLocale }) {
  const c = copy[locale]
  return <section className={styles.section} aria-labelledby="hh-topic-journeys-title" id="hh-topic-journeys" data-home-topic-journeys>
    <header className={styles.heading}>
      <p className={styles.kicker}>{c.kicker}</p>
      <h2 id="hh-topic-journeys-title">{c.title}</h2>
      <p>{c.intro}</p>
    </header>
    <div className={styles.grid}>
      {directions.map(direction => <article key={direction.id} className={styles.tile} data-topic-id={direction.id}>
        <Link href={'/' + locale + '/explore/' + (direction.id === 'relationships' ? 'love' : direction.id)} className={styles.tileLink} prefetch={false}>
          <span className={styles.photo}>
            <Image src={direction.image} alt="" fill unoptimized loading="lazy"
              sizes="(max-width: 720px) 94px, (max-width: 1024px) 120px, 150px" />
          </span>
          <span className={styles.tileContent}>
            <span className={styles.eyebrow}>{c[direction.id].eyebrow}</span>
            <strong>{c[direction.id].title}</strong>
            <span className={styles.description}>{c[direction.id].detail}</span>
            <span className={styles.action}>{c.action}<ArrowUpRight size={17} aria-hidden="true" /></span>
          </span>
        </Link>
      </article>)}
    </div>
  </section>
}
