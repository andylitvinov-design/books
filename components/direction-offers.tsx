'use client'

import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight, ChevronDown, ChevronLeft, ChevronRight, ClipboardCheck, GraduationCap, CalendarDays, MessageCircle, Search } from 'lucide-react'
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
type SuggestedTest = { key: string; title: string }
type Direction = 'energy' | 'relationships' | 'business'
type Offer = { id: string; title: string; description: string; action: string; photo: string; href: string; eyebrow: string; note: string }
type OfferKind = 'test' | 'course' | 'session'
type ActionIntent = OfferKind | 'advice'
type Localized = Record<PublicLocale, string>
type CatalogOffer = { id: string; title: Localized; description: Localized; path: string; photo: string; note: Localized; action?: Localized }
const tr = (en: string, ru: string, es: string): Localized => ({en, ru, es})

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
    suggested: 'Suggested: ', testAction: 'Take a free test', chooseTest: 'Choose a test', freeNote: 'Free to start',
    courseAction: 'Explore the course', courseNote: 'At your own pace',
    sessionAction: 'Explore a session', sessionNote: '30 min €50 · 60 min €100',
    more: 'Explore all options', moreTests: 'All tests', moreCourses: 'All courses', moreServices: 'All personal services',
  },
  ru: {
    pick: 'Уточните тему', all: 'Все темы', subtitle: 'Выберите запрос, а затем удобный способ начать.',
    free: '01 · БЕСПЛАТНЫЙ ТЕСТ', course: '02 · КУРС', session: '03 · ЛИЧНАЯ СЕССИЯ',
    testTitle: 'Исследуйте свои ресурсы', testDescription: 'Выберите бесплатный опросник для самоисследования по вашему запросу.',
    suggested: 'Рекомендуем: ', testAction: 'Пройти тест', chooseTest: 'Выбрать тест', freeNote: 'Начните бесплатно',
    courseAction: 'Открыть курс', courseNote: 'В своём темпе',
    sessionAction: 'Выбрать сессию', sessionNote: '30 мин €50 · 60 мин €100',
    more: 'Остальные предложения', moreTests: 'Все тесты', moreCourses: 'Все курсы', moreServices: 'Все личные услуги',
  },
  es: {
    pick: 'Elige un tema', all: 'Todos los temas', subtitle: 'Elige tu tema y la forma de comenzar.',
    free: '01 · TEST GRATIS', course: '02 · CURSO', session: '03 · SESIÓN PERSONAL',
    testTitle: 'Explora tus recursos', testDescription: 'Elige un cuestionario gratuito de reflexión personal.',
    suggested: 'Sugerencia: ', testAction: 'Hacer un test', chooseTest: 'Elegir un test', freeNote: 'Empieza gratis',
    courseAction: 'Explorar el curso', courseNote: 'A tu ritmo',
    sessionAction: 'Explorar una sesión', sessionNote: '30 min €50 · 60 min €100',
    more: 'Explorar más opciones', moreTests: 'Todos los tests', moreCourses: 'Todos los cursos', moreServices: 'Todos los servicios',
  },
} as const

const actionCopy = {
  en: {
    title: 'What would you like to do?',
    all: 'Show all options',
    selected: 'Showing:',
    buttons: { test: 'Take a test', advice: 'Get advice', course: 'Take a course', session: 'Get a consultation' },
    adviceKicker: 'FREE · PERSONAL GUIDANCE',
    adviceTitle: 'Get a free written review',
    adviceDetail: 'Describe your question in a short form for a personal written response. No session is booked automatically.',
    adviceAction: 'Request free advice',
  },
  ru: {
    title: 'Что хотите сделать?',
    all: 'Все варианты',
    selected: 'Показано:',
    buttons: { test: 'Пройти тест', advice: 'Получить совет', course: 'Пройти курс', session: 'Получить консультацию' },
    adviceKicker: 'БЕСПЛАТНО · ЛИЧНЫЙ ОТВЕТ',
    adviceTitle: 'Бесплатный письменный разбор',
    adviceDetail: 'Опишите свой запрос в короткой форме, чтобы получить личный письменный ответ. Встреча не бронируется автоматически.',
    adviceAction: 'Получить совет',
  },
  es: {
    title: '¿Qué te gustaría hacer?',
    all: 'Todas las opciones',
    selected: 'Mostrando:',
    buttons: { test: 'Hacer un test', advice: 'Recibir orientación', course: 'Hacer un curso', session: 'Solicitar una consulta' },
    adviceKicker: 'GRATIS · ORIENTACIÓN PERSONAL',
    adviceTitle: 'Revisión escrita gratuita',
    adviceDetail: 'Comparte tu pregunta en un formulario breve para recibir una respuesta personal. No se reserva una cita automáticamente.',
    adviceAction: 'Solicitar orientación',
  },
} as const

