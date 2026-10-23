'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useState } from 'react'
import { ArrowRight, BookOpen, ClipboardCheck, MessageCircle, SlidersHorizontal } from 'lucide-react'
import type { PublicLocale } from '@/lib/public-locales'
import styles from './topic-path-offers.module.css'

type Language = PublicLocale
type Direction = 'energy' | 'love' | 'business'
type Topic = { id: string; title: Record<Language, string>; focus: readonly string[] }
type Journey = { id: string; focus: readonly string[]; topics: readonly Topic[] }
type Offering = { title: string; detail: string; action: string; note: string }
type Words = {
  heading: string; intro: string; filter: string; all: string; linksLabel: string;
  allTests: string; allCourses: string; allServices: string;
  test: Offering; course: Offering; session: Offering; opora: Offering
}

const topics: readonly Direction[] = ['energy', 'love', 'business']
const labels: Record<Language, Record<Direction, string>> = {
  en: { energy: 'Energy', love: 'Love', business: 'Business' },
  ru: { energy: 'Энергия', love: 'Любовь', business: 'Бизнес' },
  es: { energy: 'Energía', love: 'Amor', business: 'Negocios' },
}

// Approved, already-hosted public imagery. No stock portraits or Vercel image transformations.
const photographs: Record<Direction, readonly [string, string, string]> = {
  energy: [
    '/images/holistic-house/hero-olive-incense.webp',
    '/images/holistic-house/reiki-approved-sunrise-v3.webp',
    '/images/holistic-house/video-posters/hypnotherapy-en-v1.webp',
  ],
  love: [
    '/images/holistic-house/video-posters/constellations-en-v1.webp',
    '/images/holistic-house/reiki-approved-sunrise-v3.webp',
    '/images/holistic-house/andy-about.png',
  ],
  business: [
    '/images/holistic-house/books-library.webp',
    '/images/holistic-house/portrait-static/andy-828-3dcbabded1e9.webp',
    '/images/holistic-house/andy-about.png',
  ],
}

