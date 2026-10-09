'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Activity, Brain, Compass, Heart, Moon, Shield, Sparkles, Zap } from 'lucide-react'
import { assessmentHistoryGroups, interpretConcern, nextPersonalRecommendation } from '@/lib/assessments/personal-guidance'
import { TEST_RECOMMENDATION_FOCUS, TEST_STYLE_FILTERS, TEST_LENGTH_FILTERS } from '@/lib/assessments/test-recommendations'
import { MONITOR_AREAS } from '@/data/assessments/mind-body-monitor-registry'
import { TEST_EXPLORER_AXES, TEST_EXPLORER_AXIS_LABELS, TEST_EXPLORER_DETAIL_TOPICS, buildExplorerEntries, buildStarterBattery, coverageForSelection, coverageForFilters, filterExplorerEntries, rankExplorerEntries } from '@/lib/assessments/test-explorer'
import { TestExplorerVisual } from './test-explorer-visual'
import { buildPsychPortrait } from '@/lib/assessments/psych-portrait'
import styles from './test-explorer.module.css'

const COPY = {
  en: { kicker: 'Mind–Body Monitor', title: 'Build your test set', intro: 'Choose the concerns you want to monitor. Matching tests and analysis areas update as you select them.', available: 'Available now', full: 'Full database', themes: 'Filter tests by your concerns', style: 'Style', length: 'Length', depth: 'Preferred depth', area: 'Area', free: 'Free only', search: 'Search the database', sort: 'Sort', recommended: 'Recommended first', shortest: 'Shortest first', deepest: 'Deepest first', alphabetic: 'A–Z', suggested: 'Select suggested set', clear: 'Clear', selected: 'selected', questions: 'questions', minutes: 'min', axes: 'axes', focused: 'Focused', balanced: 'Balanced', broad: 'Broad', start: 'Start free testing', choose: 'Choose at least one test', availableStatus: 'Available', metadata: 'Research reference', details: 'Details', warning: 'More than 8 tests or 30 minutes may be hard to complete in one sitting.', privacy: 'Selections and filters stay only in this page until you explicitly consent to start.', relevance: 'Selection match', matchNote: 'This reflects fit with your selected topics and format, not a medical probability.', best: 'Best match', complements: 'Complements your set', filters: 'More filters', selectedThemes: 'topics selected', filterClear: 'Reset filters', matching: 'matching tests', of: 'out of', kept: 'selected tests kept visible', noMatches: 'No tests match these filters. Remove a topic or filter to see more.', topicHint: 'These topics filter the list immediately; select tests below to build your monitoring battery.', topicPreview: 'Axes related to your chosen topics', testCoverage: 'Coverage of selected tests', totalAvailable: 'available to start' },
  ru: { kicker: 'Монитор состояния', title: 'Соберите свой набор тестов', intro: 'Выберите проблемы, которые хотите отслеживать. Список тестов и оси анализа меняются сразу.', available: 'Доступно сейчас', full: 'Вся база', themes: 'Фильтр тестов по проблемам', style: 'Стиль', length: 'Длина', depth: 'Желаемая глубина', area: 'Область', free: 'Только бесплатные', search: 'Поиск по базе', sort: 'Сортировка', recommended: 'Сначала рекомендуемые', shortest: 'Сначала короткие', deepest: 'Сначала глубокие', alphabetic: 'А–Я', suggested: 'Выбрать оптимальный набор', clear: 'Очистить', selected: 'выбрано', questions: 'вопросов', minutes: 'мин', axes: 'осей', focused: 'Фокусный', balanced: 'Сбалансированный', broad: 'Широкий', start: 'Пройти тестирование бесплатно', choose: 'Выберите хотя бы один тест', availableStatus: 'Доступен', metadata: 'Исследовательская карточка', details: 'Подробнее', warning: 'Больше 8 тестов или 30 минут может быть сложно пройти за один раз.', privacy: 'Выбор и фильтры остаются только на этой странице, пока вы явно не согласитесь начать.', relevance: 'Релевантность подбора', matchNote: 'Это соответствие выбранным темам и формату, а не медицинская вероятность.', best: 'Лучшее совпадение', complements: 'Дополняет набор', filters: 'Дополнительные фильтры', selectedThemes: 'тем выбрано', filterClear: 'Сбросить фильтры', matching: 'подходящих тестов', of: 'из', kept: 'выбранных тестов остаются видны', noMatches: 'По этим фильтрам тестов нет. Уберите тему или другой фильтр.', topicHint: 'Темы сразу отбирают тесты. Отметьте нужные тесты ниже, чтобы создать набор для мониторинга.', topicPreview: 'Оси по выбранным темам', testCoverage: 'Покрытие выбранных тестов', totalAvailable: 'доступно для прохождения' },
  es: { kicker: 'Monitor mente–cuerpo', title: 'Prepara tu selección de pruebas', intro: 'Elige los temas y el formato que más te interesen. Los cuestionarios se realizan en su idioma disponible y los resultados se muestran en la aplicación en inglés.', available: 'Disponibles ahora', full: 'Base completa', themes: 'Filtrar pruebas por temas', style: 'Tipo', length: 'Duración', depth: 'Profundidad deseada', area: 'Área', free: 'Solo gratuitas', search: 'Buscar pruebas', sort: 'Ordenar', recommended: 'Recomendadas primero', shortest: 'Más breves primero', deepest: 'Más detalladas primero', alphabetic: 'A–Z', suggested: 'Elegir una selección recomendada', clear: 'Limpiar', selected: 'seleccionadas', questions: 'preguntas', minutes: 'min', axes: 'ejes', focused: 'Enfocada', balanced: 'Equilibrada', broad: 'Amplia', start: 'Comenzar pruebas gratuitas', choose: 'Elige al menos una prueba', availableStatus: 'Disponible', metadata: 'Referencia de investigación', details: 'Detalles', warning: 'Más de 8 pruebas o 30 minutos pueden resultar difíciles de completar en una sola sesión.', privacy: 'Tus selecciones no se guardan hasta que aceptas expresamente iniciar las pruebas.', relevance: 'Coincidencia', matchNote: 'Muestra la afinidad con los temas elegidos, no una probabilidad médica.', best: 'Mejor coincidencia', complements: 'Complementa tu selección', filters: 'Más filtros', selectedThemes: 'temas elegidos', filterClear: 'Limpiar filtros', matching: 'pruebas encontradas', of: 'de', kept: 'pruebas elegidas visibles', noMatches: 'No hay pruebas para estos filtros. Cambia un tema o filtro.', topicHint: 'Los temas filtran al instante; elige las pruebas para construir tu seguimiento.', topicPreview: 'Ejes de los temas elegidos', testCoverage: 'Cobertura de pruebas elegidas', totalAvailable: 'disponibles para empezar' },
}