const actionIds = ['test', 'advice', 'course', 'session'] as const
const actionIcons = { test: ClipboardCheck, advice: MessageCircle, course: GraduationCap, session: CalendarDays } as const

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

/* Curated, independently real routes; do not manufacture programmes, bookings
   or prices. Historical Academy material is always labelled as an archive. */
const archiveNote = tr('Historical Academy material', 'Материалы архива Академии', 'Material histórico de la Academia')
const archiveAction = tr('View material', 'Смотреть материал', 'Ver material')
const studyNote = tr('Academy study material', 'Учебные материалы Академии', 'Material de la Academia')
const courseOptions: Record<Direction, readonly CatalogOffer[]> = {
  energy: [
    {
      id:'reiki-practitioner', title:tr('Reiki Practitioner · Free course','Практик Рейки · Бесплатный курс','Reiki Practitioner · Curso gratuito'),
      description:tr('Five introductory lessons with exercises and guided meditations.','Пять вводных уроков с упражнениями и медитациями.','Cinco lecciones con ejercicios y meditaciones.'),
      path:'/academy/principles-of-energywork', photo:'/academy/reiki-yggdrasil/source/program-overview.jpg',
      note:tr('Free · 5 lessons','Бесплатно · 5 уроков','Gratis · 5 lecciones'),
    },
    {
      id:'kundalini-reiki', title:tr('Kundalini Reiki · 3 levels','Кундалини Рейки · 3 ступени','Kundalini Reiki · 3 niveles'),
      description:tr('Explore the source manual and introductory Reiki practices.','Изучите методичку и базовые практики Рейки.','Explora el manual y las prácticas introductorias.'),
      path:'/academy/reiki/kundalini-reiki', photo:'/academy/kundalini-reiki/kundalini-manual-level-2.jpg', note:studyNote,
    },
    {
      id:'yggdrasil-reiki', title:tr('Tao Reiki Yggdrasil','Дао Рейки Иггдрасиль','Tao Reiki Yggdrasil'),
      description:tr('A structured introduction to symbolic energywork.','Структурированное введение в символические энергопрактики.','Una introducción estructurada a la práctica energética simbólica.'),
      path:'/academy/reiki/yggdrasil', photo:'/academy/reiki-yggdrasil/source/basic-program.jpg', note:studyNote,
    },
  ],
  relationships: [
    {
      id:'love-archetypes', title:tr('Archetypes of Love','Архетипы любви','Arquetipos del amor'),
      description:tr('Explore relationship patterns through myth and symbolic reflection.','Исследуйте отношения через мифы и символическую рефлексию.','Explora las relaciones mediante mitos y reflexión simbólica.'),
      path:'/academy/mysteries/archetypes-of-love', photo:'/images/holistic-house/hero-olive-incense.webp',
      note:archiveNote, action:archiveAction,
    },
    {
      id:'love-hypnocoaching', title:tr('Hypno-Coaching of Love','Гипно-коучинг любви','Hipnocoaching del amor'),
      description:tr('Historical lessons about closeness, trust and personal choice.','Архивные материалы о близости, доверии и выборе.','Material histórico sobre cercanía, confianza y decisiones.'),
      path:'/academy/mysteries/hypno-love', photo:'/academy/reiki-yggdrasil/source/temple-studies.png',
      note:archiveNote, action:archiveAction,
    },
    {
      id:'love-constellations', title:tr('Constellations of Love','Расстановки любви','Constelaciones del amor'),
      description:tr('An archived programme on connection, autonomy and boundaries.','Архивная программа о связи, автономии и границах.','Programa histórico sobre conexión, autonomía y límites.'),
      path:'/academy/archive/constellations-of-love', photo:photography.loveSession,
      note:archiveNote, action:archiveAction,
    },
  ],
  business: [
    {
      id:'business-demiurges', title:tr('Demiurges of Creation · Business','Демиурги Творения · Бизнес','Demiurgos de la creación · Negocios'),
      description:tr('Historical symbolic coaching ideas for projects and decisions.','Архивные символические подходы к проектам и решениям.','Ideas históricas de coaching simbólico para proyectos.'),
      path:'/academy/applied/business/demiurges-of-creation', photo:'/images/holistic-house/books-library.webp',
      note:archiveNote, action:archiveAction,
    },
    {
      id:'business-runes', title:tr('Runes & Business','Руны и бизнес','Runas y negocios'),
      description:tr('An archived symbolic framework for plans and choices.','Архивная символическая схема для планирования и выбора.','Material simbólico histórico para planes y decisiones.'),
      path:'/academy/runes/runes-business', photo:'/academy/reiki-yggdrasil/source/advanced-runes.png',
      note:archiveNote, action:archiveAction,
    },
    {
      id:'business-stress', title:tr('OPORA · Work stress support','ОПОРА · Поддержка при стрессе на работе','OPORA · Apoyo ante el estrés laboral'),
      description:tr('The existing 14-day course for everyday steadiness and focus.','Действующий 14-дневный курс для устойчивости и фокуса.','Curso actual de 14 días para la estabilidad y el enfoque.'),
      path:'/courses/antistress', photo:photography.energyCourse,
      note:tr('14-day programme', '14-дневная программа', 'Programa de 14 días'),
    },
  ],
}
const serviceOptions: Record<Direction, readonly CatalogOffer[]> = {
  energy: [
    {
      id:'remote-reiki', title:tr('Remote Reiki energy support','Дистанционная поддержка Рейки','Apoyo Reiki a distancia'),
      description:tr('Choose a remote or live online format; timing and fee are confirmed separately.','Выберите дистанционный или онлайн-формат; время и стоимость уточняются.','Elige el formato a distancia o en vivo; confirma hora y precio.'),
      path:'/services/remote-energy-support', photo:'/academy/reiki-yggdrasil/source/basic-program.jpg',
      note:tr('Price confirmed before payment','Цена до оплаты согласовывается','Precio acordado antes de pagar'),
    },
    {
      id:'energy-imagery', title:tr('Imagery therapy','Образная терапия','Terapia con imágenes'),
      description:tr('Explore your question through guided imagery and reflection.','Исследуйте свой запрос через образы и осмысление.','Explora tu pregunta con imágenes guiadas y reflexión.'),
      path:'/services/imagery-therapy', photo:photography.loveCourse,
      note:tr('Personal consultation','Личная консультация','Consulta individual'),
    },
    {
      id:'energy-written-review', title:tr('Free written situation review','Бесплатный письменный разбор ситуации','Revisión escrita gratuita'),
      description:tr('Share a question for a written response; no live booking is made.','Задайте вопрос для письменного ответа без бронирования встречи.','Envía una pregunta para recibir respuesta escrita, sin reserva.'),
      path:'/services/free-situation-review', photo:photography.test,
      note:tr('Free · Written format','Бесплатно · Письменно','Gratis · Por escrito'),
    },
  ],
  relationships: [
    {
      id:'love-imagery', title:tr('Imagery therapy','Образная терапия','Terapia con imágenes'),
      description:tr('Explore relationship feelings and choices through guided imagery.','Исследуйте чувства и решения в отношениях через образы.','Explora sentimientos y decisiones con imágenes guiadas.'),
      path:'/services/imagery-therapy', photo:photography.loveCourse,
      note:tr('Personal consultation','Личная консультация','Consulta individual'),
    },
    {
      id:'love-written-review', title:tr('Free written situation review','Бесплатный письменный разбор ситуации','Revisión escrita gratuita'),
      description:tr('Describe a relationship question for a written first response.','Опишите ситуацию в отношениях для первого письменного ответа.','Describe tu situación para una primera respuesta escrita.'),
      path:'/services/free-situation-review', photo:photography.test,
      note:tr('Free · Written format','Бесплатно · Письменно','Gratis · Por escrito'),
    },
    {
      id:'love-alchemy', title:tr('Alchemy of Soul','Алхимия Души','Alquimia del alma'),
      description:tr('Individual symbolic work on your question and repeating patterns.','Индивидуальная символическая работа с запросом и повторениями.','Trabajo simbólico individual sobre patrones recurrentes.'),
      path:'/services/alchemy-of-soul', photo:photography.energySession,
      note:tr('Personal consultation','Личная консультация','Consulta individual'),
    },
  ],
  business: [
    {
      id:'business-written-review', title:tr('Free written situation review','Бесплатный письменный разбор ситуации','Revisión escrita gratuita'),
      description:tr('Ask about a professional decision without booking a session.','Задайте вопрос о рабочем решении без бронирования сессии.','Consulta una decisión profesional sin reservar una sesión.'),
      path:'/services/free-situation-review', photo:photography.test,
      note:tr('Free · Written format','Бесплатно · Письменно','Gratis · Por escrito'),
    },
    {
      id:'business-constellations', title:tr('Systemic constellations','Системные расстановки','Constelaciones sistémicas'),
      description:tr('Map roles, competing needs and patterns around a work decision.','Рассмотрите роли, противоречия и сценарии рабочего решения.','Explora roles y patrones alrededor de una decisión laboral.'),
      path:'/services/systemic-constellations', photo:photography.loveSession,
      note:tr('Personal consultation','Личная консультация','Consulta individual'),
    },
    {
      id:'business-imagery', title:tr('Imagery therapy','Образная терапия','Terapia con imágenes'),
      description:tr('Use guided reflection to clarify goals, pressure and direction.','Через образы проясните цели, напряжение и направление.','Aclara objetivos y decisiones mediante reflexión guiada.'),
      path:'/services/imagery-therapy', photo:photography.loveCourse,
      note:tr('Personal consultation','Личная консультация','Consulta individual'),
    },
  ],
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
    unmatched: 'Explore the available options below, or choose a more specific topic.',
    missing: 'Write a short wish or select a topic below.',
    privacy: 'Your words stay on this page. Only a form you deliberately submit can create an enquiry.',
    showMore: 'Show 2 more', showLess: 'Show fewer',
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
    unmatched: 'Ниже доступны все варианты. Уточните запрос с помощью фильтра.',
    missing: 'Напишите пожелание или выберите тему ниже.',
    privacy: 'Ваш текст остаётся на этой странице. Заявка появится только после отдельной отправки формы.',
    showMore: 'Показать ещё 2', showLess: 'Свернуть',
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
    unmatched: 'Explora las opciones o elige un tema más específico.',
    missing: 'Escribe brevemente tu deseo o elige un tema.',
    privacy: 'Tus palabras permanecen en esta página. Solo enviar otro formulario crea una solicitud.',
    showMore: 'Ver 2 más', showLess: 'Mostrar menos',
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
  const [intent, setIntent] = useState<ActionIntent | null>(null)
  const [question, setQuestion] = useState('')
  const [feedback, setFeedback] = useState('')
  const [slideIndex, setSlideIndex] = useState(0)
  const [expanded, setExpanded] = useState<Record<OfferKind, boolean>>({test:false,course:false,session:false})
  if (!directionIds.includes(journey.id as Direction)) return null

  const direction = journey.id as Direction
  const c = copy[locale]
  const d = directionCopy[direction][locale]
  const ui = presentation[locale]
  const action = actionCopy[locale]
  const selected = journey.topics.find(item => item.id === topicId)
  const appLocale = locale === 'es' ? 'en' : locale
  const courseHref = direction === 'business'
    ? '/' + appLocale + '/app/business'
    : '/' + locale + '/courses/antistress'
  const serviceHref = '/' + locale + '/services/' + ({
    energy: 'alchemy-of-soul', relationships: 'systemic-constellations', business: 'business-consulting',
  } as const)[direction]
  const offerFromCatalog = (item: CatalogOffer, kind: OfferKind): Offer => ({
    id:item.id, title:item.title[locale], description:item.description[locale],
    photo:item.photo, href:'/' + locale + item.path, note:item.note[locale],
    eyebrow:kind==='course' ? c.course : c.session,
    action:item.action?.[locale] ?? (kind==='course' ? c.courseAction : c.sessionAction),
  })
  // These cards already name an eligible suggested questionnaire. Take the visitor
  // straight into the existing single-test guest runner instead of a second picker.
  // Only the public definition key goes in the URL — never a concern or test answer.
  const directTestHref = (suggested: SuggestedTest | undefined, pickerHref: string) =>
    suggested?.key
      ? '/' + appLocale + '/client?startTests=' + encodeURIComponent(suggested.key)
      : pickerHref
  const overviewSuggested = suggestions['']?.[0]
  // Avoid showing two identical questionnaires in the first two cards.
  // Pick the next eligible topic match when the preceding card already uses one.
  const usedTestKeys = new Set<string>(selected || !overviewSuggested?.key ? [] : [overviewSuggested.key])
  const topicChoices = selected
    ? [selected, ...journey.topics.filter(topic => topic.id !== selected.id)]
    : journey.topics.slice(0,3)
  const topicOffers: Offer[] = topicChoices.map((topic,index) => {
    const focus = journeyFocusForTopics(journey, [topic.id])
    const topicSuggestions = suggestions[topic.id] ?? []
    const suggested = topicSuggestions.find(item => item.key && !usedTestKeys.has(item.key)) ?? topicSuggestions[0]
    if (suggested?.key) usedTestKeys.add(suggested.key)
    const pickerHref = '/' + locale + '/client/tests?focus=' + encodeURIComponent(focus.join(',')) +
      '&journey=' + direction + '&topics=' + encodeURIComponent(topic.id)
    return {
      id:topic.id, eyebrow:c.free, title:topic.title[locale],
      description:suggested ? c.suggested + suggested.title : topic.detail[locale],
      photo:index%2===0 ? photography.test : heroPhotography[direction][2],
      href:directTestHref(suggested, pickerHref), action:suggested?.key ? c.testAction : c.chooseTest, note:c.freeNote,
    }
  })
  const testOffers: Offer[] = selected ? topicOffers : [
    {id:'all-topics', eyebrow:c.free, title:c.testTitle,
      description:overviewSuggested ? c.suggested + overviewSuggested.title : c.testDescription,
      photo:photography.test,
      href:directTestHref(overviewSuggested, '/' + locale + '/client/tests?focus=' + encodeURIComponent(journeyFocusForTopics(journey, [] ).join(',')) +
        '&journey=' + direction + '&topics='),
      action:overviewSuggested?.key ? c.testAction : c.chooseTest, note:c.freeNote },
    ...topicOffers,
  ]
  const offers: Record<OfferKind, Offer[]> = {
    test: testOffers,
    course: [
      { id:'primary-course', eyebrow:c.course, title:d.course, description:d.courseDetail,
        photo:photography[direction === 'relationships' ? 'loveCourse' : direction === 'business' ? 'businessCourse' : 'energyCourse'],
        href:courseHref, action:c.courseAction, note:c.courseNote },
      ...courseOptions[direction].map(item => offerFromCatalog(item,'course')),
    ],
    session: [
      { id:'primary-session', eyebrow:c.session, title:d.service, description:d.serviceDetail,
        photo:photography[direction === 'relationships' ? 'loveSession' : direction === 'business' ? 'businessSession' : 'energySession'],
        href:serviceHref, action:c.sessionAction, note:c.sessionNote },
      ...serviceOptions[direction].map(item => offerFromCatalog(item,'session')),
    ],
  }
  // Reuse the published written-review service rather than creating a fake AI
  // advice answer, enquiry or booked appointment.
  const writtenReview = serviceOptions[direction].find(item => item.id.endsWith('written-review'))
  const adviceOffer = writtenReview ? {
    ...offerFromCatalog(writtenReview, 'session'),
    eyebrow: action.adviceKicker,
    action: action.adviceAction,
  } : null
  const kinds = ['test', 'course', 'session'] as const
  const icons = [ClipboardCheck, GraduationCap, CalendarDays] as const
  const allHrefs = [
    '/' + locale + '/client/tests?catalog=full',
    '/' + locale + '/academy',
    '/' + locale + '/services/catalog#service-listings',
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

    <section className={styles.actionFinder} aria-labelledby="hh-direction-action-label" data-direction-action-finder>
      <div className={styles.actionHeading}>
        <h2 id="hh-direction-action-label">{action.title}</h2>
        {intent && <button type="button" className={styles.actionReset}
          data-direction-action-reset onClick={()=>setIntent(null)}>{action.all}</button>}
      </div>
      <div className={styles.actionChips} role="group" aria-labelledby="hh-direction-action-label">
        {actionIds.map(id => {
          const Icon = actionIcons[id]
          return <button type="button" key={id} className={styles.actionChip}
            data-direction-intent={id} aria-pressed={intent===id}
            aria-controls="hh-direction-sections"
            onClick={()=>setIntent(previous=>previous===id ? null : id)}>
            <Icon size={17} aria-hidden="true"/><span>{action.buttons[id]}</span>
          </button>
        })}
      </div>
      <p className={styles.srOnly} role="status" aria-live="polite">
        {intent ? action.selected+' '+action.buttons[intent] : ''}
      </p>
    </section>

    <div className={styles.sections} id="hh-direction-sections" aria-label={ui.start} data-direction-sections>
      {kinds.map((kind,index)=>{
        const Icon=icons[index]
        const group=ui.groups[index]
        const showAll=expanded[kind]
        if (intent && intent !== kind) return null
        return <section className={styles.group} key={kind}
          id={'hh-direction-'+kind} data-direction-section={kinds[index]}
          aria-labelledby={'hh-direction-section-title-'+kind}>
          <div className={styles.sectionHeading}>
            <span className={styles.sectionIndex} aria-hidden="true">{index+1}</span>
            <div className={styles.sectionCopy}>
              <p>{group.kicker}</p>
              <h2 id={'hh-direction-section-title-'+kind}>{group.title}</h2>
              <span>{group.detail}</span>
            </div>
          </div>
          <div className={styles.offerList} id={'hh-direction-offers-'+kind} role="list">
            {offers[kind].slice(0,showAll ? 4 : 2).map((offer,offerIndex)=>
              <article className={styles.card} key={offer.id} role="listitem"
                data-offer-type={kind} data-offer-id={offer.id} data-offer-index={offerIndex+1}>
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
                    <Link className={styles.action} href={offer.href} prefetch={false} data-offer-action={kind}>
                      {offer.action}<ArrowRight size={17} aria-hidden="true"/>
                    </Link>
                  </div>
                </div>
              </article>
            )}
          </div>
          <div className={styles.groupActions}>
            <button type="button" className={styles.moreButton}
              aria-controls={'hh-direction-offers-'+kind} aria-expanded={showAll}
              data-direction-show-more={kind}
              onClick={()=>setExpanded(prev=>({...prev,[kind]:!prev[kind]}))}>
              {showAll ? ui.showLess : ui.showMore}
              <ChevronDown className={showAll ? styles.chevronOpen : undefined} size={16} aria-hidden="true"/>
            </button>
            {showAll && <Link className={styles.allButton} href={allHrefs[index]} prefetch={false}
              data-direction-all={kind}>{group.all}<ArrowRight size={16} aria-hidden="true"/></Link>}
          </div>
        </section>
      })}
      {intent==='advice' && adviceOffer && <section className={styles.group}
        id="hh-direction-advice" data-direction-section="advice"
        aria-labelledby="hh-direction-section-title-advice">
        <div className={styles.sectionHeading}>
          <span className={styles.sectionIndex} aria-hidden="true"><MessageCircle size={19}/></span>
          <div className={styles.sectionCopy}>
            <p>{action.adviceKicker}</p>
            <h2 id="hh-direction-section-title-advice">{action.adviceTitle}</h2>
            <span>{action.adviceDetail}</span>
          </div>
        </div>
        <div className={styles.offerList} role="list">
          <article className={styles.card} role="listitem"
            data-offer-type="advice" data-offer-id={adviceOffer.id}>
            <div className={styles.photo}>
              <Image src={adviceOffer.photo} alt="" fill loading="lazy" unoptimized
                sizes="(max-width:430px) 92px, (max-width:760px) 130px, 200px"/>
            </div>
            <div className={styles.cardBody}>
              <p className={styles.eyebrow}><MessageCircle size={15} aria-hidden="true"/>{adviceOffer.eyebrow}</p>
              <h3>{adviceOffer.title}</h3>
              <p className={styles.description}>{adviceOffer.description}</p>
              <div className={styles.cardFooter}>
                <span className={styles.note}>{adviceOffer.note}</span>
                <Link className={styles.action} href={adviceOffer.href} prefetch={false}
                  data-offer-action="advice">{adviceOffer.action}<ArrowRight size={17} aria-hidden="true"/></Link>
              </div>
            </div>
          </article>
        </div>
      </section>}
    </div>
  </div>
}
