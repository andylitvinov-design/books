'use client'

import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight, ChevronDown, ClipboardCheck, GraduationCap, CalendarDays } from 'lucide-react'
import { useMemo, useState } from 'react'
import { journeyFocusForTopics } from '@/lib/assessments/topic-journeys'
import type { PublicLocale } from '@/lib/public-locales'
import styles from './direction-offers.module.css'

type Topic = {
  id: string
  title: Record<PublicLocale, string>
  focus: readonly string[]
}
type Journey = {
  id: string
  title: Record<PublicLocale, string>
  summary: Record<PublicLocale, string>
  focus: readonly string[]
  topics: readonly Topic[]
}
type SuggestedTest = { title: string }
type Direction = 'energy' | 'relationships' | 'business'
type Offer = { title: string; description: string; action: string; photo: string; href: string; eyebrow: string; note: string }

const photography = {
  test: '/images/holistic-house/report-lighthouse-coast.webp',
  energyCourse: '/images/holistic-house/reiki-approved-sunrise-v3.webp',
  loveCourse: '/images/holistic-house/hero-olive-incense.webp',
  businessCourse: '/images/holistic-house/andy-about.png',
  energySession: '/images/holistic-house/andy-about.png',
  loveSession: '/images/holistic-house/video-posters/constellations-en-v1.webp',
  businessSession: '/images/holistic-house/andy-about.png',
} as const

const copy = {
  en: {
    pick: 'Find your focus', all: 'All topics', subtitle: 'Choose a topic, then the way you would like to begin.',
    free: '01 · FREE TEST', course: '02 · COURSE', session: '03 · PERSONAL SESSION',
    testTitle: 'Explore your current resources', testDescription: 'Choose a free self-reflection questionnaire relevant to your question.',
    suggested: 'Suggested: ', testAction: 'Take a free test', freeNote: 'Free to start',
    courseAction: 'Explore the course', courseNote: 'At your own pace',
    sessionAction: 'Explore a session', sessionNote: '30 min €50 · 60 min €100',
    more: 'Explore all options', moreTests: 'All tests', moreCourses: 'All courses', moreServices: 'All personal services',
  },
  ru: {
    pick: 'Уточните тему', all: 'Все темы', subtitle: 'Выберите запрос, а затем удобный способ начать.',
    free: '01 · БЕСПЛАТНЫЙ ТЕСТ', course: '02 · КУРС', session: '03 · ЛИЧНАЯ СЕССИЯ',
    testTitle: 'Исследуйте свои ресурсы', testDescription: 'Выберите бесплатный опросник для самоисследования по вашему запросу.',
    suggested: 'Рекомендуем: ', testAction: 'Пройти тест', freeNote: 'Начните бесплатно',
    courseAction: 'Открыть курс', courseNote: 'В своём темпе',
    sessionAction: 'Выбрать сессию', sessionNote: '30 мин €50 · 60 мин €100',
    more: 'Остальные предложения', moreTests: 'Все тесты', moreCourses: 'Все курсы', moreServices: 'Все личные услуги',
  },
  es: {
    pick: 'Elige un tema', all: 'Todos los temas', subtitle: 'Elige tu tema y la forma de comenzar.',
    free: '01 · TEST GRATIS', course: '02 · CURSO', session: '03 · SESIÓN PERSONAL',
    testTitle: 'Explora tus recursos', testDescription: 'Elige un cuestionario gratuito de reflexión personal.',
    suggested: 'Sugerencia: ', testAction: 'Hacer un test', freeNote: 'Empieza gratis',
    courseAction: 'Explorar el curso', courseNote: 'A tu ritmo',
    sessionAction: 'Explorar una sesión', sessionNote: '30 min €50 · 60 min €100',
    more: 'Explorar más opciones', moreTests: 'Todos los tests', moreCourses: 'Todos los cursos', moreServices: 'Todos los servicios',
  },
} as const