const copy: Record<Direction, Record<Language, Words>> = {
  energy: {
    en: {
      heading: 'Explore your energy & wellbeing', intro: 'One question, three ways to begin. Choose what suits you today.',
      filter: 'What would you like to explore?', all: 'All energy topics', linksLabel: 'More ways to explore',
      allTests: 'All free tests', allCourses: 'All courses', allServices: 'All services',
      test: { title: 'Your wellbeing self-check', detail: 'Explore energy, stress, sleep or daily resources with available questionnaires.', action: 'Take a free test', note: 'Free self-reflection' },
      course: { title: 'Free Reiki Practitioner course', detail: 'Discover Reiki and practical exercises in a five-lesson introduction.', action: 'Explore the course', note: 'Free to start' },
      opora: { title: 'OPORA · Anti-Stress course', detail: 'Short guided practices for steadiness and everyday self-support.', action: 'Explore the course', note: 'Self-guided practice' },
      session: { title: 'Personal energy support', detail: 'Explore the available individual support formats and request details.', action: 'Explore a session', note: 'Price confirmed before booking' },
    },
    ru: {
      heading: 'Энергия и внутренний ресурс', intro: 'Один запрос — три способа начать. Выберите подходящий сегодня.',
      filter: 'Какую тему хотите исследовать?', all: 'Все темы энергии', linksLabel: 'Другие возможности',
      allTests: 'Все бесплатные тесты', allCourses: 'Все курсы', allServices: 'Все услуги',
      test: { title: 'Тест ресурсов и самочувствия', detail: 'Исследуйте энергию, стресс, сон или повседневные ресурсы.', action: 'Пройти бесплатный тест', note: 'Самоисследование бесплатно' },
      course: { title: 'Бесплатный курс Reiki Practitioner', detail: 'Пять уроков знакомства с системами Рейки и практиками.', action: 'Открыть курс', note: 'Бесплатное начало' },
      opora: { title: 'Курс ОПОРА · Антистресс', detail: 'Короткие практики устойчивости и самоподдержки.', action: 'Открыть курс', note: 'Практика в своём темпе' },
      session: { title: 'Личная энергетическая поддержка', detail: 'Узнайте об индивидуальных форматах и отправьте запрос.', action: 'Посмотреть сессию', note: 'Цена подтверждается до записи' },
    },
    es: {
      heading: 'Energía y bienestar', intro: 'Una pregunta y tres maneras de empezar a tu ritmo.',
      filter: '¿Qué tema te interesa?', all: 'Todos los temas de energía', linksLabel: 'Más opciones',
      allTests: 'Todas las pruebas gratis', allCourses: 'Todos los cursos', allServices: 'Todos los servicios',
      test: { title: 'Autoevaluación de bienestar', detail: 'Explora energía, estrés, sueño y recursos cotidianos.', action: 'Hacer una prueba gratis', note: 'Reflexión gratuita' },
      course: { title: 'Curso gratuito Reiki Practitioner', detail: 'Cinco lecciones introductorias sobre Reiki y práctica personal.', action: 'Explorar el curso', note: 'Gratis para empezar' },
      opora: { title: 'OPORA · Curso antiestrés', detail: 'Prácticas breves de autocuidado y apoyo personal.', action: 'Explorar el curso', note: 'A tu ritmo' },
      session: { title: 'Apoyo energético personal', detail: 'Conoce las opciones individuales y solicita información.', action: 'Ver la sesión', note: 'Precio confirmado antes de reservar' },
    },
  },
  love: {
    en: {
      heading: 'Love, connection & relationships', intro: 'Find a gentle way to explore closeness, communication and boundaries.',
      filter: 'What matters in your relationships?', all: 'All relationship topics', linksLabel: 'More ways to explore',
      allTests: 'All free tests', allCourses: 'All courses', allServices: 'All services',
      test: { title: 'Relationships & boundaries self-check', detail: 'Explore trust, communication and personal boundaries with available questionnaires.', action: 'Take a free test', note: 'Free self-reflection' },
      course: { title: 'OPORA · Build inner support', detail: 'A self-guided course for steadiness before difficult conversations and choices.', action: 'Explore the course', note: 'Self-guided practice' },
      opora: { title: 'OPORA · Build inner support', detail: 'A self-guided course for steadiness before difficult conversations and choices.', action: 'Explore the course', note: 'Self-guided practice' },
      session: { title: 'Personal relationships session', detail: 'Explore relationship patterns and difficult choices through a personal session.', action: 'Explore a session', note: 'Personal guidance · from €50' },
    },
    ru: {
      heading: 'Любовь, близость и отношения', intro: 'Выберите способ исследовать близость, общение и личные границы.',
      filter: 'Что важно в отношениях?', all: 'Все темы отношений', linksLabel: 'Другие возможности',
      allTests: 'Все бесплатные тесты', allCourses: 'Все курсы', allServices: 'Все услуги',
      test: { title: 'Тест отношений и границ', detail: 'Исследуйте доверие, общение и личные границы.', action: 'Пройти бесплатный тест', note: 'Самоисследование бесплатно' },
      course: { title: 'ОПОРА · Внутренняя поддержка', detail: 'Практики устойчивости перед непростыми разговорами и решениями.', action: 'Открыть курс', note: 'Практика в своём темпе' },
      opora: { title: 'ОПОРА · Внутренняя поддержка', detail: 'Практики устойчивости перед непростыми разговорами и решениями.', action: 'Открыть курс', note: 'Практика в своём темпе' },
      session: { title: 'Личная сессия об отношениях', detail: 'Исследование повторяющихся ситуаций и сложных решений.', action: 'Посмотреть сессию', note: 'Личная работа · от €50' },
    },
    es: {
      heading: 'Amor, conexión y relaciones', intro: 'Explora cercanía, comunicación y límites personales.',
      filter: '¿Qué importa en tus relaciones?', all: 'Todos los temas de relaciones', linksLabel: 'Más opciones',
      allTests: 'Todas las pruebas gratis', allCourses: 'Todos los cursos', allServices: 'Todos los servicios',
      test: { title: 'Autoevaluación de relaciones y límites', detail: 'Explora confianza, comunicación y límites con cuestionarios disponibles.', action: 'Hacer una prueba gratis', note: 'Reflexión gratuita' },
      course: { title: 'OPORA · Apoyo interior', detail: 'Prácticas breves para afrontar conversaciones y decisiones difíciles.', action: 'Explorar el curso', note: 'A tu ritmo' },
      opora: { title: 'OPORA · Apoyo interior', detail: 'Prácticas breves para afrontar conversaciones y decisiones difíciles.', action: 'Explorar el curso', note: 'A tu ritmo' },
      session: { title: 'Sesión personal sobre relaciones', detail: 'Explora tus dificultades y decisiones en un espacio individual.', action: 'Ver la sesión', note: 'Apoyo personal · desde €50' },
    },
  },
  business: {
    en: {
      heading: 'Your business & career direction', intro: 'Start with clarity, continue with a plan, or discuss your challenge personally.',
      filter: 'What would you like to work on?', all: 'All business topics', linksLabel: 'More ways to explore',
      allTests: 'All free tests', allCourses: 'All courses', allServices: 'All services',
      test: { title: 'Work & focus self-check', detail: 'Explore focus, working pressure and your personal resources. Not a financial test.', action: 'Take a free test', note: 'Free self-reflection' },
      course: { title: '90-day business development', detail: 'A practical self-guided programme with weekly steps and private progress.', action: 'Explore the course', note: 'Free to start · private cabinet' },
      opora: { title: '90-day business development', detail: 'A practical self-guided programme with weekly steps and private progress.', action: 'Explore the course', note: 'Free to start · private cabinet' },
      session: { title: 'Personal business consultation', detail: 'Discuss priorities, decisions and a practical next step with Andrey.', action: 'Explore a session', note: '€50 / 30 min · €100 / 60 min' },
    },
    ru: {
      heading: 'Бизнес и профессиональное развитие', intro: 'Начните с ясности, продолжите по плану или обсудите задачу лично.',
      filter: 'Над чем хотите поработать?', all: 'Все темы бизнеса', linksLabel: 'Другие возможности',
      allTests: 'Все бесплатные тесты', allCourses: 'Все курсы', allServices: 'Все услуги',
      test: { title: 'Тест фокуса и рабочих ресурсов', detail: 'Оцените фокус, напряжение и личные ресурсы. Это не финансовый тест.', action: 'Пройти бесплатный тест', note: 'Самоисследование бесплатно' },
      course: { title: '90 дней развития бизнеса', detail: 'Практическая программа с недельными шагами и личным прогрессом.', action: 'Открыть курс', note: 'Бесплатное начало · кабинет' },
      opora: { title: '90 дней развития бизнеса', detail: 'Практическая программа с недельными шагами и личным прогрессом.', action: 'Открыть курс', note: 'Бесплатное начало · кабинет' },
      session: { title: 'Личная бизнес-консультация', detail: 'Разберите приоритеты, решение и следующий практический шаг.', action: 'Посмотреть сессию', note: '€50 / 30 мин · €100 / 60 мин' },
    },
    es: {
      heading: 'Tu negocio y carrera profesional', intro: 'Empieza con claridad, sigue un plan o consulta tu reto en privado.',
      filter: '¿Qué te gustaría trabajar?', all: 'Todos los temas de negocios', linksLabel: 'Más opciones',
      allTests: 'Todas las pruebas gratis', allCourses: 'Todos los cursos', allServices: 'Todos los servicios',
      test: { title: 'Autoevaluación de trabajo y enfoque', detail: 'Explora la concentración y los recursos personales, no resultados financieros.', action: 'Hacer una prueba gratis', note: 'Reflexión gratuita' },
      course: { title: 'Desarrollo de negocio de 90 días', detail: 'Pasos semanales y progreso privado. El curso abre en inglés.', action: 'Explorar el curso', note: 'Gratis para empezar · inglés' },
      opora: { title: 'Desarrollo de negocio de 90 días', detail: 'Pasos semanales y progreso privado. El curso abre en inglés.', action: 'Explorar el curso', note: 'Gratis para empezar · inglés' },
      session: { title: 'Consulta personal de negocios', detail: 'Habla de decisiones, prioridades y próximos pasos.', action: 'Ver la sesión', note: '€50 / 30 min · €100 / 60 min' },
    },
  },
}