const ADVANCED_COPY = {
  en: { subtitle: 'Refine your choice', hint: 'Combine filters to find questionnaires that fit your topic, time and goals. Numbers update immediately.', detail: 'Specific concerns', scales: 'Scales to monitor', time: 'Time available', language: 'Questionnaire language', tracking: 'Testing goal', any: 'Any', two: 'Up to 2 min', five: 'Up to 5 min', ten: 'Up to 10 min', bilingual: 'English + Russian', english: 'English original', repeat: 'Track changes over time', baseline: 'One-time / baseline', about: 'These are filters for choosing questionnaires, not assessment results.', filterCount: 'active criteria' },
  ru: { subtitle: 'Уточните подбор', hint: 'Комбинируйте фильтры по запросу, времени и цели. Количество тестов меняется сразу.', detail: 'Конкретные проблемы', scales: 'Измеряемые шкалы', time: 'Время на прохождение', language: 'Язык вопросов', tracking: 'Цель тестирования', any: 'Любой', two: 'До 2 минут', five: 'До 5 минут', ten: 'До 10 минут', bilingual: 'Английский + русский', english: 'Английский оригинал', repeat: 'Отслеживать изменения', baseline: 'Разовое / базовый профиль', about: 'Это параметры подбора опросников, не результаты диагностики.', filterCount: 'активных параметров' },
  es: { subtitle: 'Afinar tu elección', hint: 'Combina criterios por tema, tiempo y objetivo. El número se actualiza al instante.', detail: 'Temas específicos', scales: 'Escalas a seguir', time: 'Tiempo disponible', language: 'Idioma del cuestionario', tracking: 'Objetivo', any: 'Cualquiera', two: 'Hasta 2 min', five: 'Hasta 5 min', ten: 'Hasta 10 min', bilingual: 'Inglés y ruso', english: 'Original en inglés', repeat: 'Seguir la evolución', baseline: 'Una vez / perfil inicial', about: 'Filtros para elegir pruebas, no resultados clínicos.', filterCount: 'criterios activos' },
}
const QUICK_COPY = {
  en: {
    title: 'Start with a simple check-in',
    intro: 'A short set of questionnaires is ready for you. Start now, or adjust the tests if you prefer.',
    customize: 'Choose my own tests and filters',
    hide: 'Hide test options',
    describe: 'Describe what concerns you (optional)',
    preview: 'Preview the areas covered by these tests',
    showAll: 'Show all matching tests',
    showLess: 'Show fewer tests',
    resetSet: 'Use suggested set',
    summary: 'suggested tests',
    google: 'Continue with Google to create or open your private Cabinet. Tests are for self-reflection, not a diagnosis.',
  },
  ru: {
    title: 'Начните с простого тестирования',
    intro: 'Мы уже подобрали короткий набор тестов. Можно сразу начать или настроить подбор под себя.',
    customize: 'Подобрать свои тесты и фильтры',
    hide: 'Скрыть настройки тестов',
    describe: 'Опишите, что вас беспокоит (необязательно)',
    preview: 'Посмотреть, какие стороны состояния охватывают тесты',
    showAll: 'Показать все подходящие тесты',
    showLess: 'Показать меньше',
    resetSet: 'Вернуть рекомендованный набор',
    summary: 'тестов в подборке',
    google: 'Вход через Google откроет ваш личный кабинет. Тесты предназначены для самонаблюдения, а не диагностики.',
  },
  es: {
    title: 'Empieza con una evaluación sencilla',
    intro: 'Ya tienes una selección breve de cuestionarios. Puedes empezar ahora o personalizarlos.',
    customize: 'Elegir pruebas y filtros',
    hide: 'Ocultar opciones',
    describe: 'Describe tu inquietud (opcional)',
    preview: 'Ver las áreas que cubren las pruebas',
    showAll: 'Mostrar todas las pruebas',
    showLess: 'Mostrar menos',
    resetSet: 'Usar la selección sugerida',
    summary: 'pruebas sugeridas',
    google: 'Continúa con Google para abrir tu espacio privado. Las pruebas son para autoobservación, no diagnósticos.',
  },
}

