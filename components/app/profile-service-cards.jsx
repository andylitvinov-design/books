'use client'

import Link from 'next/link'
import Image from 'next/image'
import { ArrowRight, BarChart3, BookOpen, Brain, FileSearch, HeartHandshake } from 'lucide-react'
import styles from './profile-service-cards.module.css'

// The cards are authenticated navigation, never a copy of a client's documents.
// Personal reports remain rendered only by their existing authorized reader.
const WORDS = {
  ru: {
    eyebrow: 'HOLISTIC HOUSE · МОЁ ПРОСТРАНСТВО',
    heading: 'Мои услуги и возможности',
    intro: 'Ваши тесты, личные отчёты и программы поддержки — всё в одном месте.',
    tests: {
      title: 'Мои тесты',
      description: 'Психологические и ресурсные тесты, результаты и динамика изменений.',
      action: 'Перейти к тестам',
      count: 'Сохранено результатов',
    },
    blitz: {
      title: 'Отчёты блиц-диагностики',
      description: 'Бесплатный письменный разбор вашей ситуации и индивидуальные рекомендации.',
      action: 'Заказать блиц-диагностику',
      secondary: 'Посмотреть мои отчёты',
    },
    consultations: {
      title: 'Отчёты личной консультации',
      description: 'Ваши персональные разборы, рекомендации и документы от специалиста.',
      action: 'Мои отчёты',
      secondary: 'История и документы',
    },
    course: {
      title: 'Мой курс',
      description: 'Ежедневные практики, персональная программа поддержки и измерение прогресса.',
      action: 'Перейти к курсу',
    },
  },
  en: {
    eyebrow: 'HOLISTIC HOUSE · PERSONAL SPACE',
    heading: 'My services and resources',
    intro: 'Your tests, personal reports and support programmes — together in one place.',
    tests: {
      title: 'My tests',
      description: 'Psychological and resource self-assessments, results and trends over time.',
      action: 'Open my tests',
      count: 'Saved results',
    },
    blitz: {
      title: 'Express review reports',
      description: 'A free written review of your situation with personalised reflections.',
      action: 'Request a free express review',
      secondary: 'View my saved reports',
    },
    consultations: {
      title: 'Personal consultation reports',
      description: 'Your private session reports, practitioner recommendations and documents.',
      action: 'My reports',
      secondary: 'History and documents',
    },
    course: {
      title: 'My course',
      description: 'Daily activities, individual support and progress you can measure.',
      action: 'Continue my course',
    },
  },
}

const IMAGES = {
  tests: '/images/holistic-house/homepage-botanical.svg',
  blitz: '/images/holistic-house/hero-olive-incense.webp',
  consultations: '/images/holistic-house/homepage-guided-imagery.svg',
  course: '/images/holistic-house/course-journey-landscape.svg',
}

export function ProfileServiceCards({ locale = 'en', results = [] }) {
  const lang = locale === 'ru' ? 'ru' : 'en'
  const t = WORDS[lang]
  const root = '/' + lang + '/app'
  const archive = '#personal-reports'
  const count = Array.isArray(results) ? results.filter(result => result && result.id).length : 0
  const cards = [
    {
      id: 'tests', icon: Brain, copy: t.tests,
      primaryHref: root + '/tests',
    },
    {
      id: 'blitz', icon: FileSearch, copy: t.blitz,
      primaryHref: '/' + lang + '/services/free-situation-review',
      secondaryHref: archive,
    },
    {
      id: 'consultations', icon: HeartHandshake, copy: t.consultations,
      primaryHref: archive,
      secondaryHref: root + '/history',
    },
    {
      id: 'course', icon: BookOpen, copy: t.course,
      primaryHref: root + '/course',
    },
  ]

  return <section className={styles.root} aria-labelledby="hh-profile-service-title" data-profile-service-cards>
    <header className={styles.sectionHeading}>
      <p className={styles.eyebrow}>{t.eyebrow}</p>
      <h2 id="hh-profile-service-title">{t.heading}</h2>
      <p>{t.intro}</p>
    </header>
    <div className={styles.grid}>
      {cards.map(card => {
        const Icon = card.icon
        return <article key={card.id} className={[styles.card, styles[card.id]].join(' ')} data-profile-service={card.id}>
          <div className={styles.art} aria-hidden="true">
            <Image src={IMAGES[card.id]} alt="" fill sizes="(max-width: 540px) 180px, 260px" />
          </div>
          <div className={styles.cardHeader}>
            <span className={styles.icon} aria-hidden="true"><Icon size={27} strokeWidth={1.9} /></span>
            <h3>{card.copy.title}</h3>
            <Link className={styles.arrow} href={card.primaryHref} prefetch={false} aria-label={card.copy.action}>
              <ArrowRight size={23} aria-hidden="true" />
            </Link>
          </div>
          <p className={styles.description}>{card.copy.description}</p>
          {card.id === 'tests' && <p className={styles.measure} aria-label={t.tests.count + ': ' + count}>
            <BarChart3 size={19} aria-hidden="true" /><span>{t.tests.count}: <strong>{count}</strong></span>
          </p>}
          <div className={styles.actions}>
            <Link className={styles.primary} href={card.primaryHref} prefetch={false}>
              <span>{card.copy.action}</span><ArrowRight size={20} aria-hidden="true" />
            </Link>
            {card.secondaryHref && <Link className={styles.secondary} href={card.secondaryHref} prefetch={false}>
              {card.copy.secondary} <ArrowRight size={15} aria-hidden="true" />
            </Link>}
          </div>
        </article>
      })}
    </div>
  </section>
}
