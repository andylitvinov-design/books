'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, BookOpen, Heart, RotateCcw, Search, ShieldCheck, SlidersHorizontal, Sparkles, Users, MoreHorizontal, Zap, Leaf, Flower2 } from 'lucide-react'
import {
  COACH_PERSONAS, COACH_TOPICS, coachSessionHref, coachStagePrompt, getCoachPersona,
  localCoachText, normalizeCoachSettings,
} from '@/lib/coaching/persona-registry.mjs'
import styles from './my-coach-catalog.module.css'
import heroStyles from './my-coach-mira-landing.module.css'
import MyCoachExpressStart from './my-coach-express-start'
import { HeaderCreditProfile } from './header-credit-profile'

const words = {
  en: {
    eyebrow: 'HOLISTIC HOUSE · MY COACH',
    title: 'Find your AI coach',
    intro: 'Eight distinct coaching personas. Choose the approach that fits your situation, then adjust how your coach asks questions.',
    aiNotice: 'These are fictional AI personas, not real practitioners. Coaching supports reflection; it does not replace medical or mental health care.',
    search: 'Search coaches and topics', searchPlaceholder: 'E.g. relationships, decisions, habits',
    all: 'All coaches', favorites: 'Favorites', noResults: 'No coaches match. Clear the filters to see everyone.',
    topics: 'Choose a direction', profile: 'Coach profile', about: 'About this coach',
    suited: 'Good for', method: 'Approaches', example: 'How this coach starts',
    adjust: 'Your conversation settings', adjustNote: 'Settings change the tone and optional follow-up questions, not the safety rules.',
    warmth: 'Warmth', directness: 'Directness', pace: 'Pace', depth: 'Depth',
    less: 'Less', more: 'More', slow: 'Gentle', balanced: 'Balanced', fast: 'Fast',
    light: 'Practical', deep: 'Reflective', reset: 'Reset style',
    preview: 'Preview of a follow-up question', start: 'Start guided coaching',
    viewProfile: 'Explore coach', favorite: 'Add to favorites', unfavorite: 'Remove from favorites',
    chosen: 'Selected', available: '8 characters', change: 'Change your coach anytime',
    sessionNote: 'After sign-in and your explicit consent, a generative text dialogue is offered when a verified free privacy-preserving model is configured. Reviewed guided questions remain available as a fallback; two-way AI voice is not enabled.',
    back: 'Coaching Lounge', human: 'Human specialists', privacy: 'Search and choices stay in this browser; favorites save only persona IDs on this device.',
    safety: 'One question at a time · No diagnoses · Your decisions remain yours',
  },
  ru: {
    eyebrow: 'HOLISTIC HOUSE · MY COACH',
    title: 'Выберите своего AI-коуча',
    intro: 'Восемь разных AI-персонажей. Выберите подходящий стиль и настройте, как коуч будет задавать вопросы.',
    aiNotice: 'Это вымышленные AI-персонажи, а не реальные специалисты. Коучинг помогает размышлять, но не заменяет медицинскую или психотерапевтическую помощь.',
    search: 'Поиск по коучам и темам', searchPlaceholder: 'Например: отношения, решение, привычки',
    all: 'Все коучи', favorites: 'Избранные', noResults: 'По запросу никого нет. Сбросьте фильтры, чтобы увидеть всех.',
    topics: 'Выберите направление', profile: 'Профиль коуча', about: 'О коуче',
    suited: 'Подходит для', method: 'Методики', example: 'Как коуч начинает разговор',
    adjust: 'Настройки разговора', adjustNote: 'Настройки меняют тон и дополнительные вопросы, но не правила безопасности.',
    warmth: 'Теплота', directness: 'Прямота', pace: 'Темп', depth: 'Глубина',
    less: 'Меньше', more: 'Больше', slow: 'Мягкий', balanced: 'Средний', fast: 'Быстрый',
    light: 'Практично', deep: 'Глубоко', reset: 'Вернуть стиль',
    preview: 'Пример дополнительного вопроса', start: 'Начать коучинг-сессию',
    viewProfile: 'Открыть профиль', favorite: 'В избранное', unfavorite: 'Убрать из избранного',
    chosen: 'Выбран', available: '8 персонажей', change: 'Коуча можно сменить в любой момент',
    sessionNote: 'После входа и вашего согласия доступен генеративный текстовый диалог, если настроена проверенная бесплатная модель с защитой данных. Программа с проверенными вопросами остаётся запасным вариантом. Двусторонний AI-голос не подключён.',
    back: 'Гостиная коучинга', human: 'Реальные специалисты', privacy: 'Поиск остаётся в браузере; в избранном на устройстве сохраняются только ID персонажей.',
    safety: 'Один вопрос за раз · Без диагнозов · Решение остаётся за вами',
  },
  es: {
    eyebrow: 'HOLISTIC HOUSE · MY COACH',
    title: 'Elige tu coach de IA',
    intro: 'Ocho personajes diferentes. Elige el estilo apropiado y adapta cómo hace las preguntas.',
    aiNotice: 'Son personajes ficticios de IA, no profesionales reales. El coaching ayuda a reflexionar, pero no sustituye la atención clínica.',
    search: 'Buscar coaches y temas', searchPlaceholder: 'Ej.: relaciones, decisiones, hábitos',
    all: 'Todos los coaches', favorites: 'Favoritos', noResults: 'No hay resultados. Borra los filtros para verlos todos.',
    topics: 'Elige una dirección', profile: 'Perfil del coach', about: 'Sobre el coach',
    suited: 'Adecuado para', method: 'Métodos', example: 'Así comienza la conversación',
    adjust: 'Ajustes de conversación', adjustNote: 'Cambian el tono y preguntas adicionales, no las reglas de seguridad.',
    warmth: 'Calidez', directness: 'Claridad directa', pace: 'Ritmo', depth: 'Profundidad',
    less: 'Menos', more: 'Más', slow: 'Suave', balanced: 'Equilibrado', fast: 'Rápido',
    light: 'Práctico', deep: 'Reflexivo', reset: 'Restablecer estilo',
    preview: 'Ejemplo de pregunta de seguimiento', start: 'Empezar coaching guiado',
    viewProfile: 'Ver perfil', favorite: 'Añadir favorito', unfavorite: 'Quitar favorito',
    chosen: 'Seleccionado', available: '8 personajes', change: 'Cambia de coach cuando quieras',
    sessionNote: 'Tras iniciar sesión y dar consentimiento, se ofrece diálogo de texto generativo si hay un modelo gratuito con privacidad verificada. Las preguntas guiadas siguen disponibles. La voz bidireccional no está activada.',
    back: 'Sala de coaching', human: 'Profesionales reales', privacy: 'La búsqueda queda en este navegador; solo se guardan los ID de favoritos en el dispositivo.',
    safety: 'Una pregunta por turno · Sin diagnósticos · Tú decides',
  },
}
const topicText = {
  en: { clarity: 'Clarity', resilience: 'Calm & support', relationships: 'Relationships', career: 'Career & business',
    meaning: 'Meaning', habits: 'Habits', creativity: 'Creativity', decisions: 'Decisions' },
  ru: { clarity: 'Ясность', resilience: 'Опора и спокойствие', relationships: 'Отношения', career: 'Карьера и бизнес',
    meaning: 'Смысл', habits: 'Привычки', creativity: 'Творчество', decisions: 'Решения' },
  es: { clarity: 'Claridad', resilience: 'Calma y apoyo', relationships: 'Relaciones', career: 'Carrera y negocio',
    meaning: 'Sentido', habits: 'Hábitos', creativity: 'Creatividad', decisions: 'Decisiones' },
}