// First-screen shortcuts mirror familiar hotel-search chips, but use the
// existing questionnaire facets instead of a parallel, disconnected filter.
const QUICK_FOCUS = ['stress', 'anxiety', 'sleep', 'mood', 'body', 'relationships']
const TEST_ART_ICONS = { stress: Zap, anxiety: Brain, mood: Heart, sleep: Moon, energy: Zap, clarity: Sparkles, focus: Brain, relationships: Heart, resource: Shield, self_support: Shield, functioning: Activity, meaning: Compass, body: Activity, personality: Brain }
function TestArtwork({ entry }) {
  const labels = [entry.area, entry.category, ...(entry.analysisAxes || []).map((axis) => axis.key)].map((value) => String(value || '').toLowerCase())
  const theme = labels.find((key) => TEST_ART_ICONS[key]) || 'clarity'
  const Icon = TEST_ART_ICONS[theme]
  return <span className={styles.testArtwork} data-theme={theme} aria-hidden="true"><Icon size={25} strokeWidth={1.85} /><span className={styles.testArtworkOrb} /></span>
}
const QUICK_ICONS = { stress: '⚡', anxiety: '☁', sleep: '☾', mood: '♡', body: '✦', relationships: '♧' }

const toggle = (items, key) => items.includes(key) ? items.filter((item) => item !== key) : [...items, key]
const depthOptions = ['quick', 'balanced', 'deep']

