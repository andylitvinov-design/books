'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowLeft, ArrowRight, BookOpen, BriefcaseBusiness, CalendarDays, Check, ChevronDown, ClipboardCheck, HeartHandshake, Search, Share2, Sparkles } from 'lucide-react'
import { journeyFocusForTopics, journeyProblemsForTopics } from '@/lib/assessments/topic-journeys'
import { makeTestSelectionIntent, PENDING_TEST_SELECTION_KEY } from '@/lib/app/test-selection-intent'
import styles from './topic-journey-selector.module.css'
import { AcquisitionEventLink } from '@/components/acquisition-event-link'

type Language = 'en' | 'ru' | 'es'
type Item = { id: string; title: Record<Language, string>; detail: Record<Language, string>; focus: readonly string[] }
type Journey = { id: string; title: Record<Language, string>; eyebrow: Record<Language, string>; summary: Record<Language, string>; introduction: Record<Language, string>; focus: readonly string[]; courseProgram: string; topics: readonly Item[] }
type RecommendedTest = {
  key: string
  title: string
  description: string
  area: string
  questionCount: number | null
  durationMinutes: number | null
  definition: { key: string; version: string; instrumentLocale: string }
}

const art: Record<string, string> = {
  relationships: '/images/holistic-house/video-posters/constellations-en-v1.webp',
  business: '/images/holistic-house/portrait-static/andy-828-3dcbabded1e9.webp',
  stress: '/images/holistic-house/hero-olive-incense.webp',
  energy: '/academy/reiki-yggdrasil/source/eastern-tradition.png',
  effectiveness: '/images/holistic-house/video-posters/hypnotherapy-en-v1.webp',
}
const copy = {
  en: {
    back: 'All directions', eyebrow: 'STEP 1 · CHOOSE A FOCUS', pickTitle: 'What would you like to explore?',
    pickHint: 'Select one or more themes — your two starter tests will update instantly.',
    recommended: 'STEP 2 · RECOMMENDED FOR YOU', recommendedTitle: 'Two tests to start with',
    recommendedHint: 'Chosen from available questionnaires for your themes. Tap a test to see what it covers.',
    questions: 'questions', minutes: 'min', details: 'About this test',
    empty: 'No starter test is available for this selection. Choose different themes or browse the catalog.',
    start: 'Take the two suggested tests', starting: 'Opening your tests…',
    browse: 'Choose other tests from the 100+ test catalog',
    options: 'How else would you like to continue?',
    course: 'Free support course', courseDetail: 'Start with tests, then explore a self-guided daily programme. One free course at a time.',
    review: 'Personal situation review', reviewDetail: 'A free written review of your form and ME–GOAL–PROBLEM drawing; no live session is included.',
    personal: 'Discuss this topic with Andrey', personalDetail: 'Optional personal session, independent of your test scores. €50 / 30 min or €100 / 60 min.', remoteDetail: 'Optional Reiki support. Practitioner, availability and fee are confirmed before booking; no test results are shared.',
    share:'Share this public guide', copied:'Public guide link copied. Your personal results are not included.', shared:'Public guide shared without your results.', manual:'Copy this public link manually. It does not contain your test answers.',
    safety: 'These questionnaires are for self-reflection, not medical diagnosis or treatment.',
    error: 'Could not open your tests. Check your connection and try again.',
    signinError: 'Google sign-in is currently unavailable. Please try again.',
  },
  es: {
    back:'Todas las áreas',eyebrow:'PASO 1 · ELIGE UN TEMA',pickTitle:'¿Qué te gustaría explorar?',pickHint:'Selecciona uno o varios temas; las dos pruebas sugeridas se actualizarán.',
    recommended:'PASO 2 · RECOMENDACIONES',recommendedTitle:'Dos pruebas para empezar',recommendedHint:'Cuestionarios disponibles relacionados con tus intereses. Abre una tarjeta para conocer la fuente.',
    questions:'preguntas',minutes:'min',details:'Acerca de esta prueba',empty:'No hay pruebas iniciales para esta selección. Prueba otros temas o consulta el catálogo.',
    start:'Realizar las dos pruebas sugeridas',starting:'Abriendo las pruebas…',browse:'Explorar el catálogo de más de 100 pruebas',
    options:'¿Cómo deseas continuar?',course:'Curso gratuito de apoyo',courseDetail:'Empieza con pruebas y después descubre prácticas breves a tu ritmo. Un curso gratuito a la vez.',
    review:'Revisión escrita de tu situación',reviewDetail:'Reflexión personal gratuita sobre tu formulario y dibujo YO–META–PROBLEMA; no incluye una sesión en directo.',
    personal:'Hablar personalmente con Andrey',personalDetail:'Sesión opcional, independiente de los resultados. €50 / 30 min o €100 / 60 min.',remoteDetail:'Apoyo Reiki opcional. Profesional, horario y precio se confirman antes de reservar; no enviamos tus resultados.',
    share:'Compartir esta guía pública',copied:'Enlace copiado. Tus resultados personales no se incluyen.',shared:'Guía compartida sin tus resultados.',manual:'Copia este enlace público. No contiene respuestas personales.',
    safety:'Estos cuestionarios son para la autoobservación y no ofrecen diagnóstico ni tratamiento médico.',error:'No se pudieron abrir las pruebas. Comprueba la conexión e inténtalo de nuevo.',signinError:'El acceso con Google no está disponible en este momento. Inténtalo más tarde.',
  },
  ru: {
    back: 'Все направления', eyebrow: 'ШАГ 1 · ВЫБОР ТЕМЫ', pickTitle: 'Что хотите исследовать?',
    pickHint: 'Отметьте одну или несколько тем — два стартовых теста подберутся автоматически.',
    recommended: 'ШАГ 2 · РЕКОМЕНДУЕМ ВАМ', recommendedTitle: 'Два теста для начала',
    recommendedHint: 'Из доступных опросников по вашему запросу. Раскройте тест, чтобы узнать подробности.',
    questions: 'вопросов', minutes: 'мин', details: 'Описание теста',
    empty: 'По этой теме пока нет подходящего стартового теста. Выберите другие темы или откройте каталог.',
    start: 'Пройти предложенные тесты', starting: 'Открываем тесты…',
    browse: 'Подобрать тесты из каталога 100+',
    options: 'Как ещё хотите продолжить?',
    course: 'Бесплатный курс поддержки', courseDetail: 'После тестов — самостоятельная ежедневная программа. Бесплатно доступен один курс одновременно.',
    review: 'Личная диагностика (расстановка)', reviewDetail: 'Бесплатный письменный разбор; живая расстановка в бесплатный формат не входит. Заполните анкету и пришлите рисунок «Я — цель — проблема».',
    personal: 'Обсудить тему лично с Андреем', personalDetail: 'Необязательная сессия независимо от баллов теста: €50 / 30 мин или €100 / 60 мин.', remoteDetail: 'Необязательная Рейки-поддержка: мастер, время и цена согласуются до записи; ответы тестов не передаются.',
    share:'Поделиться публичным материалом',copied:'Ссылка скопирована. В ней нет ваших результатов.',shared:'Публичный материал отправлен без ваших результатов.',manual:'Скопируйте эту ссылку вручную. Она не содержит ваших ответов.',
    safety: 'Опросники предназначены для самонаблюдения, не для медицинской диагностики или лечения.',
    error: 'Не удалось открыть тесты. Проверьте соединение и повторите попытку.',
    signinError: 'Вход через Google сейчас недоступен. Попробуйте позже.',
  },
} as const

