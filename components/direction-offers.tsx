'use client'

import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight, ChevronLeft, ChevronRight, ClipboardCheck, GraduationCap, CalendarDays, Search } from 'lucide-react'
import { useState, type KeyboardEvent } from 'react'
import { journeyFocusForTopics } from '@/lib/assessments/topic-journeys'
import type { PublicLocale } from '@/lib/public-locales'
import styles from './direction-offers.module.css'

type Topic = {
  id: string
  title: Record<PublicLocale, string>
  focus: readonly string[]
  detail: Record<PublicLocale, string>
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
    en: { name: 'Love', title: 'Build connection, trust and closeness', course: 'OPORA · Inner support', courseDetail: 'Self-guided steadiness practices before challenging conversations; not a dedicated relationships course.', service: 'Relationship consultation', serviceDetail: 'Explore communication, boundaries or repeating patterns together.' },
    ru: { name: 'Любовь', title: 'Близость, доверие и отношения', course: 'ОПОРА · Внутренняя поддержка', courseDetail: 'Практики устойчивости перед трудными разговорами. Это не отдельный курс по отношениям.', service: 'Консультация об отношениях', serviceDetail: 'Исследуйте общение, границы и повторяющиеся ситуации.' },
    es: { name: 'Amor', title: 'Cercanía, confianza y conexión', course: 'OPORA · Apoyo interior', courseDetail: 'Prácticas de estabilidad antes de conversaciones difíciles, no un curso específico de relaciones.', service: 'Consulta sobre relaciones', serviceDetail: 'Explora la comunicación, los límites y tus patrones.' },
  },
  business: {
    en: { name: 'Business', title: 'Grow with focus and a clear direction', course: '90-day Business Development', courseDetail: 'A practical day-by-day development path in your private account.', service: 'Business & career consultation', serviceDetail: 'Work on a decision, career move or project with Andrey.' },
    ru: { name: 'Бизнес', title: 'Развитие с фокусом и ясным планом', course: 'Развитие бизнеса · 90 дней', courseDetail: 'Ежедневные шаги и дневник прогресса в личном кабинете.', service: 'Консультация по бизнесу и карьере', serviceDetail: 'Разберите решение, профессиональную цель или проект.' },
    es: { name: 'Negocios', title: 'Desarrolla tu proyecto con claridad', course: 'Desarrollo de negocios · 90 días', courseDetail: 'Pasos diarios y progreso en tu área privada (en inglés).', service: 'Consulta de negocios y carrera', serviceDetail: 'Explora decisiones, objetivos profesionales o proyectos.' },
  },
} as const

// Short, real client requests. IDs and focus keys continue to come from the existing
// topic journey registry; the full editorial title remains the accessible label.
const quickTopicLabels: Record<string, Record<PublicLocale, string>> = {
  fatigue: { en: 'Low energy', ru: 'Мало сил', es: 'Falta de energía' },
  sleep: { en: 'Poor sleep', ru: 'Плохой сон', es: 'Dormir mejor' },
  body: { en: 'Body tension', ru: 'Напряжение в теле', es: 'Tensión corporal' },
  resources: { en: 'Recharge & recover', ru: 'Восстановить силы', es: 'Recuperar fuerzas' },
  trust: { en: 'More closeness', ru: 'Больше близости', es: 'Más cercanía' },
  boundaries: { en: 'Personal boundaries', ru: 'Личные границы', es: 'Límites personales' },
  conflict: { en: 'Arguments & conflict', ru: 'Ссоры и конфликты', es: 'Conflictos y discusiones' },
  presence: { en: 'Intimacy & connection', ru: 'Интимность и контакт', es: 'Intimidad y conexión' },
  decisions: { en: 'Find direction', ru: 'Куда двигаться?', es: 'Elegir rumbo' },
  productivity: { en: 'Focus & results', ru: 'Фокус и результат', es: 'Foco y resultados' },
  'work-stress': { en: 'Burnout at work', ru: 'Выгорание на работе', es: 'Agotamiento laboral' },
  'money-beliefs': { en: 'Money & growth', ru: 'Деньги и рост', es: 'Dinero y crecimiento' },
}

// The same approved images used by the former Services/Academy hero and public
// home. Manual slide changes are deliberate: no autoplay while visitors type.
const heroPhotography: Record<Direction, readonly [string, string, string]> = {
  energy: [
    '/images/holistic-house/hero-olive-incense.webp',
    '/images/holistic-house/reiki-approved-sunrise-v3.webp',
    '/images/holistic-house/report-lighthouse-coast.webp',
  ],
  relationships: [
    '/images/holistic-house/video-posters/constellations-en-v1.webp',
    '/images/holistic-house/hero-olive-incense.webp',
    '/images/holistic-house/reiki-approved-sunrise-v3.webp',
  ],
  business: [
    '/images/holistic-house/andy-about.png',
    '/images/holistic-house/books-library.webp',
    '/images/holistic-house/portrait-static/andy-828-3dcbabded1e9.webp',
  ],
}