export function TestExplorer({ locale = 'en', audience = 'guest', onStart, activePlan = null, onResume, embedded = false, pastResults = [], draftRuns = [], profileSnapshot = null, onResumeRun, recommendedKey = null, initialPreferences = null }) {
  const c = COPY[locale] || COPY.en
  const advanced = ADVANCED_COPY[locale] || ADVANCED_COPY.en
  const quick = QUICK_COPY[locale] || QUICK_COPY.en
  const [availability, setAvailability] = useState('available')
  const [concern, setConcern] = useState('')
  const [voiceSupported, setVoiceSupported] = useState(false)
  const [listening, setListening] = useState(false)
  const [speechError, setSpeechError] = useState('')
  const [concernMessage, setConcernMessage] = useState('')
  const concernAnalysis = useMemo(() => interpretConcern(concern), [concern])
  const historyGroups = useMemo(() => assessmentHistoryGroups(pastResults, draftRuns, locale), [pastResults, draftRuns, locale])
  const portrait = useMemo(() => audience === 'account' ? buildPsychPortrait(pastResults) : null, [audience, pastResults])
  const historyByKey = useMemo(() => new Map(historyGroups.map((group) => [group.key, group])), [historyGroups])
  const recommendedNext = useMemo(() => audience === 'account' ? nextPersonalRecommendation({ results: pastResults, snapshot: profileSnapshot, locale }) : null, [audience, pastResults, profileSnapshot, locale])
  useEffect(() => { setVoiceSupported(Boolean(window.SpeechRecognition || window.webkitSpeechRecognition)) }, [])
  const applyConcern = () => {
    if (concernAnalysis.urgent) return
    if (!concernAnalysis.focus.length) {
      setConcernMessage(locale === 'ru' ? 'Не удалось однозначно определить тему. Выберите подходящие темы ниже.' : locale === 'es' ? 'No encontramos una categoría clara. Elige los temas manualmente.' : 'No clear topic was found. Please choose a topic below.')
      return
    }
    setFocus(concernAnalysis.focus)
    setAvailability('available')
    setConcernMessage('')
  }
  const dictate = () => {
    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!Recognition || listening) return
    try {
      const recognizer = new Recognition()
      recognizer.lang = locale === 'ru' ? 'ru-RU' : locale === 'es' ? 'es-ES' : 'en-US'
      recognizer.interimResults = false
      recognizer.maxAlternatives = 1
      recognizer.onresult = (event) => { setConcern(String(event.results?.[0]?.[0]?.transcript || '').slice(0, 500)); setConcernMessage('') }
      recognizer.onerror = () => setSpeechError(locale === 'ru' ? 'Речь не распознана. Введите запрос текстом.' : 'Speech unavailable. Please type your concern.')
      recognizer.onend = () => setListening(false)
      setSpeechError('')
      setListening(true)
      recognizer.start()
    } catch { setListening(false); setSpeechError(locale === 'ru' ? 'Микрофон недоступен. Введите запрос текстом.' : 'Microphone unavailable. Please type instead.') }
  }
  const [focus, setFocus] = useState(() => initialPreferences?.focus ?? [])
  const [stylesFilter, setStylesFilter] = useState(() => initialPreferences?.styles ?? [])
  const [lengths, setLengths] = useState(() => initialPreferences?.lengths ?? [])
  const [depth, setDepth] = useState(() => initialPreferences?.depth ?? 'balanced')
  const [areas, setAreas] = useState(() => initialPreferences?.areas ?? [])
  const [details, setDetails] = useState(() => initialPreferences?.details ?? [])
  const [axes, setAxes] = useState(() => initialPreferences?.axes ?? [])
  const [maxMinutes, setMaxMinutes] = useState(() => initialPreferences?.maxMinutes ?? 0)
  const [language, setLanguage] = useState(() => initialPreferences?.language ?? 'any')
  const [tracking, setTracking] = useState(() => initialPreferences?.tracking ?? 'any')
  const [freeOnly, setFreeOnly] = useState(() => initialPreferences?.freeOnly ?? false)
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState('recommended')
  const [selectedKeys, setSelectedKeys] = useState(() => recommendedKey ? [recommendedKey] : [])
  const [axisFilter, setAxisFilter] = useState(null)
  const [actionError, setActionError] = useState(null)
  const [starting, setStarting] = useState(false)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [customizeOpen, setCustomizeOpen] = useState(false)
  const [showAll, setShowAll] = useState(false)
  const entries = useMemo(() => buildExplorerEntries({ locale: locale === 'es' ? 'en' : locale, audience }), [locale, audience])
  // Direct History -> Test selection must also work when the URL changes without remounting.
  useEffect(() => {
    if (recommendedKey && entries.some((entry) => entry.key === recommendedKey && entry.selectable)) setSelectedKeys([recommendedKey])
  }, [recommendedKey, entries])
  const facets = { availability, focus, styles: stylesFilter, lengths, areas, details, axes, maxMinutes, language, tracking, freeOnly, search: query }
  const matching = useMemo(() => filterExplorerEntries(entries, facets), [entries, availability, focus, stylesFilter, lengths, areas, details, axes, maxMinutes, language, tracking, freeOnly, query])
  // Facet counts reflect the whole eligible catalog and every *other* active
  // criterion. Exclude the facet's own current selection (multi-choice OR).
  const detailCandidates = useMemo(() => filterExplorerEntries(entries, { ...facets, details: [] }), [entries, availability, focus, stylesFilter, lengths, areas, axes, maxMinutes, language, tracking, freeOnly, query])
  const areaCandidates = useMemo(() => filterExplorerEntries(entries, { ...facets, areas: [] }), [entries, availability, focus, stylesFilter, lengths, details, axes, maxMinutes, language, tracking, freeOnly, query])
  const axisCandidates = useMemo(() => filterExplorerEntries(entries, { ...facets, axes: [] }), [entries, availability, focus, stylesFilter, lengths, areas, details, maxMinutes, language, tracking, freeOnly, query])
  const detailCounts = useMemo(() => Object.fromEntries(TEST_EXPLORER_DETAIL_TOPICS.map((item) => [item.key, detailCandidates.filter((entry) => entry.topics.includes(item.key)).length])), [detailCandidates])
  const areaCounts = useMemo(() => Object.fromEntries(MONITOR_AREAS.map((item) => [item.key, areaCandidates.filter((entry) => entry.areas?.includes(item.key)).length])), [areaCandidates])
  const axisCounts = useMemo(() => Object.fromEntries(TEST_EXPLORER_AXES.map((key) => [key, axisCandidates.filter((entry) => entry.analysisAxes.some((axis) => axis.key === key)).length])), [axisCandidates])
  // A selected test stays visible even if new filters no longer match it.
  const filtered = useMemo(() => filterExplorerEntries(entries, { ...facets, selectedKeys }), [entries, availability, focus, stylesFilter, lengths, areas, details, axes, maxMinutes, language, tracking, freeOnly, query, selectedKeys])
  const ranked = useMemo(() => rankExplorerEntries(filtered, { focus, details, axes, depth, styles: stylesFilter, lengths, selectedKeys }), [filtered, focus, details, axes, depth, stylesFilter, lengths, selectedKeys])
  // Keep checked tests above the shortened discovery list. Re-ranking after
  // a checkbox change must never make that same checkbox disappear mid-click.
  const visible = useMemo(() => ranked.filter((entry) => !axisFilter || selectedKeys.includes(entry.key) || entry.analysisAxes.some((axis) => axis.key === axisFilter)).sort((a, b) => {
    const aSelected = selectedKeys.includes(a.key), bSelected = selectedKeys.includes(b.key)
    if (aSelected !== bSelected) return aSelected ? -1 : 1
    if (sort === 'shortest') return (a.durationMinutes ?? Infinity) - (b.durationMinutes ?? Infinity)
    if (sort === 'deepest') return (b.durationMinutes ?? 0) - (a.durationMinutes ?? 0)
    if (sort === 'alphabetic') return a.title.localeCompare(b.title, locale)
    return 0
  }), [ranked, sort, locale, axisFilter, selectedKeys])
  const selected = entries.filter((entry) => selectedKeys.includes(entry.key) && entry.selectable)
  const coverage = useMemo(() => coverageForSelection(entries, selectedKeys), [entries, selectedKeys])
  // The start button works without requiring a visitor to select any filters.
  // Use only existing, rights-cleared, startable questionnaires.
  const autoBattery = useMemo(() => buildStarterBattery(
    matching.filter((entry) => !axisFilter || entry.analysisAxes.some((axis) => axis.key === axisFilter)),
    { focus, details, axes, depth, styles: stylesFilter, lengths },
  ), [matching, axisFilter, focus, details, axes, depth, stylesFilter, lengths])
  const activeBattery = selected.length ? selected : autoBattery
  const activeCoverage = selected.length ? coverage : coverageForSelection(entries, autoBattery.map((entry) => entry.key))
  const topicCoverage = useMemo(() => coverageForFilters(entries, { focus, details, axes }), [entries, focus, details, axes])
  const showingCoverage = selectedKeys.length > 0
  const displayedCoverage = showingCoverage ? coverage : topicCoverage
  const matchCount = matching.filter((entry) => !axisFilter || entry.analysisAxes.some((axis) => axis.key === axisFilter)).length
  const appliedFilters = stylesFilter.length + lengths.length + areas.length + details.length + axes.length + (maxMinutes ? 1 : 0) + (language !== 'any' ? 1 : 0) + (tracking !== 'any' ? 1 : 0) + (freeOnly ? 1 : 0) + (query.trim() ? 1 : 0) + (axisFilter ? 1 : 0)
  const questions = activeBattery.reduce((sum, entry) => sum + (entry.questionCount || 0), 0)
  const minutes = activeBattery.reduce((sum, entry) => sum + (entry.durationMinutes || 0), 0)
  const breadth = c[activeCoverage.breadth]
  const chooseSuggested = () => setSelectedKeys(buildStarterBattery(matching.filter((entry) => !axisFilter || entry.analysisAxes.some((axis) => axis.key === axisFilter)), { focus, details, axes, depth, styles: stylesFilter, lengths }).map((entry) => entry.key))
  const resetFilters = () => { setAvailability('available'); setFocus([]); setStylesFilter([]); setLengths([]); setDepth('balanced'); setAreas([]); setDetails([]); setAxes([]); setMaxMinutes(0); setLanguage('any'); setTracking('any'); setFreeOnly(false); setQuery(''); setSort('recommended'); setAxisFilter(null) }
  const toggleSelected = (key) => setSelectedKeys((current) => current.includes(key) ? current.filter((item) => item !== key) : current.length < 12 ? [...current, key] : current)
  const start = async () => {
    if (!activeBattery.length || !onStart || starting) return
    setStarting(true); setActionError(null)
    try { await onStart(activeBattery, {
      focus, details, axes, areas, styles: stylesFilter, lengths,
      depth, maxMinutes, language, tracking, freeOnly,
    }) } catch (error) { setActionError(error) } finally { setStarting(false) }
  }

  return <section className={`${styles.explorer} ${embedded ? styles.embedded : ''}`}>
    <div className={styles.explorerHero}>
    <header className={styles.quickStart}>
      <p className={styles.eyebrow}>{c.kicker}</p>
      <h1>{quick.title}</h1>
      <p className={styles.quickIntro}>{quick.intro}</p>
      {activePlan?.status === 'active' && <button className={styles.resumeButton} type="button" onClick={() => onResume?.(activePlan)}>{locale === 'ru' ? `Продолжить набор: шаг ${activePlan.currentIndex + 1}` : locale === 'es' ? `Continuar selección: paso ${activePlan.currentIndex + 1}` : `Resume set: step ${activePlan.currentIndex + 1}`}</button>}
      <div className={styles.quickActions}>
        <button type="button" className={styles.quickPrimary} disabled={!activeBattery.length || starting || !onStart} onClick={() => start()}>{starting ? '…' : c.start}</button>
        <span>{activeBattery.length} {quick.summary} · {questions} {c.questions} · ~{minutes} {c.minutes}</span>
      </div>
      {actionError && <p role="alert" className={styles.quickError}>{actionError.code || actionError.message}</p>}
    </header>
    <aside className={styles.heroPortrait} aria-label={locale === 'ru' ? 'Визуальная модель психического портрета' : locale === 'es' ? 'Vista previa del retrato' : 'Psychological portrait preview'}>
      <TestExplorerVisual compact locale={locale} coverage={displayedCoverage} mode={showingCoverage ? 'selected' : 'topics'} topicCount={focus.length} selectedCount={selectedKeys.length} portrait={portrait?.measuredCount ? portrait : null} axisFilter={axisFilter} onAxisFilter={setAxisFilter} />
      <p className={styles.heroPortraitNote}>{portrait?.measuredCount ? (locale === 'ru' ? 'Реальные показатели из ваших сохранённых тестов.' : 'Measured results from your completed tests.') : (locale === 'ru' ? 'Подсвеченные зоны показывают выбор тем. Реальные шкалы появятся после тестирования.' : locale === 'es' ? 'Las áreas resaltadas muestran temas, no resultados.' : 'Highlighted areas show topics, not test results. Your measured rays appear after testing.')}</p>
    </aside>
    <div className={styles.quickDiscovery}>
      <div className={styles.quickFilters} aria-label={locale === 'ru' ? 'Быстрый подбор тестов' : locale === 'es' ? 'Filtros rápidos' : 'Quick test filters'}>
        <div className={styles.quickFiltersHeader}>
          <strong>{locale === 'ru' ? 'Что вас интересует?' : locale === 'es' ? '¿Qué te interesa?' : 'What would you like to explore?'}</strong>
          <span role="status" aria-live="polite"><b>{matchCount}</b> {c.matching}</span>
        </div>
        <div className={styles.quickFilterChips} role="group" aria-label={c.themes}>
          {QUICK_FOCUS.map((key) => {
            const item = TEST_RECOMMENDATION_FOCUS.find((topic) => topic.key === key)
            if (!item) return null
            const checked = focus.includes(key)
            return <button key={key} type="button" aria-label={`${locale === 'ru' ? 'Быстрый фильтр' : locale === 'es' ? 'Filtro rápido' : 'Quick filter'}: ${item.label[locale] || item.label.en}`} aria-pressed={checked} onClick={() => setFocus((current) => toggle(current, key))}><span className={styles.quickChipIcon} aria-hidden="true">{checked ? '✓' : QUICK_ICONS[key]}</span><span>{item.label[locale] || item.label.en}</span></button>
          })}
        </div>
        <div className={styles.quickFilterExtras}>
          <button type="button" aria-pressed={maxMinutes === 5} onClick={() => setMaxMinutes((current) => current === 5 ? 0 : 5)}>{locale === 'ru' ? 'До 5 минут' : locale === 'es' ? 'Hasta 5 min' : 'Under 5 min'}</button>
          <button type="button" aria-pressed={stylesFilter.includes('professional')} onClick={() => setStylesFilter((current) => current.includes('professional') ? current.filter((key) => key !== 'professional') : ['professional'])}>{locale === 'ru' ? 'Профессиональные' : locale === 'es' ? 'Profesionales' : 'Professional'}</button>
          {(focus.length > 0 || appliedFilters > 0) && <button className={styles.quickFilterReset} type="button" onClick={resetFilters}>{locale === 'ru' ? 'Сбросить всё ×' : locale === 'es' ? 'Borrar todo ×' : 'Clear all ×'}</button>}
        </div>
      </div>
      <div className={styles.quickDiscoveryFooter}>
        <button type="button" className={styles.customizeButton} aria-expanded={customizeOpen} aria-controls="hh-test-customizer" onClick={() => setCustomizeOpen((open) => !open)}>{customizeOpen ? '− ' + quick.hide : '⚙ ' + quick.customize}</button>
        <p className={styles.quickPrivacy}>{quick.google}</p>
      </div>
    </div>
    </div>
    <div id="hh-test-customizer" className={styles.customizer} hidden={!customizeOpen}>
      <details className={styles.problemDetails}>
        <summary>{quick.describe}</summary>
        <section className={styles.concernPanel} aria-labelledby="hh-concern-title">
      <div><p className={styles.eyebrow}>{locale === 'ru' ? 'Подбор по вашей ситуации' : locale === 'es' ? 'Encontrar pruebas por tu situación' : 'Find tests for your situation'}</p>
        <h2 id="hh-concern-title">{locale === 'ru' ? 'Расскажите, что вас беспокоит' : locale === 'es' ? 'Describe qué te preocupa' : 'What would you like to understand?'}</h2>
        <p>{locale === 'ru' ? 'Напишите своими словами или воспользуйтесь микрофоном. Система подберёт подходящие темы, а вы сможете уточнить их фильтрами.' : locale === 'es' ? 'Escribe tu inquietud o usa el micrófono. Después puedes ajustar los filtros.' : 'Describe a concern in your own words, or use the microphone. You can refine the suggested topics with the filters.'}</p></div>
      <div className={styles.concernActions}>
        <textarea maxLength={500} rows={2} value={concern} onChange={(event) => { setConcern(event.target.value); setConcernMessage('') }} placeholder={locale === 'ru' ? 'Например: быстро устаю, трудно сосредоточиться и плохо сплю…' : locale === 'es' ? 'Por ejemplo: estoy cansado y duermo mal…' : 'For example: I feel exhausted and cannot sleep well…'} aria-label={locale === 'ru' ? 'Опишите вашу проблему' : 'Describe your concern'} />
        <div><button type="button" onClick={applyConcern} disabled={!concern.trim() || concernAnalysis.urgent}>{locale === 'ru' ? 'Подобрать тесты' : locale === 'es' ? 'Buscar pruebas' : 'Find matching tests'}</button>
        {voiceSupported && <button type="button" onClick={dictate} disabled={listening} aria-label={locale === 'ru' ? 'Продиктовать проблему' : 'Dictate your concern'}>{listening ? (locale === 'ru' ? 'Слушаю…' : 'Listening…') : '🎙 ' + (locale === 'ru' ? 'Сказать' : locale === 'es' ? 'Hablar' : 'Speak')}</button>}</div>
      </div>
      {!!concern && !!concernAnalysis.focus.length && <p role="status" className={styles.concernHint}>{locale === 'ru' ? 'Распознаны темы: ' : 'Suggested topics: '}{concernAnalysis.focus.map((key) => TEST_RECOMMENDATION_FOCUS.find((item) => item.key === key)?.label?.[locale] || key).join(' · ')}</p>}
      {concernMessage && <p role="status">{concernMessage}</p>}
      {speechError && <p role="status">{speechError}</p>}
      {concernAnalysis.urgent && <p role="alert">{locale === 'ru' ? 'Если вы сейчас в опасности или думаете причинить себе вред, немедленно обратитесь в местную экстренную службу или кризисную линию. Тест не заменяет срочную помощь.' : 'If you may be in immediate danger or thinking of self-harm, contact local emergency services or a crisis line now. A self-test is not emergency support.'}</p>}
      <small>{locale === 'ru' ? 'Текст не отправляется в аккаунт и не сохраняется. При использовании микрофона распознавание может выполняться службой вашего браузера.' : 'This text is not saved to your account. If you use your microphone, your browser’s speech service may process audio.'}</small>
        </section>
      </details>
    {audience === 'account' && recommendedNext && <aside className={styles.personalNext} aria-label={locale === 'ru' ? 'Личная рекомендация' : 'Personal recommendation'}>
      <div><p className={styles.eyebrow}>{locale === 'ru' ? 'На основе ваших прошлых результатов' : 'Based on your past results'}</p><h2>{recommendedNext.title}</h2><p>{recommendedNext.reason}</p><small>{locale === 'ru' ? 'Это рекомендация по самонаблюдению, не диагноз и не назначение лечения.' : 'A self-monitoring suggestion, not a diagnosis or treatment advice.'}</small></div>
      {recommendedNext.key ? <button type="button" onClick={() => { setAvailability('available'); setFocus([]); setSelectedKeys([recommendedNext.key]); setConcern('') }}>{locale === 'ru' ? 'Выбрать этот тест' : 'Select this test'}</button> : <Link href={`/${locale}/app/history`}>{locale === 'ru' ? 'Открыть историю' : 'View history'}</Link>}
    </aside>}
    <header className={styles.header}><h2>{c.title}</h2><p>{c.intro}</p></header>
    <div className={styles.availability} role="tablist" aria-label={c.title}><button type="button" role="tab" aria-selected={availability === 'available'} onClick={() => setAvailability('available')}>{c.available}</button><button type="button" role="tab" aria-selected={availability === 'full'} onClick={() => setAvailability('full')}>{c.full}</button></div>
    <section className={styles.toolbar} aria-label={c.themes}>
      <div className={styles.filterStatus} role="status" aria-live="polite"><strong>{matchCount} {c.matching}</strong><span>{focus.length} {c.selectedThemes} · {appliedFilters} {c.filters.toLocaleLowerCase()}</span><button type="button" onClick={resetFilters}>{c.filterClear}</button></div>
      <div className={styles.filterGroup}><span>{c.themes}</span><p className={styles.topicHint}>{c.topicHint}</p><div>{TEST_RECOMMENDATION_FOCUS.map((item) => <button key={item.key} type="button" aria-pressed={focus.includes(item.key)} onClick={() => setFocus((value) => toggle(value, item.key))}>{item.label[locale] || item.label.en}</button>)}</div></div>
      <details className={styles.moreFilters} open={filtersOpen} onToggle={(event) => setFiltersOpen(event.currentTarget.open)}><summary>{c.filters} · {appliedFilters} {advanced.filterCount}</summary>
      <p className={styles.advancedIntro}><strong>{advanced.subtitle}.</strong> {advanced.hint}</p><div className={styles.filterGrid}>
        <Filter label={c.style} items={TEST_STYLE_FILTERS} selected={stylesFilter} onToggle={(key) => setStylesFilter((value) => toggle(value, key))} locale={locale} />
        <Filter label={c.length} items={TEST_LENGTH_FILTERS} selected={lengths} onToggle={(key) => setLengths((value) => toggle(value, key))} locale={locale} />
        <Filter label={c.depth} items={depthOptions.map((key) => ({ key, label: { en: key[0].toUpperCase() + key.slice(1), ru: key === 'quick' ? 'Быстро' : key === 'balanced' ? 'Сбалансированно' : 'Глубоко', es: key === 'quick' ? 'Breve' : key === 'balanced' ? 'Equilibrada' : 'Profunda' } }))} selected={[depth]} onToggle={setDepth} locale={locale} single />
        <Filter label={c.area} items={MONITOR_AREAS.map((area) => ({ key: area.key, label: { en: `${area.en} · ${areaCounts[area.key] || 0}`, ru: `${area.ru} · ${areaCounts[area.key] || 0}`, es: `${area.en} · ${areaCounts[area.key] || 0}` } }))} selected={areas} onToggle={(key) => setAreas((value) => toggle(value, key))} locale={locale} />
        <Filter label={advanced.detail} items={TEST_EXPLORER_DETAIL_TOPICS.map((item) => ({ ...item, label: { ...item.label, [locale]: `${item.label[locale] || item.label.en} · ${detailCounts[item.key] || 0}` } }))} selected={details} onToggle={(key) => setDetails((value) => toggle(value, key))} locale={locale} />
        <Filter label={advanced.scales} items={TEST_EXPLORER_AXES.map((key) => ({ key, label: { ...TEST_EXPLORER_AXIS_LABELS[key], en: `${TEST_EXPLORER_AXIS_LABELS[key].en} · ${axisCounts[key] || 0}`, ru: `${TEST_EXPLORER_AXIS_LABELS[key].ru} · ${axisCounts[key] || 0}` } }))} selected={axes} onToggle={(key) => setAxes((value) => toggle(value, key))} locale={locale} />
        <Filter label={advanced.time} items={[{ key: '0', label: { en: advanced.any } }, { key: '2', label: { en: advanced.two } }, { key: '5', label: { en: advanced.five } }, { key: '10', label: { en: advanced.ten } }]} selected={[String(maxMinutes)]} onToggle={(key) => setMaxMinutes(Number(key))} locale={locale} single />
        <Filter label={advanced.language} items={[{ key: 'any', label: { en: advanced.any } }, { key: 'bilingual', label: { en: advanced.bilingual } }, { key: 'english', label: { en: advanced.english } }]} selected={[language]} onToggle={setLanguage} locale={locale} single />
        <Filter label={advanced.tracking} items={[{ key: 'any', label: { en: advanced.any } }, { key: 'repeat', label: { en: advanced.repeat } }, { key: 'baseline', label: { en: advanced.baseline } }]} selected={[tracking]} onToggle={setTracking} locale={locale} single />
        <label className={styles.check}><input type="checkbox" checked={freeOnly} onChange={(event) => setFreeOnly(event.target.checked)} />{c.free}</label>
      </div><p className={styles.advancedNote}>{advanced.about}</p></details>
      <input className={styles.search} type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={c.search} aria-label={c.search} />
      <label className={styles.sort}>{c.sort}<select value={sort} onChange={(event) => setSort(event.target.value)}><option value="recommended">{c.recommended}</option><option value="shortest">{c.shortest}</option><option value="deepest">{c.deepest}</option><option value="alphabetic">{c.alphabetic}</option></select></label>
    </section>
    <div className={styles.workspace}><div className={styles.database}><div className={styles.databaseHeader}><div className={styles.countBlock}><strong role="status" aria-live="polite">{matchCount} {c.matching}</strong><small>{c.of} {availability === 'available' ? entries.filter((entry) => entry.selectable).length : entries.length} · {c.totalAvailable}{selectedKeys.length > 0 && ` · ${selectedKeys.length} ${c.kept}`}</small></div><button type="button" onClick={chooseSuggested}>{c.suggested}</button></div>
      {visible.length === 0 && <p className={styles.emptyState} role="status">{c.noMatches}</p>}
      <div className={styles.list}>{(showAll ? visible : visible.slice(0, 8)).map((entry, index) => <article key={entry.key} className={`${styles.row} ${selectedKeys.includes(entry.key) ? styles.rowSelected : ''} ${axisFilter && entry.analysisAxes.some((axis) => axis.key === axisFilter) ? styles.rowAxis : ''}`}>
        <div className={styles.rowSelect}>{entry.selectable ? <input type="checkbox" checked={selectedKeys.includes(entry.key)} onChange={() => toggleSelected(entry.key)} aria-label={entry.title} /> : <span className={styles.status}>{entry.source === 'research' ? c.metadata : entry.managedSafety ? 'Managed safety' : entry.rightsStatus}</span>}</div>
        <TestArtwork entry={entry} />
        <div className={styles.rowBody}><div className={styles.rowTitle}><span className={styles.area}>{entry.area}</span><h2>{entry.title}</h2>{index === 0 && entry.selectable && (focus.length > 0 || appliedFilters > 0) && <b>{c.best}</b>}{entry.marginalCoverageGain >= .08 && selected.length > 0 && <b>{c.complements}</b>}</div><p>{entry.description || entry.category}</p>{audience === 'account' && historyByKey.has(entry.key) && (() => { const h = historyByKey.get(entry.key); return <div className={styles.historyStatus}><strong>{h.count ? (locale === 'ru' ? `Пройдено: ${h.count}` : `Completed: ${h.count}`) : (locale === 'ru' ? 'Не завершён' : 'Not completed')}</strong>{h.latest && <span> · {locale === 'ru' ? 'Последний' : 'Last'}: {new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(new Date(h.latest.measurementAt))}</span>}{h.draft && <button type="button" onClick={() => onResumeRun?.(h.draft)}>{locale === 'ru' ? `Продолжить (${Math.min(100, Math.round(100 * (h.draft.progress || 0) / Math.max(1, entry.questionCount || 1)))}%)` : `Resume (${Math.max(0, h.draft.progress || 0)}%)`}</button>}{h.latest && <Link href={`/${locale}/app/results/${h.latest.id}`}>{locale === 'ru' ? 'Результат' : 'View result'}</Link>}</div> })()}<div className={styles.meta}><span>{entry.questionCount ?? '—'} {c.questions}</span><span>~{entry.durationMinutes ?? '—'} {c.minutes}</span><span>{entry.testStyle}</span><span>{entry.testLength}</span>{entry.acronym && <span>{entry.acronym}</span>}</div></div>

      </article>)}</div>
        {visible.length > 8 && <button className={styles.showMore} type="button" onClick={() => setShowAll((value) => !value)}>{showAll ? quick.showLess : `${quick.showAll} (${visible.length})`}</button>}
      </div>
    </div>
      <footer className={styles.battery}>
        <div>
          <strong>{activeBattery.length ? `${activeBattery.length} · ${questions} ${c.questions} · ~${minutes} ${c.minutes} · ${activeCoverage.coveredCount} ${c.axes} · ${breadth}` : c.choose}</strong>
          {(activeBattery.length > 8 || minutes > 30) && <p>{c.warning}</p>}
          <small>{c.privacy}</small>
        </div>
        <div>
          <button type="button" onClick={() => setSelectedKeys([])}>{quick.resetSet}</button>
          <button className={styles.primary} type="button" disabled={!activeBattery.length || starting || !onStart} onClick={() => start()}>{starting ? '…' : c.start}</button>
        </div>
      </footer>
    </div>
  </section>
}

function Filter({ label, items, selected, onToggle, locale, single = false }) { return <fieldset className={styles.filter}><legend>{label}</legend>{items.map((item) => <button type="button" key={item.key} aria-pressed={selected.includes(item.key)} onClick={() => onToggle(item.key)}>{item.label[locale] || item.label.en}</button>)}</fieldset> }