const designCopy = {
  en: {
    lead: 'Choose your coach for a personal guided session',
    filters: 'Filters', allTopics: 'All topics', recommended: 'Suggested', favorites: 'Favorites',
    antistress: 'Calm', goals: 'Goals', growth: 'Growth', habits: 'Habits',
    energy: 'Support & energy', love: 'Relationships & love', balance: 'Clarity & balance', meaning: 'Growth & meaning',
    pace: 'Coaching pace', anyPace: 'Any pace', startNow: 'Start session',
    aiPersona: 'Fictional AI coach', methods: 'Methods', language: 'EN · RU · ES',
    showProfile: 'About coach', clear: 'Clear filters',
  },
  ru: {
    lead: 'Выбери своего коуча для личной сессии',
    filters: 'Фильтры', allTopics: 'Все темы', recommended: 'Подходящие', favorites: 'Избранные',
    antistress: 'Антистресс', goals: 'Цели и карьера', growth: 'Саморазвитие', habits: 'Привычки',
    energy: 'Поддержка и энергия', love: 'Отношения и любовь', balance: 'Ясность и баланс', meaning: 'Развитие и смысл',
    pace: 'Темп беседы', anyPace: 'Любой темп', startNow: 'Начать сессию',
    aiPersona: 'Вымышленный AI-коуч', methods: 'Методики', language: 'RU · EN · ES',
    showProfile: 'О коуче', clear: 'Сбросить фильтры',
  },
  es: {
    lead: 'Elige a tu coach para una sesión personal guiada',
    filters: 'Filtros', allTopics: 'Todos los temas', recommended: 'Sugeridos', favorites: 'Favoritos',
    antistress: 'Antiestrés', goals: 'Metas y carrera', growth: 'Crecimiento', habits: 'Hábitos',
    energy: 'Apoyo y energía', love: 'Relaciones y amor', balance: 'Claridad y equilibrio', meaning: 'Sentido y crecimiento',
    pace: 'Ritmo', anyPace: 'Cualquier ritmo', startNow: 'Iniciar sesión',
    aiPersona: 'Coach IA ficticio', methods: 'Métodos', language: 'ES · EN · RU',
    showProfile: 'Ver perfil', clear: 'Borrar filtros',
  },
}
const miraCopy = {
  en: {
    tagline: 'Your AI consultant for clarity, balance and growth',
    hello: "Hi! I'm", subtitle: "Let's talk about what matters to you.",
    badge: 'AI Coach · Guided', bubble: 'You can talk, ask questions, or find practical guidance right now.',
    preview: 'Read introduction', talk: 'Talk now with', choose: 'Choose another coach', all: 'All coaches',
    topic: 'Or start with a topic:', review: 'Free situation review',
    hint: 'Get a hint & new perspective', plan: 'Create your plan',
    intro: 'A gentle introduction to your coach', nav: 'Language and help',
    back: 'Back to Mira', browse: 'Choose your coach for a personal AI session',
  },
  ru: {
    tagline: 'Ваш AI-консультант для ясности, баланса и развития',
    hello: 'Привет! Я', subtitle: 'Помогу разобраться в том, что важно для вас.',
    badge: 'AI-коуч · Практика', bubble: 'Вы можете задать вопрос, обсудить ситуацию или найти следующий практический шаг.',
    preview: 'Прочитать приветствие', talk: 'Поговорить с', choose: 'Выберите другого коуча', all: 'Все коучи',
    topic: 'Или начните с темы:', review: 'Бесплатный разбор ситуации',
    hint: 'Подсказка и новый взгляд', plan: 'Создать свой план',
    intro: 'Приветствие выбранного коуча', nav: 'Язык и помощь',
    back: 'Вернуться к Мире', browse: 'Выберите коуча для персональной AI-сессии',
  },
  es: {
    tagline: 'Tu consultor de IA para claridad, equilibrio y crecimiento',
    hello: '¡Hola! Soy', subtitle: 'Hablemos de lo que es importante para ti.',
    badge: 'Coach IA · Guiado', bubble: 'Puedes hacer preguntas, reflexionar y encontrar un próximo paso práctico.',
    preview: 'Leer presentación', talk: 'Hablar con', choose: 'Elige otro coach', all: 'Todos los coaches',
    topic: 'O empieza con un tema:', review: 'Revisión gratuita de tu situación',
    hint: 'Una pista y otra perspectiva', plan: 'Crea tu plan',
    intro: 'Presentación del coach', nav: 'Idioma y ayuda',
    back: 'Volver a Mira', browse: 'Elige tu coach para una sesión personal de IA',
  },
}
const topicGlyphs = { all: '▦', resilience: 'ϟ', relationships: '♡', career: '◇', meaning: '✿', habits: '✧' }
const visualTopics = [
  { id: 'all', image: 'lotus' },
  { id: 'resilience', image: 'calm' },
  { id: 'relationships', image: 'love' },
  { id: 'career', image: 'goals' },
  { id: 'meaning', image: 'growth' },
  { id: 'habits', image: 'habits' },
]
const categoryIcon = {
  resilience: Zap, relationships: Heart, clarity: Flower2, meaning: Leaf,
}