const directionCopy = {
  energy: {
    en: { name: 'Energy', title: 'Restore your energy and inner balance', course: 'OPORA · Daily self-support', courseDetail: 'Short guided practices for stress and everyday resilience.', service: 'Individual wellbeing support', serviceDetail: 'Talk through your personal question with Andrey, online or in Toronto.' },
    ru: { name: 'Энергия', title: 'Энергия и внутренняя опора', course: 'ОПОРА · Практики самоподдержки', courseDetail: 'Короткие упражнения для снижения стресса и устойчивости.', service: 'Личная поддержка', serviceDetail: 'Разберите ваш запрос с Андреем онлайн или в Торонто.' },
    es: { name: 'Energía', title: 'Tu energía y equilibrio interior', course: 'OPORA · Apoyo personal', courseDetail: 'Prácticas breves para el estrés y la estabilidad cotidiana.', service: 'Acompañamiento personal', serviceDetail: 'Explora tu situación con Andrey online o en Toronto.' },
  },
  relationships: {
    en: { name: 'Love', title: 'Build connection, trust and closeness', course: 'Practices for trust and boundaries', courseDetail: 'Start with self-checks and find a self-guided support path.', service: 'Relationship consultation', serviceDetail: 'Explore communication, boundaries or repeating patterns together.' },
    ru: { name: 'Любовь', title: 'Близость, доверие и отношения', course: 'Практики доверия и границ', courseDetail: 'Начните с тестов и подберите самостоятельную практику.', service: 'Консультация об отношениях', serviceDetail: 'Исследуйте общение, границы и повторяющиеся ситуации.' },
    es: { name: 'Amor', title: 'Cercanía, confianza y conexión', course: 'Prácticas de confianza y límites', courseDetail: 'Empieza con tests y encuentra prácticas a tu ritmo.', service: 'Consulta sobre relaciones', serviceDetail: 'Explora la comunicación, los límites y tus patrones.' },
  },
  business: {
    en: { name: 'Business', title: 'Grow with focus and a clear direction', course: '90-day Business Development', courseDetail: 'A practical day-by-day development path in your private account.', service: 'Business & career consultation', serviceDetail: 'Work on a decision, career move or project with Andrey.' },
    ru: { name: 'Бизнес', title: 'Развитие с фокусом и ясным планом', course: 'Развитие бизнеса · 90 дней', courseDetail: 'Ежедневные шаги и дневник прогресса в личном кабинете.', service: 'Консультация по бизнесу и карьере', serviceDetail: 'Разберите решение, профессиональную цель или проект.' },
    es: { name: 'Negocios', title: 'Desarrolla tu proyecto con claridad', course: 'Desarrollo de negocios · 90 días', courseDetail: 'Pasos diarios y progreso en tu área privada (en inglés).', service: 'Consulta de negocios y carrera', serviceDetail: 'Explora decisiones, objetivos profesionales o proyectos.' },
  },
} as const

export const directionIds = ['energy', 'relationships', 'business'] as const
export const directionSlug = (direction: Direction) => direction

