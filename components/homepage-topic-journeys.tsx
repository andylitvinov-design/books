import Image from 'next/image'
import Link from 'next/link'
import { ArrowUpRight } from 'lucide-react'
import type { PublicLocale } from '@/lib/public-locales'
import { listMyTubeCategories } from '@/lib/mandala/mytube-content-taxonomy.mjs'
import styles from './homepage-topic-journeys.module.css'

// Approved local artwork; routes remain compatible with the existing SEO landing pages.
const directionMeta = [
  { id: 'goals-money', route: 'business', image: '/images/holistic-house/course-focus-mountain-boy.webp' },
  { id: 'love-relationships', route: 'love', image: '/images/holistic-house/video-posters/constellations-en-v1.webp' },
  { id: 'energy-confidence', route: 'energy', image: '/images/holistic-house/reiki-approved-sunrise-v3.webp' },
  { id: 'stress-anxiety', route: 'stress', image: '/images/holistic-house/hero-olive-incense.webp' },
] as const

const copy = {
  en: {
    kicker: 'FIND YOUR DIRECTION',
    title: 'Goals & Money · Love & Relationships · Energy & Confidence · Stress & Anxiety',
    intro: 'Choose what matters most right now. Explore practical videos, self-reflection tools and personal support.',
    action: 'Explore options',
    details: {
      'goals-money': { eyebrow: 'PURPOSE, GOALS & FINANCES', detail: 'Purpose, personal goals, money, business and career.' },
      'love-relationships': { eyebrow: 'LOVE & CONNECTION', detail: 'Loneliness, finding love, couple relationships and family closeness.' },
      'energy-confidence': { eyebrow: 'VITALITY & SELF-CONFIDENCE', detail: 'Body wellbeing, fatigue recovery, energy, confidence and calm.' },
      'stress-anxiety': { eyebrow: 'STRESS & MENTAL WELLBEING', detail: 'Stress, burnout, anxiety, psychological trauma, depression and apathy.' },
    },
  },
  ru: {
    kicker: 'ВЫБЕРИТЕ СВОЁ НАПРАВЛЕНИЕ',
    title: 'Деньги и развитие · Любовь и отношения · Энергия и уверенность · Стресс и тревога',
    intro: 'Выберите то, что сейчас для вас важнее всего. Здесь — тематические видео, инструменты самоисследования и личная поддержка.',
    action: 'Посмотреть предложения',
    details: {
      'goals-money': { eyebrow: 'ПРЕДНАЗНАЧЕНИЕ, ЦЕЛИ И ФИНАНСЫ', detail: 'Предназначение, достижение целей, деньги, бизнес и карьера.' },
      'love-relationships': { eyebrow: 'ЛЮБОВЬ И БЛИЗОСТЬ', detail: 'Одиночество, поиск любви, отношения в паре, близость и семья.' },
      'energy-confidence': { eyebrow: 'ЖИЗНЕННЫЙ РЕСУРС И УВЕРЕННОСТЬ', detail: 'Тело и здоровье, усталость и восстановление, энергия, уверенность и спокойствие.' },
      'stress-anxiety': { eyebrow: 'СТРЕСС И ПСИХОЛОГИЧЕСКОЕ СОСТОЯНИЕ', detail: 'Стресс, выгорание, тревога, психологические травмы, депрессия и апатия.' },
    },
  },
  es: {
    kicker: 'ELIGE TU DIRECCIÓN',
    title: 'Metas y dinero · Amor y relaciones · Energía y confianza · Estrés y ansiedad',
    intro: 'Elige lo que más te importa ahora. Explora vídeos prácticos, herramientas de reflexión y apoyo personal.',
    action: 'Explorar opciones',
    details: {
      'goals-money': { eyebrow: 'PROPÓSITO, METAS Y FINANZAS', detail: 'Propósito, metas personales, dinero, negocios y carrera.' },
      'love-relationships': { eyebrow: 'AMOR Y CONEXIÓN', detail: 'Soledad, encontrar el amor, relaciones de pareja y cercanía familiar.' },
      'energy-confidence': { eyebrow: 'VITALIDAD Y CONFIANZA', detail: 'Bienestar corporal, recuperación del cansancio, energía, confianza y calma.' },
      'stress-anxiety': { eyebrow: 'ESTRÉS Y BIENESTAR EMOCIONAL', detail: 'Estrés, agotamiento, ansiedad, trauma psicológico, depresión y apatía.' },
    },
  },
} as const

export function HomepageTopicJourneys({ locale }: { locale: PublicLocale }) {
  const c = copy[locale]
  const categories = listMyTubeCategories(locale)
  return <section className={styles.section} aria-labelledby="hh-topic-journeys-title" id="hh-topic-journeys" data-home-topic-journeys>
    <header className={styles.heading}>
      <p className={styles.kicker}>{c.kicker}</p>
      <h2 id="hh-topic-journeys-title">{c.title}</h2>
      <p>{c.intro}</p>
    </header>
    <div className={styles.grid}>
      {directionMeta.map(direction => {
        const category = categories.find(item => item.id === direction.id)
        const detail = c.details[direction.id]
        if (!category) return null
        return <article key={direction.id} className={styles.tile} data-topic-id={direction.id}>
          <Link href={'/' + locale + '/explore/' + direction.route} className={styles.tileLink} prefetch={false}>
            <span className={styles.photo}>
              <Image src={direction.image} alt="" fill unoptimized loading="lazy"
                sizes="(max-width: 720px) 94px, (max-width: 1024px) 120px, 150px" />
            </span>
            <span className={styles.tileContent}>
              <span className={styles.eyebrow}>{detail.eyebrow}</span>
              <strong>{category.label}</strong>
              <span className={styles.description}>{detail.detail}</span>
              <span className={styles.action}>{c.action}<ArrowUpRight size={17} aria-hidden="true" /></span>
            </span>
          </Link>
        </article>
      })}
    </div>
  </section>
}