const presentation = {
  en: {
    question: 'What would you like to change or explore?',
    placeholder: 'Tell us what you would like support with…',
    submit: 'Find my options', suggested: 'Suggested topic:',
    unmatched: 'Choose a topic below to explore options.',
    missing: 'Enter a wish or choose a topic.',
    privacy: 'Your words stay here; no enquiry is sent.',
    choose: 'Make your request more specific',
    filterLead: 'Choose one theme to update all three sections.',
    image: 'Show photograph', previous: 'Previous photograph', next: 'Next photograph', start: 'Find your way to begin',
    groups: [
      { kicker: '01 · START FREE', title: 'Free tests', detail: 'Understand your current resources before choosing a next step.', all: 'See all tests' },
      { kicker: '02 · LEARN & PRACTISE', title: 'Courses', detail: 'Work at your own pace with a guided programme.', all: 'Browse all courses' },
      { kicker: '03 · PERSONAL GUIDANCE', title: 'Personal services', detail: 'Explore an individual session with Andrey, online or in Toronto.', all: 'View all services' },
    ],
  },
  ru: {
    question: 'Что вы хотели бы изменить или исследовать?',
    placeholder: 'Напишите, в чём вам нужна поддержка…',
    submit: 'Найти варианты', suggested: 'Подходящая тема:',
    unmatched: 'Выберите тему ниже.',
    missing: 'Напишите запрос или выберите тему.',
    privacy: 'Ваш текст остаётся здесь — заявка не отправляется.',
    choose: 'Уточните, что вам сейчас нужно',
    filterLead: 'Выберите тему — предложения в трёх разделах обновятся.',
    image: 'Показать фото', previous: 'Предыдущее фото', next: 'Следующее фото', start: 'Выберите способ начать',
    groups: [
      { kicker: '01 · БЕСПЛАТНО', title: 'Бесплатные тесты', detail: 'Исследуйте своё состояние и ресурсы перед следующим шагом.', all: 'Все тесты' },
      { kicker: '02 · ОБУЧЕНИЕ', title: 'Курсы', detail: 'Занимайтесь в удобном темпе по готовой программе.', all: 'Все курсы' },
      { kicker: '03 · ЛИЧНАЯ РАБОТА', title: 'Личные услуги', detail: 'Выберите индивидуальную сессию с Андреем онлайн или в Торонто.', all: 'Все услуги' },
    ],
  },
  es: {
    question: '¿Qué te gustaría cambiar o explorar?',
    placeholder: 'Cuéntanos qué tipo de apoyo necesitas…',
    submit: 'Encontrar opciones', suggested: 'Tema recomendado:',
    unmatched: 'Elige un tema para explorar opciones.',
    missing: 'Escribe tu objetivo o elige un tema.',
    privacy: 'Tu texto se queda aquí; no se envía.',
    choose: 'Aclara qué necesitas ahora',
    filterLead: 'Elige un tema para actualizar las tres secciones.',
    image: 'Mostrar fotografía', previous: 'Fotografía anterior', next: 'Fotografía siguiente', start: 'Elige cómo empezar',
    groups: [
      { kicker: '01 · EMPIEZA GRATIS', title: 'Pruebas gratuitas', detail: 'Explora tus recursos personales antes de decidir.', all: 'Ver todas las pruebas' },
      { kicker: '02 · APRENDER', title: 'Cursos', detail: 'Practica a tu ritmo con un programa guiado.', all: 'Ver todos los cursos' },
      { kicker: '03 · APOYO PERSONAL', title: 'Servicios personales', detail: 'Explora una sesión individual, online o en Toronto.', all: 'Ver todos los servicios' },
    ],
  },
} as const

// Editor-approved wording and topical aliases; no AI request, health profiling,
// CRM write, cookie or location tracking occurs when someone enters a wish.
const topicKeywords: Record<string, readonly string[]> = {
  fatigue: ['fatigue','exhaust','tired','energy','устал','сил','энерг','cansanc','energía'],
  sleep: ['sleep','insomn','сон','спат','сна','dormir','sueño'],
  body: ['body','tension','pain','тело','телес','напряж','cuerpo','tensión'],
  resources: ['support','resource','recovery','restore','ресурс','восстанов','поддерж','recurso','recuper'],
  trust: ['trust','close','connection','довер','близос','отношен','confian','cercan'],
  boundaries: ['boundar','consent','границ','согласи','límit','consentim'],
  conflict: ['conflict','argument','communication','конфликт','общени','спор','comunic','conflict'],
  presence: ['intimacy','presence','touch','интим','присутств','sensual','intimidad','presencia'],
  decisions: ['decisi','choice','clarity','решени','выбор','ясност','decisión','elección'],
  productivity: ['focus','productiv','client','attention','фокус','концентр','клиент','productiv','concentr'],
  'work-stress': ['stress','burnout','pressure','перегруз','стресс','выгора','estrés','agotam'],
  'money-beliefs': ['money','income','earning','finance','деньг','доход','финанс','dinero','ingreso'],
}