// Maps public topic interests to public paid offers. No test answers or scores enter these URLs.
const personalServiceForJourney: Record<string, string> = {
  relationships: 'systemic-constellations',
  business: 'business-consulting',
  stress: 'imagery-therapy',
  energy: 'remote-energy-support',
  effectiveness: 'imagery-therapy',
}


// A separate, editorial link to Andrey's existing consultation offer.
// Keep it independent of the voluntary self-check flow and any private test results.
const businessPromo = {
  en: {
    kicker: 'PERSONAL BUSINESS CONSULTATION',
    title: 'A clearer direction for your next business decision',
    description: 'Explore your strategy, priorities and founder challenges with Andrey Litvinov. Toronto & online.',
    price: '30 min · €50  |  60 min · €100',
    action: 'Explore business consultation',
  },
  ru: {
    kicker: 'ЛИЧНАЯ БИЗНЕС-КОНСУЛЬТАЦИЯ',
    title: 'Найдите ясность в важном бизнес-решении',
    description: 'Разберём вашу стратегию, приоритеты и сложности предпринимателя вместе с Андреем Литвиновым. Торонто и онлайн.',
    price: '30 мин · €50  |  60 мин · €100',
    action: 'Открыть бизнес-консультацию',
  },
  es: {
    kicker: 'CONSULTORÍA EMPRESARIAL PERSONAL',
    title: 'Más claridad para tu próxima decisión empresarial',
    description: 'Explora tu estrategia, prioridades y desafíos como emprendedor con Andrey Litvinov. Toronto y en línea.',
    price: '30 min · €50  |  60 min · €100',
    action: 'Ver consulta de negocios',
  },
} as const