const FAVORITES_KEY = 'hh-my-coach-favorites-v1'
const normalizeSearch = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/ё/g, 'е').trim()

export default function MyCoachCatalog({ locale = 'en' }) {
  const lang = words[locale] ? locale : 'en'
  const t = words[lang]
  const categories = topicText[lang]
  const d = designCopy[lang]
  const hw = miraCopy[lang]
  const [search, setSearch] = useState('')
  const [topic, setTopic] = useState('all')
  const [onlyFavorites, setOnlyFavorites] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  const [showMenu, setShowMenu] = useState(false)
  const [sortBy, setSortBy] = useState('all')
  const [paceFilter, setPaceFilter] = useState('any')
  const [favorites, setFavorites] = useState([])
  const [favoritesReady, setFavoritesReady] = useState(false)
  const [selectedId, setSelectedId] = useState('mira')
  const [expandedId, setExpandedId] = useState(null)
  const [settings, setSettings] = useState(() => normalizeCoachSettings('mira'))
  useEffect(() => {
    try {
      const ids = JSON.parse(window.localStorage.getItem(FAVORITES_KEY) || '[]')
      if (Array.isArray(ids)) setFavorites(ids.filter(id => typeof id === 'string' && getCoachPersona(id)).slice(0, 8))
    } catch { /* Private browsing may disable localStorage: favorites remain in memory. */ }
    setFavoritesReady(true)
  }, [])
  useEffect(() => {
    if (!favoritesReady) return
    try { window.localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites)) }
    catch { /* Local choice stays usable even when storage is unavailable. */ }
  }, [favorites, favoritesReady])
  const list = useMemo(() => COACH_PERSONAS.filter(persona => {
    if (topic !== 'all' && persona.topic !== topic && !persona.related.includes(topic)) return false
    if (onlyFavorites && !favorites.includes(persona.id)) return false
    if (paceFilter !== 'any' && persona.defaults.pace !== paceFilter) return false
    if (!search.trim()) return true
    const haystack = [
      persona.id, persona.name[lang], persona.role[lang], persona.description[lang],
      persona.suitable[lang], categories[persona.topic],
      ...persona.related.map(id => categories[id]), ...persona.methods,
    ].join(' ')
    return normalizeSearch(haystack).includes(normalizeSearch(search))
  }), [lang, topic, onlyFavorites, favorites, search, categories, paceFilter])
  const visibleList = useMemo(() => sortBy === 'suggested' ? [...list].sort((a, b) => {
    const score = persona => (persona.topic === topic ? 3 : persona.related.includes(topic) ? 2 : 0)
    return score(b) - score(a)
  }) : list, [list, sortBy, topic])
  const selected = getCoachPersona(selectedId) || COACH_PERSONAS[0]
  const safeSettings = normalizeCoachSettings(selected.id, settings)
  const updateSettings = (field, value) => setSettings(previous =>
    normalizeCoachSettings(selected.id, { ...previous, [field]: value }))
  const startHref = coachSessionHref(lang, selected.id, safeSettings)
  const selectedName = localCoachText(selected.name, lang)
  const followupPreview = coachStagePrompt(selected.id, 'goal', lang, safeSettings)
  const choose = (id) => {
    setExpandedId(open => open === id ? null : id)
    if (id !== selectedId) {
      setSelectedId(id)
      setSettings(normalizeCoachSettings(id))
    }
  }
  const toggleFavorite = id => setFavorites(current =>
    current.includes(id) ? current.filter(value => value !== id) : [...current, id].slice(-8))
  return <main className={styles.root} data-my-coach-catalog lang={lang}>
    <div className={styles.frame}>
      <header className={[styles.brandHeader, heroStyles.stickyHeader].join(' ')}>
        <Link href={'/' + lang} className={styles.brand} aria-label="Holistic House">
          <span className={styles.brandMark} aria-hidden="true" />
          <span>Holistic House<sup>®</sup></span>
        </Link>
        <nav className={[styles.brandActions, heroStyles.brandControls].join(' ')} aria-label={hw.nav}>
          <label className={heroStyles.localePill}>
            <span aria-hidden="true">◎</span>
            <span className={heroStyles.srOnly}>{hw.nav}</span>
            <select value={lang} onChange={event => { window.location.assign('/' + event.target.value + '/my-coach') }}>
              <option value="en">EN</option><option value="ru">RU</option><option value="es">ES</option>
            </select>
          </label>
          <button type="button" className={heroStyles.helpPill} aria-label="iHelp"
            onClick={() => {
              const nativeHelp = document.querySelector('[data-hh-ihelp-trigger]')
              if (nativeHelp instanceof HTMLElement) nativeHelp.click()
              else window.location.assign('/' + lang + '/contact')
            }}><span aria-hidden="true">ⓘ</span> iHelp</button>
          <HeaderCreditProfile locale={lang} />
        </nav>
      </header>

      <section className={[styles.hero, heroStyles.landing].join(' ')} id="my-coach-top" aria-labelledby="my-coach-heading">
        <div className={[styles.heroCopy, heroStyles.heroHeading].join(' ')}>
          <h1 id="my-coach-heading">My Coach</h1>
          <p className={heroStyles.tagline}>{hw.tagline}</p>
        </div>
        <div className={heroStyles.heroStage} data-my-coach-hero={selected.id}>
          <div className={heroStyles.heroPortrait} data-persona={selected.id} aria-hidden="true" />
          <div className={heroStyles.stageTop}>
            <span className={heroStyles.liveLabel}><span className={heroStyles.liveDot} />{hw.badge}</span>
          </div>
          <div className={heroStyles.stageGreeting}>
            <h2>{hw.hello} {selectedName}</h2>
            <p>{hw.subtitle}</p>
          </div>
          <div className={heroStyles.stageActions}>
            {selected.id === 'mira'
              ? <MyCoachExpressStart locale={lang} embedded data-my-coach-hero-start={selected.id} />
              : <Link className={heroStyles.talkButton} href={startHref} prefetch={false}
                  data-my-coach-hero-start={selected.id}>♩ {hw.talk} {selectedName} <ArrowRight size={17} aria-hidden="true" /></Link>}
          </div>
          <div className={heroStyles.stageTopics}>
            <span>{hw.topic}</span>
            <div className={[styles.quickTopics, heroStyles.quickTopics].join(' ')} role="group" aria-label={t.topics}>
              {[
                { id: 'resilience', label: d.energy }, { id: 'relationships', label: d.love },
                { id: 'career', label: d.goals }, { id: 'meaning', label: d.meaning },
              ].map(item => {
                const Icon = categoryIcon[item.id] || Sparkles
                return <button type="button" key={item.id} aria-pressed={topic === item.id}
                  className={topic === item.id ? styles.quickTopicActive : styles.quickTopic}
                  onClick={() => { setTopic(item.id); document.getElementById('all-coaches')?.scrollIntoView({behavior:'smooth',block:'start'}) }}>
                  <Icon size={20} strokeWidth={1.7} aria-hidden="true" /><span>{item.label}</span>
                </button>
              })}
            </div>
          </div>
        </div>
        <div className={heroStyles.coachRailHeading}>
          <h2>{hw.choose}</h2>
          <a href="#all-coaches">{hw.all} <ArrowRight size={18} aria-hidden="true" /></a>
        </div>
        <div className={heroStyles.coachRail} role="group" aria-label={hw.choose}>
          {['mira','alex','sofia','max'].map(id => {
            const persona = getCoachPersona(id)
            if (!persona) return null
            return <button type="button" key={id} className={heroStyles.railCard}
              aria-pressed={selected.id === id}
              onClick={() => { setSelectedId(id); setSettings(normalizeCoachSettings(id)) }}>
              <span className={heroStyles.railPortrait} data-persona={id} aria-hidden="true">
              </span>
              <strong>{localCoachText(persona.name, lang)}</strong>
              <small>{localCoachText(persona.role, lang)}</small>
            </button>
          })}
        </div>
        <div className={heroStyles.benefitTiles}>
          <Link href={'/' + lang + '/holistic-support/mobile'}><BookOpen size={27} aria-hidden="true" /><strong>{hw.review}</strong></Link>
          <a href="#all-coaches"><Sparkles size={27} aria-hidden="true" /><strong>{hw.hint}</strong></a>
          <Link href={startHref} prefetch={false}><Leaf size={27} aria-hidden="true" /><strong>{hw.plan}</strong></Link>
        </div>
      </section>
      <section className={heroStyles.directoryHeading} id="all-coaches" aria-label={hw.browse}>
        <a href="#my-coach-top" className={heroStyles.directoryBack} aria-label={hw.back}>‹</a>
        <div><h2>My Coach</h2><p>{hw.browse}</p></div>
      </section>

      <section className={styles.discover} aria-label={t.topics}>
        <div className={[styles.visualTopics, heroStyles.directoryTopics].join(' ')} role="group" aria-label={d.allTopics}>
          {visualTopics.map(item => {
            const label = item.id === 'all' ? d.allTopics : item.id === 'resilience' ? d.antistress
              : item.id === 'career' ? d.goals : item.id === 'meaning' ? d.growth
              : item.id === 'habits' ? d.habits : categories[item.id]
            return <button type="button" key={item.id} aria-pressed={topic === item.id}
              className={topic === item.id ? styles.visualTopicActive : styles.visualTopic}
              onClick={() => setTopic(item.id)}>
              <span className={[styles.topicPicture, heroStyles.topicGlyph].join(' ')} aria-hidden="true">{topicGlyphs[item.id]}</span>
              <span>{label}</span>
            </button>
          })}
        </div>
        <div className={styles.controlTop}>
          <label className={styles.search}>
            <Search size={20} aria-hidden="true" />
            <span className={styles.srOnly}>{t.search}</span>
            <input type="search" value={search} onChange={event => setSearch(event.target.value)}
              placeholder={t.searchPlaceholder} autoComplete="off" maxLength={90} />
          </label>
          <button type="button" className={showFilters ? styles.filtersActive : styles.filtersButton}
            aria-pressed={showFilters} aria-expanded={showFilters} aria-controls="my-coach-filter-panel"
            onClick={() => setShowFilters(value => !value)}>
            <SlidersHorizontal size={20} aria-hidden="true" /> <span>{d.filters}</span>
            {topic !== 'all' || paceFilter !== 'any' ? <i aria-hidden="true" className={styles.filterDot} /> : null}
          </button>
        </div>
        <div className={styles.typePills} role="group" aria-label={t.topics}>
          <button type="button" aria-pressed={sortBy === 'all' && !onlyFavorites}
            className={sortBy === 'all' && !onlyFavorites ? styles.pillActive : styles.pill}
            onClick={() => { setSortBy('all'); setOnlyFavorites(false) }}><Users size={17} aria-hidden="true" />{t.all}</button>
          <button type="button" aria-pressed={sortBy === 'suggested' && !onlyFavorites}
            className={sortBy === 'suggested' && !onlyFavorites ? styles.pillActive : styles.pill}
            onClick={() => { setSortBy('suggested'); setOnlyFavorites(false) }}><Sparkles size={17} aria-hidden="true" />{d.recommended}</button>
          <button type="button" aria-pressed={onlyFavorites}
            className={onlyFavorites ? styles.pillActive : styles.pill}
            onClick={() => setOnlyFavorites(value => !value)}><Heart size={17} aria-hidden="true" />{t.favorites}</button>
        </div>
        <div id="my-coach-filter-panel" className={showFilters ? styles.filterPanel : styles.filterPanelHidden}>
          <div className={styles.topicRail} role="group" aria-label={t.topics}>
            <button type="button" aria-pressed={topic === 'all'} className={topic === 'all' ? styles.topicActive : styles.topicChip}
              onClick={() => setTopic('all')}>{d.allTopics}</button>
            {COACH_TOPICS.map(key => <button type="button" key={key} aria-pressed={topic === key}
              className={topic === key ? styles.topicActive : styles.topicChip} onClick={() => setTopic(key)}>{categories[key]}</button>)}
          </div>
          <label className={styles.paceFilter}><span>{d.pace}</span>
            <select value={paceFilter} onChange={e => setPaceFilter(e.target.value)}>
              <option value="any">{d.anyPace}</option>
              <option value="slow">{t.slow}</option>
              <option value="balanced">{t.balanced}</option>
              <option value="fast">{t.fast}</option>
            </select>
          </label>
          <button type="button" className={styles.clearFilters}
            onClick={() => { setTopic('all'); setSearch(''); setPaceFilter('any'); setOnlyFavorites(false); setSortBy('all') }}>
            <RotateCcw size={15} aria-hidden="true" />{d.clear}</button>
        </div>
        {visibleList.length ? <div className={styles.cardGrid}>
          {visibleList.map(persona => {
            const isSelected = selected.id === persona.id
            const isExpanded = expandedId === persona.id
            const isFavorite = favorites.includes(persona.id)
            return <article key={persona.id} className={isSelected ? styles.cardSelected : styles.card}
              data-my-coach-card={persona.id}>
              <div className={styles.cardPortrait} data-persona={persona.id} aria-hidden="true">
                <span className={styles.avatarSymbol} data-palette={persona.palette}>{persona.symbol}</span>
              </div>
              <div className={styles.cardBody}>
                <h2>{localCoachText(persona.name, lang)}</h2>
                <p className={styles.role}>{localCoachText(persona.role, lang)}</p>
                <div className={styles.cardTags}>
                  <span>{categories[persona.topic]}</span>
                  {persona.related.slice(0, 2).map(tag => <span key={tag}>{categories[tag]}</span>)}
                </div>
                <p className={styles.cardMeta}><Sparkles size={13} aria-hidden="true" /> {d.aiPersona} <span aria-hidden="true">·</span> {d.language}</p>
                <div className={styles.cardFooter}>
                  <button type="button" className={styles.viewProfile} onClick={() => choose(persona.id)}
                    aria-expanded={isExpanded} aria-controls={'my-coach-profile-' + persona.id}>{d.showProfile}</button>
                  <Link className={styles.cardButton}
                    href={coachSessionHref(lang, persona.id, normalizeCoachSettings(persona.id))}
                    prefetch={false}>{d.startNow}<ArrowRight size={16} aria-hidden="true" /></Link>
                </div>
              </div>
              <button type="button" className={styles.heart}
                onClick={() => toggleFavorite(persona.id)}
                aria-label={(isFavorite ? t.unfavorite : t.favorite) + ': ' + localCoachText(persona.name, lang)}
                aria-pressed={isFavorite}>
                <Heart size={21} fill={isFavorite ? 'currentColor' : 'none'} aria-hidden="true" />
              </button>
              {isExpanded && (
                <section id={'my-coach-profile-' + persona.id} className={styles.profile} aria-label={t.profile}
        data-my-coach-selected={selected.id}>
        <div className={styles.profileHead}>
          <div className={styles.avatarLarge} data-persona={selected.id} data-palette={selected.palette} aria-hidden="true">{selected.symbol}</div>
          <div>
            <span className={styles.profileEyebrow}>{t.profile}</span>
            <h2>{selectedName}</h2>
            <p>{localCoachText(selected.role, lang)}</p>
          </div>
        </div>
        <p className={styles.profileAbout}>{localCoachText(selected.description, lang)}</p>
        <div className={styles.profileFacts}>
          <div><h3>{t.suited}</h3><p>{localCoachText(selected.suitable, lang)}</p></div>
          <div><h3>{t.about}</h3><p>{localCoachText(selected.approach, lang)}</p></div>
          <div><h3>{t.method}</h3><p>{selected.methods.join(' · ')}</p></div>
        </div>
        <div className={styles.opening}>
          <span>{t.example}</span>
          <p>“{localCoachText(selected.opening, lang)}”</p>
        </div>
        <div className={styles.settings}>
          <div className={styles.settingsHeading}><SlidersHorizontal size={19} aria-hidden="true" />
            <div><h3>{t.adjust}</h3><p>{t.adjustNote}</p></div></div>
          <div className={styles.settingsGrid}>
            {['warmth', 'directness'].map(field => <label className={styles.range} key={field}>
              <span><strong>{t[field]}</strong><output>{safeSettings[field]} / 5</output></span>
              <input type="range" min="1" max="5" step="1" value={safeSettings[field]}
                onChange={event => updateSettings(field, Number(event.target.value))} />
              <small><span>{t.less}</span><span>{t.more}</span></small>
            </label>)}
            <label className={styles.selectField}><strong>{t.pace}</strong>
              <select value={safeSettings.pace} onChange={event => updateSettings('pace', event.target.value)}>
                <option value="slow">{t.slow}</option><option value="balanced">{t.balanced}</option><option value="fast">{t.fast}</option>
              </select></label>
            <label className={styles.selectField}><strong>{t.depth}</strong>
              <select value={safeSettings.depth} onChange={event => updateSettings('depth', event.target.value)}>
                <option value="light">{t.light}</option><option value="balanced">{t.balanced}</option><option value="deep">{t.deep}</option>
              </select></label>
          </div>
          <button type="button" className={styles.reset} onClick={() => setSettings(normalizeCoachSettings(selected.id))}>
            <RotateCcw size={16} aria-hidden="true" /> {t.reset}</button>
        </div>
        <div className={styles.preview}>
          <span>{t.preview}</span><p>{followupPreview}</p>
        </div>
        <Link className={styles.primary} href={startHref} prefetch={false}
          data-my-coach-start={selected.id}>{t.start}<ArrowRight size={19} aria-hidden="true" /></Link>
        <p className={styles.sessionNote}>{t.sessionNote}</p>
        <p className={styles.privacy}>{t.privacy}</p>
      </section>
              )}
            </article>
          })}
        </div> : <div className={styles.empty}>
          <p>{t.noResults}</p>
          <button type="button" onClick={() => { setSearch(''); setTopic('all'); setOnlyFavorites(false); setPaceFilter('any') }}>{t.all}</button>
        </div>}
        <p className={styles.disclosure} role="note"><ShieldCheck size={15} aria-hidden="true" />{t.aiNotice}</p>
      </section>
      
      <nav className={styles.secondaryNav} aria-label={t.change}>
        <Link href={'/' + lang + '/coaching'}><BookOpen size={17} aria-hidden="true" /> {t.back}</Link>
        <Link href={'/' + lang + '/masters'}><Users size={17} aria-hidden="true" /> {t.human}</Link>
      </nav>
    </div>
  </main>
}