export function TopicPathOffers({ locale, journey }: { locale: Language; journey: Journey }) {
  const direction: Direction = journey.id === 'relationships' ? 'love' : journey.id === 'business' ? 'business' : 'energy'
  const c = copy[direction][locale]
  const [filterId, setFilterId] = useState('')
  const selected = journey.topics.find(item => item.id === filterId)
  const focus = selected?.focus ?? journey.focus
  const query = new URLSearchParams({
    focus: focus.join(','), journey: journey.id, topics: selected?.id ?? '',
  })
  const freeTestHref = '/' + locale + '/client/tests?' + query.toString()
  const appLocale = locale === 'es' ? 'en' : locale
  const useOpora = direction === 'love' || (direction === 'energy' && !!selected && selected.id !== 'resources')
  const courseHref = direction === 'business'
    ? '/' + appLocale + '/app/business'
    : useOpora ? '/' + locale + '/courses/antistress' : '/' + locale + '/academy/reiki/free-practitioner-course'
  const sessionHref = '/' + locale + '/services/' + (
    direction === 'business' ? 'business-consulting' : direction === 'love' ? 'systemic-constellations' : 'remote-energy-support'
  )
  const cards = [
    { key: 'test', eyebrow: '01', content: c.test, icon: ClipboardCheck, href: freeTestHref },
    { key: 'course', eyebrow: '02', content: useOpora ? c.opora : c.course, icon: BookOpen, href: courseHref },
    { key: 'session', eyebrow: '03', content: c.session, icon: MessageCircle, href: sessionHref },
  ] as const

  return <section className={styles.root} data-topic-offers={direction} aria-labelledby="hh-path-title">
    <nav className={styles.directions} aria-label={locale === 'ru' ? 'Направления' : locale === 'es' ? 'Áreas' : 'Directions'}>
      {topics.map(item => <Link key={item} href={'/' + locale + '/explore/' + item} prefetch={false}
        aria-current={item === direction ? 'page' : undefined}>{labels[locale][item]}</Link>)}
    </nav>
    <div className={styles.intro}>
      <div>
        <p className={styles.kicker}>HOLISTIC HOUSE · {labels[locale][direction]}</p>
        <h1 id="hh-path-title">{c.heading}</h1>
        <p>{c.intro}</p>
      </div>
      <label className={styles.filter}>
        <span><SlidersHorizontal size={16} aria-hidden="true"/>{c.filter}</span>
        <select value={filterId} onChange={event => setFilterId(event.target.value)}
          data-topic-offer-filter aria-label={c.filter}>
          <option value="">{c.all}</option>
          {journey.topics.map(item => <option key={item.id} value={item.id}>{item.title[locale]}</option>)}
        </select>
      </label>
    </div>
    <div className={styles.cards}>
      {cards.map(({ key, eyebrow, content, icon: Icon, href }, index) =>
        <article className={styles.card} data-offer-kind={key} key={key}>
          <div className={styles.photo}>
            <Image src={photographs[direction][index]} alt="" fill unoptimized loading="lazy"
              sizes="(max-width: 430px) 98px, (max-width: 800px) 140px, 200px" />
          </div>
          <div className={styles.cardBody}>
            <p className={styles.cardKicker}><Icon size={15} aria-hidden="true"/>{eyebrow} · {key === 'test' ? (locale === 'ru' ? 'ТЕСТ' : locale === 'es' ? 'PRUEBA' : 'FREE TEST') : key === 'course' ? (locale === 'ru' ? 'КУРС' : locale === 'es' ? 'CURSO' : 'COURSE') : (locale === 'ru' ? 'ЛИЧНО' : locale === 'es' ? 'PERSONAL' : 'PERSONAL')}</p>
            <h2>{content.title}</h2>
            <p className={styles.detail}>{content.detail}</p>
            <div className={styles.cardFoot}>
              <span>{content.note}</span>
              <Link href={href} prefetch={false} data-topic-offer-action={key}>
                {content.action}<ArrowRight size={16} aria-hidden="true"/>
              </Link>
            </div>
          </div>
        </article>)}
    </div>
    <nav className={styles.links} aria-label={c.linksLabel}>
      <span>{c.linksLabel}</span>
      <Link href={'/' + locale + '/client/tests'} prefetch={false}>{c.allTests}</Link>
      <Link href={'/' + locale + '/academy'} prefetch={false}>{c.allCourses}</Link>
      <Link href={'/' + locale + '/services'} prefetch={false}>{c.allServices}</Link>
    </nav>
  </section>
}