export function DirectionOffers({ locale, journey, suggestions }: {
  locale: PublicLocale
  journey: Journey
  suggestions: Record<string, SuggestedTest[]>
}) {
  const [topicId, setTopicId] = useState('')
  if (!directionIds.includes(journey.id as Direction)) return null
  const direction = journey.id as Direction
  const c = copy[locale]
  const d = directionCopy[direction][locale]
  const selected = journey.topics.find(item => item.id === topicId)
  const focus = useMemo(() => journeyFocusForTopics(journey, selected ? [selected.id] : []), [journey, selected])
  const suggested = suggestions[selected?.id || '']?.[0]
  const testHref = '/' + locale + '/client/tests?focus=' + encodeURIComponent(focus.join(',')) +
    '&journey=' + direction + '&topics=' + encodeURIComponent(topicId)
  const appLocale = locale === 'es' ? 'en' : locale
  const courseHref = direction === 'business'
    ? '/' + appLocale + '/app/business'
    : direction === 'energy'
      ? '/' + appLocale + '/courses/antistress'
      : testHref + '&mode=course'
  const serviceHref = '/' + locale + '/services/' + ({
    energy: 'alchemy-of-soul', relationships: 'systemic-constellations', business: 'business-consulting',
  } as const)[direction]
  const offers: Offer[] = [
    { eyebrow: c.free, title: selected ? selected.title[locale] : c.testTitle,
      description: suggested ? c.suggested + suggested.title : c.testDescription,
      photo: photography.test, href: testHref, action: c.testAction, note: c.freeNote },
    { eyebrow: c.course, title: d.course, description: d.courseDetail,
      photo: photography[direction === 'relationships' ? 'loveCourse' : direction === 'business' ? 'businessCourse' : 'energyCourse'],
      href: courseHref, action: c.courseAction, note: c.courseNote },
    { eyebrow: c.session, title: d.service, description: d.serviceDetail,
      photo: photography[direction === 'relationships' ? 'loveSession' : direction === 'business' ? 'businessSession' : 'energySession'],
      href: serviceHref, action: c.sessionAction, note: c.sessionNote },
  ]
  const icons = [ClipboardCheck, GraduationCap, CalendarDays]

  return <section className={styles.root} data-direction-offers={direction} aria-labelledby="hh-direction-heading">
    <nav className={styles.switcher} aria-label={locale === 'ru' ? 'Направления Holistic House' : locale === 'es' ? 'Áreas de Holistic House' : 'Holistic House directions'}>
      {directionIds.map(id => <Link key={id} href={'/' + locale + '/explore/' + directionSlug(id)}
        aria-current={id === direction ? 'page' : undefined} prefetch={false}>
        {directionCopy[id][locale].name}
      </Link>)}
    </nav>
    <div className={styles.heading}>
      <div><p className={styles.kicker}>HOLISTIC HOUSE · {d.name}</p>
        <h1 id="hh-direction-heading">{d.title}</h1>
        <p className={styles.intro}>{c.subtitle}</p>
      </div>
      <label className={styles.filter}>
        <span>{c.pick}</span>
        <span className={styles.selectWrap}>
          <select value={topicId} onChange={event => setTopicId(event.target.value)} data-direction-filter>
            <option value="">{c.all}</option>
            {journey.topics.map(topic => <option key={topic.id} value={topic.id}>{topic.title[locale]}</option>)}
          </select>
          <ChevronDown aria-hidden="true" size={17} />
        </span>
      </label>
    </div>
    <div className={styles.offers} aria-live="polite">
      {offers.map((offer, index) => {
        const Icon = icons[index]
        return <article className={styles.card} key={index} data-offer-type={['test','course','session'][index]}>
          <div className={styles.photo}>
            <Image src={offer.photo} alt="" fill loading="lazy" unoptimized
              sizes="(max-width: 430px) 90px, (max-width: 760px) 118px, 180px" />
          </div>
          <div className={styles.cardBody}>
            <p className={styles.eyebrow}><Icon aria-hidden="true" size={14} />{offer.eyebrow}</p>
            <h2>{offer.title}</h2>
            <p className={styles.description}>{offer.description}</p>
            <div className={styles.cardFooter}>
              <span className={styles.note}>{offer.note}</span>
              <Link className={styles.action} href={offer.href} prefetch={false} data-offer-action={['test','course','session'][index]}>
                {offer.action}<ArrowRight size={16} aria-hidden="true"/>
              </Link>
            </div>
          </div>
        </article>
      })}
    </div>
    <div className={styles.moreLinks}>
      <Link href={'/' + locale + '/client/tests'} prefetch={false}>{c.moreTests}</Link>
      <Link href={'/' + locale + '/academy'} prefetch={false}>{c.moreCourses}</Link>
      <Link href={'/' + locale + '/services'} prefetch={false}>{c.moreServices}</Link>
    </div>
  </section>
}