type StartAttempt = { controller: AbortController; scope: string; href: string; intent?: string; handedOff: boolean }

function stopAttempt(attempt: StartAttempt | null) {
  if (!attempt) return
  attempt.controller.abort()
  try {
    if (attempt.intent && !attempt.handedOff && window.sessionStorage.getItem(PENDING_TEST_SELECTION_KEY) === attempt.intent) {
      window.sessionStorage.removeItem(PENDING_TEST_SELECTION_KEY)
    }
  } catch { /* Storage may be unavailable; cancellation must still finish. */ }
}

async function request(path: string, body?: unknown, method = 'POST', options: { accountId?: string; signal?: AbortSignal } = {}) {
  const response = await fetch('/api/app/' + path, {
    method, credentials: 'same-origin', cache: 'no-store',
    headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), ...(options.accountId ? { 'X-HH-Account-ID': options.accountId } : {}) },
    body: body ? JSON.stringify(body) : undefined,
    signal: options.signal,
  })
  const value = await response.json().catch(() => ({ error: 'SERVICE_UNAVAILABLE' }))
  if (!response.ok) throw Object.assign(new Error(value.error || 'SERVICE_UNAVAILABLE'), { status: response.status })
  return value
}

export function TopicJourneySelector({ locale, journey, suggestions }: {
  locale: Language
  journey: Journey
  suggestions: Record<string, RecommendedTest[]>
}) {
  const language = locale
  // Private test sessions still use the existing English/Russian app.
  const appLocale = language === 'es' ? 'en' : language
  const c = copy[language]
  const businessCallout = businessPromo[language]
  const [selected, setSelected] = useState<string[]>([])
  const [starting, setStarting] = useState(false)
  const [error, setError] = useState('')
  const [shareStatus,setShareStatus] = useState<'copied'|'shared'|'manual'|''>('')
  const focus = useMemo(() => journeyFocusForTopics(journey, selected), [journey, selected])
  const problems = useMemo(() => journeyProblemsForTopics(journey, selected), [journey, selected])
  const recommended = suggestions[selected.slice().sort().join(',')] || []
  const scope = JSON.stringify([language, journey.id, selected, recommended.map((item) => [item.key, item.definition])])
  const scopeRef = useRef(scope)
  scopeRef.current = scope
  const activeRef = useRef(false)
  const attemptRef = useRef<StartAttempt | null>(null)

  function cancelStart() {
    const attempt = attemptRef.current
    attemptRef.current = null
    stopAttempt(attempt)
    setStarting(false)
  }

  useEffect(() => {
    activeRef.current = true
    const cancel = () => {
      const attempt = attemptRef.current
      attemptRef.current = null
      stopAttempt(attempt)
      setStarting(false)
    }
    const leave = () => { activeRef.current = false; cancel() }
    const returnToPage = () => { activeRef.current = true }
    const visibility = () => { if (document.visibilityState === 'hidden') cancel() }
    let channel: BroadcastChannel | null = null
    try {
      if (typeof BroadcastChannel !== 'undefined') {
        channel = new BroadcastChannel('hh-app-session')
        channel.onmessage = (event) => { if (event.data === 'signed-out') cancel() }
      }
    } catch { /* Owner-bound requests remain authoritative without cross-tab hints. */ }
    window.addEventListener('pagehide', leave)
    window.addEventListener('pageshow', returnToPage)
    window.addEventListener('popstate', cancel)
    document.addEventListener('visibilitychange', visibility)
    setStarting(false)
    setError('')
    return () => {
      activeRef.current = false
      const attempt = attemptRef.current
      attemptRef.current = null
      stopAttempt(attempt)
      channel?.close()
      window.removeEventListener('pagehide', leave)
      window.removeEventListener('pageshow', returnToPage)
      window.removeEventListener('popstate', cancel)
      document.removeEventListener('visibilitychange', visibility)
    }
  }, [scope])

  const testHref = '/' + language + '/client/tests?focus=' + encodeURIComponent(focus.join(',')) +
    '&journey=' + journey.id + '&topics=' + encodeURIComponent(selected.join(','))
  const courseHref = testHref + '&mode=course'
  const browseHref = testHref + '&catalog=full'

  async function shareJourney() {
    // Never place session identifiers, selected answers, scores or concerns in a public URL.
    const publicUrl = new URL('/' + language + '/explore/' + journey.id, window.location.origin).toString()
    try {
      if (navigator.share) {
        await navigator.share({ title: journey.title[language], url: publicUrl })
        setShareStatus('shared')
      } else if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(publicUrl)
        setShareStatus('copied')
      } else {
        setShareStatus('manual')
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') return
      setShareStatus('manual')
    }
  }

  const toggle = (id: string) => setSelected((current) =>
    current.includes(id) ? current.filter((item) => item !== id) : [...current, id])

  async function startRecommended() {
    if (attemptRef.current || !activeRef.current || recommended.length === 0) return
    const attempt: StartAttempt = { controller: new AbortController(), scope, href: window.location.href, handedOff: false }
    attemptRef.current = attempt
    const current = () => activeRef.current && attemptRef.current === attempt &&
      !attempt.controller.signal.aborted && scopeRef.current === attempt.scope &&
      window.location.href === attempt.href && document.visibilityState !== 'hidden'
    const options = { signal: attempt.controller.signal }
    setStarting(true)
    setError('')
    const preferences = { focus, problems }
    try {
      const intent = makeTestSelectionIntent(recommended.map((item) => item.key), Date.now(), preferences)
      let accountId: string | null = null
      try {
        const session = await request('bootstrap', undefined, 'GET', options)
        if (!current()) return
        if (typeof session.account?.id !== 'string' || !session.account.id.trim()) throw new Error('INVALID_ACCOUNT')
        accountId = session.account.id
      } catch (cause) {
        if (!current()) return
        if (!(cause instanceof Error && 'status' in cause && cause.status === 401)) throw cause
      }
      if (!current()) return
      if (accountId) {
        const ownerOptions = { ...options, accountId }
        const saved = await request('test-plans', {
          items: recommended.map((item) => ({
            definitionKey: item.definition.key,
            definitionVersion: item.definition.version,
            instrumentLocale: item.definition.instrumentLocale,
          })),
          operationId: crypto.randomUUID(),
          appendActive: true,
          selectionPreferences: preferences,
        }, 'POST', ownerOptions)
        if (!current()) return
        if (typeof saved.id !== 'string' || !saved.id.trim()) throw new Error('MISSING_TEST_PLAN')
        const session = await request('bootstrap', undefined, 'GET', ownerOptions)
        if (!current()) return
        if (session.account?.id !== accountId) throw new Error('ACCOUNT_CHANGED')
        // Cross public -> private CSP policies with one fresh document.
        // A soft transition would start chunks that the CSP boundary must cancel.
        window.location.assign('/' + appLocale + '/app/tests?plan=' + encodeURIComponent(saved.id))
        return
      }
      // Store only the editorial test identifiers, never personal answers.
      attempt.intent = intent
      window.sessionStorage.setItem(PENDING_TEST_SELECTION_KEY, intent)
      const auth = await request('auth/start', { locale: appLocale, continueTo: 'tests' }, 'POST', options)
      if (!current()) return
      if (!auth.redirectUrl) throw new Error('SIGN_IN_UNAVAILABLE')
      window.location.assign(auth.redirectUrl)
      attempt.handedOff = true
    } catch (cause) {
      if (!current()) return
      setError(cause instanceof Error && cause.message === 'SIGN_IN_UNAVAILABLE' ? c.signinError : c.error)
      cancelStart()
    } finally {
      // A response can outlive a route/selection change even when fetch ignores abort.
      if (!current()) {
        stopAttempt(attempt)
        if (attemptRef.current === attempt) {
          attemptRef.current = null
          if (activeRef.current) setStarting(false)
        }
      }
    }
  }

  return <div className={styles.root} data-topic-journey={journey.id}>
    <section className={styles.hero}>
      <div className={styles.heroArt} aria-hidden="true">
        <Image src={art[journey.id]} alt="" fill unoptimized priority
          sizes="(max-width: 630px) 115px, (max-width: 960px) 220px, 300px" />
      </div>
      <div className={styles.heroCopy}>
        <Link onClick={cancelStart} href={language === 'es' ? '/es#hh-topic-journeys' : '/?lang=' + language + '#hh-topic-journeys'} className={styles.back}>
          <ArrowLeft size={16} aria-hidden="true" />{c.back}
        </Link>
        <p className={styles.eyebrow}>{journey.eyebrow[language]}</p>
        <h1>{journey.title[language]}</h1>
        <p className={styles.introduction}>{journey.introduction[language]}</p>
      </div>
    </section>

    {journey.id === 'business' && (
      <aside className={styles.businessPromo} aria-labelledby="hh-business-consultation-title" data-business-consultation-banner>
        <span className={styles.businessPromoIcon} aria-hidden="true"><BriefcaseBusiness size={25} strokeWidth={1.8}/></span>
        <div className={styles.businessPromoCopy}>
          <p className={styles.businessPromoKicker}>{businessCallout.kicker}</p>
          <h2 id="hh-business-consultation-title">{businessCallout.title}</h2>
          <p>{businessCallout.description}</p>
        </div>
        <div className={styles.businessPromoSide}>
          <span className={styles.businessPromoPrice}>{businessCallout.price}</span>
          <AcquisitionEventLink onClick={cancelStart}
            href={'/' + language + '/services/business-consulting'}
            event="service_view" prefetch={false} className={styles.businessPromoLink}
            attributes={{ 'data-topic-action': 'business-consultation-banner', 'data-topic-service': 'business' }}>
            {businessCallout.action}<ArrowRight size={17} aria-hidden="true" />
          </AcquisitionEventLink>
        </div>
      </aside>
    )}

    <section className={styles.selection} aria-labelledby="hh-topic-selection-heading">
      <div className={styles.sectionHead}>
        <p className={styles.eyebrow}>{c.eyebrow}</p>
        <h2 id="hh-topic-selection-heading">{c.pickTitle}</h2>
        <p>{c.pickHint}</p>
      </div>
      <div className={styles.topics} role="group" aria-label={c.pickTitle}>
        {journey.topics.map((topic) => <button key={topic.id} type="button" className={styles.topic}
          aria-pressed={selected.includes(topic.id)} data-topic-choice={topic.id} onClick={() => toggle(topic.id)}>
          <span className={styles.check}><Check size={16} aria-hidden="true" /></span>
          <span><strong>{topic.title[language]}</strong><small>{topic.detail[language]}</small></span>
        </button>)}
      </div>
    </section>

    <section className={styles.suggestions} aria-labelledby="hh-topic-recommended-tests">
      <div className={styles.sectionHead}>
        <p className={styles.eyebrow}>{c.recommended}</p>
        <h2 id="hh-topic-recommended-tests">{c.recommendedTitle}</h2>
        <p>{c.recommendedHint}</p>
      </div>
      <div className={styles.suggestionList} aria-live="polite">
        {recommended.length ? recommended.map((item, index) => <details className={styles.test} key={item.key}
          data-recommended-test={item.key}>
          <summary>
            <span className={styles.testNumber}>{String(index + 1).padStart(2, '0')}</span>
            <span className={styles.testSummary}>
              <strong>{item.title}</strong>
              <small>{[item.durationMinutes ? '~' + item.durationMinutes + ' ' + c.minutes : null,
                item.questionCount ? item.questionCount + ' ' + c.questions : null].filter(Boolean).join(' · ')}</small>
            </span>
            <ChevronDown className={styles.testChevron} size={19} aria-hidden="true" />
          </summary>
          <div className={styles.testDetail}>
            {language === 'es' ? <><p>Los detalles técnicos se muestran en el idioma original del cuestionario. Esta herramienta no establece un diagnóstico.</p><p lang={item.definition.instrumentLocale}>{item.description || item.area || c.details}</p></> : <p>{item.description || item.area || c.details}</p>}
          </div>
        </details>) : <p className={styles.noTests}>{c.empty}</p>}
      </div>

      <button type="button" className={styles.primaryAction} data-topic-action="tests"
        disabled={!recommended.length || starting} aria-busy={starting} onClick={startRecommended}>
        <span className={styles.primaryIcon}><ClipboardCheck size={23} aria-hidden="true" /></span>
        <span>{starting ? c.starting : c.start}</span>
        <ArrowRight size={22} aria-hidden="true" className={styles.primaryArrow} />
      </button>
      {error && <p className={styles.error} role="alert">{error}</p>}
      <Link onClick={cancelStart} href={browseHref} className={styles.browseLink} data-topic-action="browse">
        <Search size={18} aria-hidden="true" />{c.browse}<ArrowRight size={16} aria-hidden="true" />
      </Link>
    </section>

    <section className={styles.actions} aria-labelledby="hh-topic-actions-heading">
      <div className={styles.sectionHead}>
        <p className={styles.eyebrow}>HOLISTIC HOUSE</p>
        <h2 id="hh-topic-actions-heading">{c.options}</h2>
      </div>
      <div className={styles.secondaryActions}>
        <Link onClick={cancelStart} href={courseHref} className={styles.secondaryLink} data-topic-action="course">
          <BookOpen size={21} aria-hidden="true" />
          <span><strong>{c.course}</strong><small>{c.courseDetail}</small></span>
          <ArrowRight size={18} aria-hidden="true" />
        </Link>
        <Link onClick={cancelStart} href={'/' + language + '/services/free-situation-review'} className={styles.secondaryLink} data-topic-action="review">
          <HeartHandshake size={21} aria-hidden="true" />
          <span><strong>{c.review}</strong><small>{c.reviewDetail}</small></span>
          <ArrowRight size={18} aria-hidden="true" />
        </Link>
        <AcquisitionEventLink onClick={cancelStart}
          href={'/' + language + '/services/' + (personalServiceForJourney[journey.id] || 'alchemy-of-soul')}
          event="service_view" className={[styles.secondaryLink, styles.paidServiceLink].join(' ')}
          attributes={{ 'data-topic-action': 'consultation', 'data-topic-service': journey.id }} prefetch={false}>
          <CalendarDays size={21} aria-hidden="true" />
          <span><strong>{c.personal}</strong><small>{journey.id === 'energy' ? c.remoteDetail : c.personalDetail}</small></span>
          <ArrowRight size={18} aria-hidden="true" />
        </AcquisitionEventLink>
      </div>
      <div className={styles.shareArea} data-topic-safe-sharing>
        <button type="button" className={styles.shareButton} onClick={shareJourney}>
          <Share2 size={17} aria-hidden="true" />{c.share}
        </button>
        {shareStatus && <p className={styles.shareStatus} role="status">{c[shareStatus]}</p>}
        {shareStatus === 'manual' && <input className={styles.manualShare} type="text" readOnly
          aria-label={c.manual} onFocus={event=>event.currentTarget.select()}
          value={'https://holistichouse.vercel.app/' + language + '/explore/' + journey.id}/>}
      </div>
      <p className={styles.footnote}><Sparkles size={15} aria-hidden="true" />{c.safety}</p>
    </section>
  </div>
}