// Deliberately heuristic, not a psychological assessment or a promise to solve
// an open-ended question. Unknown queries keep the full topic catalog available.
function matchWish(question: string, topics: readonly Topic[]): Topic | undefined {
  const normalized = question.normalize('NFKC').toLocaleLowerCase().trim()
  if (normalized.length < 3) return undefined
  const ranked = topics.map(topic => {
    const aliases = (topicKeywords[topic.id] ?? []).filter(word => word.length >= 3)
    const labels = [...Object.values(topic.title), ...Object.values(topic.detail)]
      .flatMap(label => label.toLocaleLowerCase().split(/[^\p{L}\p{N}]+/u))
      .filter(word => word.length >= 4)
    const score = aliases.filter(word => normalized.includes(word)).length * 3 +
      labels.filter(word => normalized.includes(word)).length
    return { topic, score }
  }).sort((a,b)=>b.score-a.score)
  return ranked[0]?.score ? ranked[0].topic : undefined
}

export const directionIds = ['energy', 'relationships', 'business'] as const
export const directionSlug = (direction: Direction) => direction === 'relationships' ? 'love' : direction

export function DirectionOffers({ locale, journey, suggestions }: {
  locale: PublicLocale
  journey: Journey
  suggestions: Record<string, SuggestedTest[]>
}) {
  const [topicId, setTopicId] = useState('')
  const [question, setQuestion] = useState('')
  const [feedback, setFeedback] = useState('')
  const [slideIndex, setSlideIndex] = useState(0)
  if (!directionIds.includes(journey.id as Direction)) return null

  const direction = journey.id as Direction
  const c = copy[locale]
  const d = directionCopy[direction][locale]
  const ui = presentation[locale]
  const selected = journey.topics.find(item => item.id === topicId)
  const focus = journeyFocusForTopics(journey, selected ? [selected.id] : [])
  const suggested = suggestions[selected?.id || '']?.[0]
  const testHref = '/' + locale + '/client/tests?focus=' + encodeURIComponent(focus.join(',')) +
    '&journey=' + direction + '&topics=' + encodeURIComponent(topicId)
  const appLocale = locale === 'es' ? 'en' : locale
  const courseHref = direction === 'business'
    ? '/' + appLocale + '/app/business'
    : '/' + locale + '/courses/antistress'
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
  const kinds = ['test', 'course', 'session'] as const
  const icons = [ClipboardCheck, GraduationCap, CalendarDays] as const
  const allHrefs = [
    '/' + locale + '/client/tests?catalog=full',
    '/' + locale + '/academy',
    '/' + locale + '/services',
  ] as const

  function selectTopic(value: string) {
    setTopicId(value)
    setFeedback('')
  }

  function submitWish() {
    if (!question.trim()) { setFeedback(ui.missing); return }
    const match = matchWish(question.slice(0,160), journey.topics)
    setTopicId(match?.id ?? '')
    setFeedback(match ? ui.suggested + ' ' + match.title[locale] : ui.unmatched)
    // No forced scrolling: the selected inline button updates in place.
  }

  return <div className={styles.root} data-direction-offers={direction}>
    <section className={styles.hero} aria-labelledby="hh-direction-heading" data-direction-hero>
      <div className={styles.heroMedia} key={direction + '-' + slideIndex}>
        <Image src={heroPhotography[direction][slideIndex]} alt="" fill
          unoptimized priority={slideIndex===0} sizes="(max-width:760px) 100vw, 1200px" />
      </div>
      <div className={styles.heroGradient} aria-hidden="true"/>
      <nav className={styles.switcher} aria-label={locale === 'ru' ? 'Направления Holistic House' : locale === 'es' ? 'Áreas de Holistic House' : 'Holistic House directions'}>
        {directionIds.map(id => <Link key={id} href={'/' + locale + '/explore/' + directionSlug(id)}
          aria-current={id === direction ? 'page' : undefined} prefetch={false}>{directionCopy[id][locale].name}</Link>)}
      </nav>
      <div className={styles.heroContent}>
        <p className={styles.kicker}>HOLISTIC HOUSE · {d.name}</p>
        <h1 id="hh-direction-heading">{d.title}</h1>
        <p className={styles.intro}>{ui.question}</p>
        <div className={styles.wishForm} role="search" data-direction-wish-form>
          <label className={styles.srOnly} htmlFor="hh-direction-wish">{ui.question}</label>
          <input id="hh-direction-wish" type="search" maxLength={160}
            value={question} onChange={event=>setQuestion(event.target.value)}
            onKeyDown={(event: KeyboardEvent<HTMLInputElement>)=>{
              if(event.key==='Enter'){event.preventDefault();submitWish()}
            }}
            placeholder={ui.placeholder} autoComplete="off" enterKeyHint="search" />
          <button type="button" onClick={submitWish} data-direction-wish-submit>{ui.submit}<Search size={17} aria-hidden="true"/></button>
        </div>
      </div>
      <div className={styles.slideControls} role="group" aria-label={ui.image}>
        <button type="button" onClick={()=>setSlideIndex(index=>(index+2)%3)} aria-label={ui.previous}><ChevronLeft size={17} aria-hidden="true"/></button>
        {[0,1,2].map(index=><button type="button" key={index}
          className={styles.dot} aria-label={ui.image+' '+(index+1)}
          aria-pressed={slideIndex===index} onClick={()=>setSlideIndex(index)}><span/></button>)}
        <button type="button" onClick={()=>setSlideIndex(index=>(index+1)%3)} aria-label={ui.next}><ChevronRight size={17} aria-hidden="true"/></button>
      </div>
    </section>

    <section className={styles.filterPanel} id="hh-direction-focus" aria-label={ui.choose} data-direction-topic-finder>
      <div className={styles.filterHeading}>
        <h2 id="hh-direction-focus-label">{c.pick}</h2>
        <button type="button" className={styles.reset} data-direction-filter="all"
          aria-pressed={!topicId} aria-controls="hh-direction-test hh-direction-course hh-direction-session"
          onClick={()=>selectTopic('')}>{c.all}</button>
      </div>
      <p id="hh-direction-focus-hint" className={styles.srOnly}>{ui.filterLead}</p>
      <div className={styles.topicChips} role="group"
        aria-labelledby="hh-direction-focus-label" aria-describedby="hh-direction-focus-hint">
        {journey.topics.map(topic=><button type="button" className={styles.chip} key={topic.id}
          data-direction-filter={topic.id} aria-label={topic.title[locale]}
          aria-controls="hh-direction-test hh-direction-course hh-direction-session"
          aria-pressed={topicId===topic.id} onClick={()=>selectTopic(topic.id)}>
          {quickTopicLabels[topic.id]?.[locale] ?? topic.title[locale]}
        </button>)}
      </div>
      <p className={styles.feedback} role="status" aria-live="polite">{feedback || ui.privacy}</p>
    </section>

    <div className={styles.sections} aria-label={ui.start} data-direction-sections>
      {offers.map((offer,index)=>{
        const Icon=icons[index]
        const group=ui.groups[index]
        return <section className={styles.group} key={kinds[index]}
          id={'hh-direction-'+kinds[index]} data-direction-section={kinds[index]}
          aria-labelledby={'hh-direction-section-title-'+kinds[index]}>
          <div className={styles.sectionHeading}>
            <span className={styles.sectionIndex} aria-hidden="true">{index+1}</span>
            <div className={styles.sectionCopy}>
              <p>{group.kicker}</p>
              <h2 id={'hh-direction-section-title-'+kinds[index]}>{group.title}</h2>
              <span>{group.detail}</span>
            </div>
            <Link className={styles.sectionAll} href={allHrefs[index]} prefetch={false}>
              {group.all}<ArrowRight size={16} aria-hidden="true"/>
            </Link>
          </div>
          <article className={styles.card} data-offer-type={kinds[index]}>
            <div className={styles.photo}>
              <Image src={offer.photo} alt="" fill loading="lazy" unoptimized
                sizes="(max-width:430px) 92px, (max-width:760px) 130px, 200px"/>
            </div>
            <div className={styles.cardBody}>
              <p className={styles.eyebrow}><Icon aria-hidden="true" size={15}/>{offer.eyebrow}</p>
              <h3>{offer.title}</h3>
              <p className={styles.description}>{offer.description}</p>
              <div className={styles.cardFooter}>
                <span className={styles.note}>{offer.note}</span>
                <Link className={styles.action} href={offer.href} prefetch={false} data-offer-action={kinds[index]}>
                  {offer.action}<ArrowRight size={17} aria-hidden="true"/>
                </Link>
              </div>
            </div>
          </article>
          {index===0 && suggestions[selected?.id||'']?.length>1 && <p className={styles.testSuggestions}>
            {c.suggested}{' '}
            {suggestions[selected?.id||''].slice(0,2).map(t=>t.title).join(' · ')}
          </p>}
          <Link className={styles.mobileAll} href={allHrefs[index]} prefetch={false}>{group.all}<ArrowRight size={16} aria-hidden="true"/></Link>
        </section>
      })}
    </div>
  </div>
}
