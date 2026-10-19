'use client'

import { useEffect, useMemo, useState } from 'react'
import { startTestCatalogStatsRequest } from '@/lib/assessments/test-catalog-stats-client'
import Link from 'next/link'
import { Activity, ArrowLeft, Brain, ChevronRight, Clock3, Compass, Heart, Languages, Layers, MessageCircle, Moon, Shield, Sparkles, Zap, GraduationCap, FileDown } from 'lucide-react'
import { assessmentHistoryGroups, interpretConcern, nextPersonalRecommendation } from '@/lib/assessments/personal-guidance'
import { TEST_RECOMMENDATION_FOCUS, TEST_STYLE_FILTERS, TEST_LENGTH_FILTERS } from '@/lib/assessments/test-recommendations'
import { TEST_KINDS, testKindCardLabel, testKindShortLabel } from '@/lib/assessments/test-kinds'
import { MONITOR_AREAS } from '@/data/assessments/mind-body-monitor-registry'
import { PSYCHOTHERAPY_CORE_CATEGORIES } from '@/data/assessments/psychotherapy-core-100'
import { TEST_EXPLORER_AXES, TEST_EXPLORER_AXIS_LABELS, TEST_EXPLORER_DETAIL_TOPICS, buildExplorerEntries, buildStarterBattery, buildPublicStarterBattery, coverageForSelection, coverageForFilters, filterExplorerEntries, rankExplorerEntries, rankPublicTestMatches } from '@/lib/assessments/test-explorer'
import { TestExplorerVisual } from './test-explorer-visual'
import { normalizeProblemsForTopics } from '@/lib/assessments/test-problems'
import { TEST_TOPIC_COLLECTIONS } from '@/lib/assessments/test-collections'
import { SimpleTestPicker } from './simple-test-picker'
import { TestScaleGuide } from './test-scale-guide'
import { PriorityMethodsReview } from './priority-methods-review'
import { ResearchDirectory } from './research-directory'
import { buildPsychPortrait } from '@/lib/assessments/psych-portrait'
import { compareTestSocialProof } from '@/lib/assessments/test-popularity'
import styles from './test-explorer.module.css'

const COPY = {
  en: { kicker: 'Mind–Body Monitor', title: 'Build your test set', intro: 'Choose the concerns you want to monitor. Matching tests and analysis areas update as you select them.', available: 'Available now', full: 'Full database', core100: '100 core tests', coreNote: 'Curated reference: only cleared questionnaires can be completed online.', themes: 'Filter tests by your concerns', style: 'Style', length: 'Length', depth: 'Preferred depth', area: 'Area', free: 'Free only', search: 'Search the database', sort: 'Sort', recommended: 'Recommended first', shortest: 'Shortest first', deepest: 'Deepest first', alphabetic: 'A–Z', suggested: 'Select suggested set', clear: 'Clear', selected: 'selected', questions: 'questions', minutes: 'min', axes: 'axes', focused: 'Focused', balanced: 'Balanced', broad: 'Broad', start: 'Start free monitoring', choose: 'Choose at least one test', availableStatus: 'Available', metadata: 'Research reference', details: 'Details', warning: 'More than 8 tests or 30 minutes may be hard to complete in one sitting.', privacy: 'Selections and filters stay only in this page until you explicitly consent to start.', relevance: 'Selection match', matchNote: 'This reflects fit with your selected topics and format, not a medical probability.', best: 'Best match', complements: 'Complements your set', filters: 'More filters', selectedThemes: 'topics selected', filterClear: 'Reset filters', matching: 'matching tests', of: 'out of', kept: 'selected tests kept visible', noMatches: 'No tests match these filters. Remove a topic or filter to see more.', topicHint: 'These topics filter the list immediately; select tests below to build your monitoring battery.', topicPreview: 'Axes related to your chosen topics', testCoverage: 'Coverage of selected tests', totalAvailable: 'available to start' },
  ru: { kicker: 'Монитор состояния', title: 'Соберите свой набор тестов', intro: 'Выберите проблемы, которые хотите отслеживать. Список тестов и оси анализа меняются сразу.', available: 'Доступно сейчас', full: 'Вся база', core100: '100 тестов', coreNote: 'Профессиональная подборка: онлайн доступны только тесты с разрешённым использованием.', themes: 'Фильтр тестов по проблемам', style: 'Стиль', length: 'Длина', depth: 'Желаемая глубина', area: 'Область', free: 'Только бесплатные', search: 'Поиск по базе', sort: 'Сортировка', recommended: 'Сначала рекомендуемые', shortest: 'Сначала короткие', deepest: 'Сначала глубокие', alphabetic: 'А–Я', suggested: 'Выбрать оптимальный набор', clear: 'Очистить', selected: 'выбрано', questions: 'вопросов', minutes: 'мин', axes: 'осей', focused: 'Фокусный', balanced: 'Сбалансированный', broad: 'Широкий', start: 'Начать бесплатный мониторинг', choose: 'Выберите хотя бы один тест', availableStatus: 'Доступен', metadata: 'Исследовательская карточка', details: 'Подробнее', warning: 'Больше 8 тестов или 30 минут может быть сложно пройти за один раз.', privacy: 'Выбор и фильтры остаются только на этой странице, пока вы явно не согласитесь начать.', relevance: 'Релевантность подбора', matchNote: 'Это соответствие выбранным темам и формату, а не медицинская вероятность.', best: 'Лучшее совпадение', complements: 'Дополняет набор', filters: 'Дополнительные фильтры', selectedThemes: 'тем выбрано', filterClear: 'Сбросить фильтры', matching: 'подходящих тестов', of: 'из', kept: 'выбранных тестов остаются видны', noMatches: 'По этим фильтрам тестов нет. Уберите тему или другой фильтр.', topicHint: 'Темы сразу отбирают тесты. Отметьте нужные тесты ниже, чтобы создать набор для мониторинга.', topicPreview: 'Оси по выбранным темам', testCoverage: 'Покрытие выбранных тестов', totalAvailable: 'доступно для прохождения' },
  es: { kicker: 'Monitor mente–cuerpo', title: 'Prepara tu selección de pruebas', intro: 'Elige los temas y el formato que más te interesen. Los cuestionarios se realizan en su idioma disponible y los resultados se muestran en la aplicación en inglés.', available: 'Disponibles ahora', full: 'Base completa', core100: '100 pruebas', coreNote: 'Selección profesional: solo las pruebas autorizadas están disponibles en línea.', themes: 'Filtrar pruebas por temas', style: 'Tipo', length: 'Duración', depth: 'Profundidad deseada', area: 'Área', free: 'Solo gratuitas', search: 'Buscar pruebas', sort: 'Ordenar', recommended: 'Recomendadas primero', shortest: 'Más breves primero', deepest: 'Más detalladas primero', alphabetic: 'A–Z', suggested: 'Elegir una selección recomendada', clear: 'Limpiar', selected: 'seleccionadas', questions: 'preguntas', minutes: 'min', axes: 'ejes', focused: 'Enfocada', balanced: 'Equilibrada', broad: 'Amplia', start: 'Iniciar monitoreo gratuito', choose: 'Elige al menos una prueba', availableStatus: 'Disponible', metadata: 'Referencia de investigación', details: 'Detalles', warning: 'Más de 8 pruebas o 30 minutos pueden resultar difíciles de completar en una sola sesión.', privacy: 'Tus selecciones no se guardan hasta que aceptas expresamente iniciar las pruebas.', relevance: 'Coincidencia', matchNote: 'Muestra la afinidad con los temas elegidos, no una probabilidad médica.', best: 'Mejor coincidencia', complements: 'Complementa tu selección', filters: 'Más filtros', selectedThemes: 'temas elegidos', filterClear: 'Limpiar filtros', matching: 'pruebas encontradas', of: 'de', kept: 'pruebas elegidas visibles', noMatches: 'No hay pruebas para estos filtros. Cambia un tema o filtro.', topicHint: 'Los temas filtran al instante; elige las pruebas para construir tu seguimiento.', topicPreview: 'Ejes de los temas elegidos', testCoverage: 'Cobertura de pruebas elegidas', totalAvailable: 'disponibles para empezar' },
}


const VALIDITY_COPY = Object.freeze({
  en: { label: 'Psychometric evidence', graded: 'Reviewed evidence grade', development: 'Original self-check — independent validation not established', source_documented: 'Primary publication found — edition validation not yet audited', unreviewed: 'Evidence review pending', locale: 'Respondent language', open: 'Open owner-hosted questionnaire', direct: 'Open original PDF at the source', caution: 'External document for independent reading only. No digital administration or clinical scoring is licensed here.' },
  ru: { label: 'Психометрическая доказательность', graded: 'Проверенный ранг доказательности', development: 'Авторская самопроверка — независимая валидация не подтверждена', source_documented: 'Найден первоисточник — валидация конкретной версии ещё не проверена', unreviewed: 'Проверка доказательности не завершена', locale: 'Язык вопросов', open: 'Открыть тест у правообладателя', direct: 'Открыть оригинальный PDF у автора', caution: 'Внешний документ только для самостоятельного ознакомления. Это не разрешение на онлайн-тестирование или клиническую интерпретацию.' },
  es: { label: 'Evidencia psicométrica', graded: 'Nivel de evidencia revisado', development: 'Autoobservación original — sin validación independiente confirmada', source_documented: 'Fuente primaria localizada — versión aún no auditada', unreviewed: 'Evidencia pendiente de revisión', locale: 'Idioma del cuestionario', open: 'Ver cuestionario en la página del titular', direct: 'Abrir PDF original en la fuente', caution: 'Documento externo solo para consulta personal. No autoriza la administración digital ni la interpretación clínica.' },
})

const SOCIAL_COPY = {
  en: { popular: 'Most popular', rating: 'Top rated', launches: 'started', completed: 'completed', userScore: 'User usefulness rating', votes: 'ratings' },
  ru: { popular: 'По популярности', rating: 'По оценкам', launches: 'запусков', completed: 'пройдено', userScore: 'Оценка полезности', votes: 'оценок' },
  es: { popular: 'Más populares', rating: 'Mejor valoradas', launches: 'inicios', completed: 'completadas', userScore: 'Valoración de utilidad', votes: 'valoraciones' },
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
    google: 'Take available tests without signing in. After each, read your scale results; free analysis is in your Cabinet.',
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
    google: 'Доступные тесты — без регистрации. После каждого — расшифровка шкал; бесплатный анализ — в личном кабинете.',
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
    google: 'Realiza pruebas disponibles sin registro; lee tus escalas y entra a tu espacio para el análisis gratuito.',
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
const TEST_KIND_ICONS = { professional: GraduationCap, monitoring: Activity, hobby: Sparkles }
const TEST_KIND_ORDER = { professional: 0, monitoring: 1, hobby: 2 }

function KindCheckboxFilters({ locale, selected, onToggle }) {
  return <fieldset className={styles.kindFilters} data-test-kind-filter>
    <legend>{locale === 'ru' ? 'Типы тестов' : locale === 'es' ? 'Tipos de pruebas' : 'Types of tests'}</legend>
    <div className={styles.kindChoices}>
      {TEST_KINDS.map((kind) => {
        const Icon = TEST_KIND_ICONS[kind.key]
        return <label key={kind.key} className={styles.kindChoice} data-checked={selected.includes(kind.key)}>
          <input type="checkbox" data-test-kind-checkbox value={kind.key}
            checked={selected.includes(kind.key)} onChange={() => onToggle(kind.key)} />
          <Icon size={16} aria-hidden="true" />
          <span>{kind.label[locale] || kind.label.en}</span>
        </label>
      })}
    </div>
  </fieldset>
}

function TestKindBadge({ entry, locale }) {
  const kind = TEST_KINDS.find((item) => item.key === entry?.testKind)
  if (!kind) return null
  const Icon = TEST_KIND_ICONS[kind.key]
  const prefix = locale === 'ru' ? 'Тип' : locale === 'es' ? 'Tipo' : 'Type'
  const label = testKindShortLabel(entry, locale)
  const evidence = testKindCardLabel(entry, locale)
  return <span className={styles.testKindBadge} data-test-kind-badge={kind.key}
    title={`${evidence}. ${kind.description[locale] || kind.description.en}`}
    aria-label={`${prefix}: ${label}. ${evidence}`}>
    <Icon size={14} aria-hidden="true" />
    <span className={styles.testKindBadgeLabel}>{prefix}: {label}</span>
  </span>
}

const GUIDED_FILTER_GROUPS = [
  { key:'topics', icon:Heart, label:{en:'Topics that matter',ru:'Что меня беспокоит',es:'Temas que importan'}, detail:{en:'Stress, sleep, mood and relationships',ru:'Стресс, сон, настроение и отношения',es:'Estrés, sueño, ánimo y relaciones'} },
  { key:'concerns', icon:MessageCircle, label:{en:'Specific concerns',ru:'Конкретная проблема',es:'Inquietudes específicas'}, detail:{en:'Narrow down what you want to explore',ru:'Уточните ваш запрос',es:'Define lo que quieres explorar'} },
  { key:'areas', icon:Compass, label:{en:'Area of life',ru:'Область жизни',es:'Área de la vida'}, detail:{en:'Mind, body and everyday life',ru:'Психика, тело, повседневная жизнь',es:'Mente, cuerpo y vida diaria'} },
  { key:'scales', icon:Activity, label:{en:'What to measure',ru:'Что измерять',es:'Qué medir'}, detail:{en:'Choose the scales for your profile',ru:'Выберите шкалы для портрета',es:'Escalas para tu perfil'} },
  { key:'timing', icon:Clock3, label:{en:'Time & depth',ru:'Время и глубина',es:'Tiempo y profundidad'}, detail:{en:'A quick check or a deeper look',ru:'Быстрый тест или подробный разбор',es:'Revisión rápida o detallada'} },
  { key:'format', icon:Layers, label:{en:'Test type',ru:'Тип теста',es:'Tipo de prueba'}, detail:{en:'Professional, state scales or hobby; choose with checkboxes',ru:'Профессиональные, шкалы состояния или хобби — отметьте галочками',es:'Profesionales, escalas de estado o aficiones'} },
  { key:'language', icon:Languages, label:{en:'Questionnaire language',ru:'Язык теста',es:'Idioma del cuestionario'}, detail:{en:'Choose the available language version',ru:'На каком языке отвечать',es:'Idioma de las preguntas'} },
  { key:'goal', icon:Shield, label:{en:'Monitoring goal',ru:'Цель тестирования',es:'Objetivo de seguimiento'}, detail:{en:'One-time check or track changes',ru:'Разово или для наблюдения динамики',es:'Una vez o seguir cambios'} },
  { key:'describe', icon:Sparkles, label:{en:'Describe in my own words',ru:'Описать своими словами',es:'Describir con mis palabras'}, detail:{en:'Suggest topics from your words',ru:'Поможем подобрать темы по вашему тексту',es:'Sugerir temas a partir de tu texto'} },
]
const GUIDED_COPY = {
  en: { first:'Step 1 of 2', second:'Step 2 of 2', title:'What would you like to refine?', subtitle:'Choose one filter topic first. We will show only the relevant options.', back:'All filter topics', choose:'Choose', active:'selected', results:'Show matching tests', selected:'active filters', done:'The list of matching tests updates immediately.' },
  ru: { first:'Шаг 1 из 2', second:'Шаг 2 из 2', title:'Что хотите уточнить?', subtitle:'Сначала выберите направление, затем только нужные параметры.', back:'К списку фильтров', choose:'Выбрать', active:'выбрано', results:'Показать подходящие тесты', selected:'активных фильтров', done:'Список подходящих тестов обновляется сразу.' },
  es: { first:'Paso 1 de 2', second:'Paso 2 de 2', title:'¿Qué quieres ajustar?', subtitle:'Elige primero una categoría y después sus opciones.', back:'Todas las categorías', choose:'Elegir', active:'seleccionado', results:'Mostrar pruebas', selected:'filtros activos', done:'Los resultados cambian inmediatamente.' },
}


const toggle = (items, key) => items.includes(key) ? items.filter((item) => item !== key) : [...items, key]
const depthOptions = ['quick', 'balanced', 'deep']

const GUEST_START_NOTICE = {
  en: 'By starting a test, you confirm you are 18 or older and agree to temporary private processing of your answers and results. No sign-in required.',
  ru: 'Начиная тест, вы подтверждаете, что вам есть 18 лет, и соглашаетесь на временную приватную обработку ответов и результатов. Регистрация не нужна.',
  es: 'Al iniciar una prueba, confirmas que tienes 18 años o más y aceptas el tratamiento privado y temporal de tus respuestas y resultados. No necesitas registrarte.',
}

export function TestExplorer({ locale = 'en', audience = 'guest', onStart, onStartSingle = null, onStartCourse = null, activePlan = null, onResume, embedded = false, pastResults = [], draftRuns = [], profileSnapshot = null, onResumeRun, recommendedKey = null, initialPreferences = null, initialMode = 'tests', initialBrowseFull = false, simpleMode = false, authenticated = false, preserveScaleFilters = false, openFiltersInitially = false, initialFilterGroup = null, initialAxis = null, explicitSelectionOnly = false }) {
  const c = COPY[locale] || COPY.en
  const socialCopy = SOCIAL_COPY[locale] || SOCIAL_COPY.en
  const guestStartNotice = GUEST_START_NOTICE[locale] || GUEST_START_NOTICE.en
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
    setProblems([])
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
  const [activeCollectionId, setActiveCollectionId] = useState(null)
  const activeCollection = TEST_TOPIC_COLLECTIONS.find((collection) => collection.id === activeCollectionId) || null
  const selectionFocus = useMemo(() => activeCollection ? [...new Set([...focus, ...activeCollection.focus])] : focus, [activeCollection, focus])
  const [problems, setProblems] = useState(() => normalizeProblemsForTopics(
    initialPreferences?.problems ?? [], initialPreferences?.focus ?? [],
  ))
  useEffect(() => {
    // Concerns can be suggested by either explicitly selected topics or a chosen collection.
    // Remove only concerns that neither choice supports.
    setProblems((previous) => {
      const next = normalizeProblemsForTopics(previous, selectionFocus)
      return next.length === previous.length ? previous : next
    })
  }, [selectionFocus])
  const [stylesFilter, setStylesFilter] = useState(() => initialPreferences?.styles ?? [])
  const [kinds, setKinds] = useState(() => initialPreferences?.kinds ?? [])
  const [lengths, setLengths] = useState(() => initialPreferences?.lengths ?? [])
  const [depth, setDepth] = useState(() => initialPreferences?.depth ?? 'balanced')
  const [areas, setAreas] = useState(() => initialPreferences?.areas ?? [])
  const [details, setDetails] = useState(() => initialPreferences?.details ?? [])
  const [axes, setAxes] = useState(() => simpleMode && !preserveScaleFilters ? [] : (initialPreferences?.axes ?? []))
  const [maxMinutes, setMaxMinutes] = useState(() => initialPreferences?.maxMinutes ?? 0)
  const [language, setLanguage] = useState(() => initialPreferences?.language ?? 'any')
  const [tracking, setTracking] = useState(() => initialPreferences?.tracking ?? 'any')
  const [freeOnly, setFreeOnly] = useState(() => initialPreferences?.freeOnly ?? false)
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState('recommended')
  const [socialStats, setSocialStats] = useState({})
  useEffect(() => {
    const request = startTestCatalogStatsRequest(stats => {
      setSocialStats(Object.fromEntries(stats.map(item => [item.key, item])))
    })
    return request.cancel
  }, [])
  const [selectedKeys, setSelectedKeys] = useState(() => recommendedKey ? [recommendedKey] : [])
  const [axisFilter, setAxisFilter] = useState(null)
  const [actionError, setActionError] = useState(null)
  const [starting, setStarting] = useState(false)
  const [customizeOpen, setCustomizeOpen] = useState(Boolean(openFiltersInitially))
  const [activeFilterGroup, setActiveFilterGroup] = useState(initialFilterGroup)
  const [showAll, setShowAll] = useState(false)
  const [showStandaloneVia, setShowStandaloneVia] = useState(false)
  const [browseFull, setBrowseFull] = useState(Boolean(initialBrowseFull))
  const [simpleSelectionChanged, setSimpleSelectionChanged] = useState(false)
  // Keep the Spanish UI metadata; English remains the safe fallback for source questionnaires.
  const entries = useMemo(() => buildExplorerEntries({ locale, audience }), [locale, audience])
  const pdfResourceCount = entries.filter((entry) => entry.pdfResource && !entry.selectable).length
  // Direct History -> Test selection must also work when the URL changes without remounting.
  useEffect(() => {
    if (recommendedKey && entries.some((entry) => entry.key === recommendedKey && entry.selectable)) setSelectedKeys([recommendedKey])
  }, [recommendedKey, entries])
  // A marketing page may preselect exactly one startable, rights-cleared test by key.
  // URL contains no answers, health details or identity information.
  useEffect(() => {
    const key = new URLSearchParams(window.location.search).get('test')
    const entry = entries.find(row => row.key === key && row.selectable)
    if (!entry) return
    setSelectedKeys([entry.key])
    setSimpleSelectionChanged(true)
    setAvailability('available')
    setFocus([entry.topics.includes('sexuality') ? 'sexuality' : entry.topics.includes('tantra') ? 'tantra' : 'intimacy'])
  }, [entries])
  // Reports → Test it: offer the exact rights-cleared questionnaire whose
  // scored dimension feeds this portrait axis. Preselect only; never start,
  // save, or replace the user's existing tests without an explicit tap.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const suggestedKey = params.get('suggest')
    const requestedAxis = params.get('axis')
    if (!suggestedKey || !requestedAxis || !TEST_EXPLORER_AXES.includes(requestedAxis)) return
    const entry = entries.find(item =>
      item.key === suggestedKey && item.selectable === true &&
      item.measurementAxes?.includes(requestedAxis))
    if (!entry) return // A forged or retired source must not bypass rights gates.
    setSelectedKeys([entry.key])
    setAxes([requestedAxis])
    setFocus([])
    setAvailability('available')
    setCustomizeOpen(true)
    setShowAll(true)
  }, [entries])
  const facets = { availability, focus, problems, styles: stylesFilter, kinds, lengths, areas, details, axes, maxMinutes, language, tracking, freeOnly, search: query }
  const matching = useMemo(() => filterExplorerEntries(entries, facets), [entries, availability, focus, problems, stylesFilter, kinds, lengths, areas, details, axes, maxMinutes, language, tracking, freeOnly, query])
  // Facet counts reflect the whole eligible catalog and every *other* active
  // criterion. Exclude the facet's own current selection (multi-choice OR).
  const detailCandidates = useMemo(() => filterExplorerEntries(entries, { ...facets, details: [] }), [entries, availability, focus, problems, stylesFilter, kinds, lengths, areas, axes, maxMinutes, language, tracking, freeOnly, query])
  const areaCandidates = useMemo(() => filterExplorerEntries(entries, { ...facets, areas: [] }), [entries, availability, focus, problems, stylesFilter, kinds, lengths, details, axes, maxMinutes, language, tracking, freeOnly, query])
  const axisCandidates = useMemo(() => filterExplorerEntries(entries, { ...facets, axes: [] }), [entries, availability, focus, problems, stylesFilter, kinds, lengths, areas, details, maxMinutes, language, tracking, freeOnly, query])
  const detailCounts = useMemo(() => Object.fromEntries(TEST_EXPLORER_DETAIL_TOPICS.map((item) => [item.key, detailCandidates.filter((entry) => entry.topics.includes(item.key)).length])), [detailCandidates])
  const areaCounts = useMemo(() => Object.fromEntries(MONITOR_AREAS.map((item) => [item.key, areaCandidates.filter((entry) => entry.areas?.includes(item.key)).length])), [areaCandidates])
  const axisCounts = useMemo(() => Object.fromEntries(TEST_EXPLORER_AXES.map((key) => [key, axisCandidates.filter((entry) => entry.measurementAxes?.includes(key)).length])), [axisCandidates])
  // A selected test stays visible even if new filters no longer match it.
  const filtered = useMemo(() => filterExplorerEntries(entries, { ...facets, selectedKeys }), [entries, availability, focus, problems, stylesFilter, kinds, lengths, areas, details, axes, maxMinutes, language, tracking, freeOnly, query, selectedKeys])
  const ranked = useMemo(() => rankExplorerEntries(filtered, { focus, details, axes, depth, styles: stylesFilter, lengths, selectedKeys }), [filtered, focus, details, axes, depth, stylesFilter, lengths, selectedKeys])
  // Keep checked tests above the shortened discovery list. Re-ranking after
  // a checkbox change must never make that same checkbox disappear mid-click.
  const visible = useMemo(() => ranked.filter((entry) => !axisFilter || selectedKeys.includes(entry.key) || entry.measurementAxes?.includes(axisFilter)).sort((a, b) => {
    const aSelected = selectedKeys.includes(a.key), bSelected = selectedKeys.includes(b.key)
    if (aSelected !== bSelected) return aSelected ? -1 : 1
    if (sort === 'popular' || sort === 'rating') return compareTestSocialProof(a, b, sort, socialStats)
    if (sort === 'shortest') return (a.durationMinutes ?? Infinity) - (b.durationMinutes ?? Infinity)
    if (sort === 'deepest') return (b.durationMinutes ?? 0) - (a.durationMinutes ?? 0)
    if (sort === 'alphabetic') return a.title.localeCompare(b.title, locale)
    if (sort === 'type') return (TEST_KIND_ORDER[a.testKind] ?? 9) - (TEST_KIND_ORDER[b.testKind] ?? 9) || a.title.localeCompare(b.title, locale)
    return 0
  }), [ranked, sort, locale, axisFilter, selectedKeys, socialStats])
  // Preserve all 27 source-clear individual VIA strengths/core scales, but show one complete
  // 96-item card by default. Explicit selections, search and already-saved results remain visible.
  const isStandaloneVia = (key) => /^ipip-via-r-(?!strengths-96$).+-(4|6)$/.test(key)
  const visibleCatalog = visible.filter((entry) =>
    showStandaloneVia || query.trim() || selectedKeys.includes(entry.key) || !isStandaloneVia(entry.key))
  const viaStandaloneMatches = visible.filter((entry) => isStandaloneVia(entry.key)).length
  const collapsedViaCount = visible.length - visibleCatalog.length
  const selected = entries.filter((entry) => selectedKeys.includes(entry.key) && entry.selectable)
  // Public browsing uses its own match-based order, unaffected by checkbox toggles.
  // Explicitly selected tests stay available across filter changes; discovery
  // ordering itself is not driven by checkbox state or saved health results.
  // One combined preference model: the visitor's topics, optional collection and
  // selected concerns determine relevance. Test kind, time and other explicit
  // filters restrict the eligible pool, independently of topic/concern relevance.
  // A collection is a soft ranking preference, never a replacement for choices.
  const simpleRecommendationPool = useMemo(() => filterExplorerEntries(entries, {
    availability: 'available', styles: stylesFilter, kinds, lengths, areas, details,
    axes, maxMinutes, language, tracking, freeOnly,
  }).filter((entry) => entry.selectable), [
    entries, stylesFilter, kinds, lengths, areas, details, axes,
    maxMinutes, language, tracking, freeOnly,
  ])
  const simpleRecommendations = useMemo(() => rankPublicTestMatches(
    simpleRecommendationPool,
    { focus: selectionFocus, problems,
      collectionId: activeCollectionId, collectionFocus: activeCollection?.focus || [],
      details, axes, depth, styles: stylesFilter, lengths, kinds },
  ), [simpleRecommendationPool, selectionFocus, problems, activeCollectionId,
      activeCollection, details, axes, depth, stylesFilter, lengths, kinds])
  // Text searches use the same pool and relevance order as the visible cards.
  // Typing a query does not silently discard any earlier preference.
  const searchRecommendations = simpleRecommendations
  const simpleAuto = useMemo(() => buildPublicStarterBattery(simpleRecommendations), [simpleRecommendations])
  const coverage = useMemo(() => coverageForSelection(entries, selectedKeys), [entries, selectedKeys])
  // The start button works without requiring a visitor to select any filters.
  // Use only existing, rights-cleared, startable questionnaires.
  const autoBattery = useMemo(() => buildStarterBattery(
    matching.filter((entry) => !axisFilter || entry.measurementAxes?.includes(axisFilter)),
    { focus, details, axes, depth, styles: stylesFilter, lengths },
  ), [matching, axisFilter, focus, details, axes, depth, stylesFilter, lengths])
  const activeBattery = explicitSelectionOnly
    ? selected // A course visitor must explicitly select tests; never fall back to an automatic set.
    : simpleMode
      ? (simpleSelectionChanged ? selected : simpleAuto)
      : (selected.length ? selected : autoBattery)
  const activeCoverage = selected.length ? coverage : coverageForSelection(entries, activeBattery.map((entry) => entry.key))
  const topicCoverage = useMemo(() => coverageForFilters(entries, { focus, details, axes }), [entries, focus, details, axes])
  const showingCoverage = selectedKeys.length > 0
  const displayedCoverage = showingCoverage ? coverage : topicCoverage
  const matchCount = matching.filter((entry) => !axisFilter || entry.measurementAxes?.includes(axisFilter)).length
  const appliedFilters = stylesFilter.length + kinds.length + lengths.length + areas.length + details.length + problems.length + axes.length + (maxMinutes ? 1 : 0) + (language !== 'any' ? 1 : 0) + (tracking !== 'any' ? 1 : 0) + (freeOnly ? 1 : 0) + (query.trim() ? 1 : 0) + (axisFilter ? 1 : 0)
  const guidedCopy = GUIDED_COPY[locale] || GUIDED_COPY.en
  const guidedCounts = {
    topics: focus.length, concerns: details.length + problems.length, areas: areas.length, scales: axes.length,
    timing: lengths.length + (maxMinutes ? 1 : 0) + (depth !== 'balanced' ? 1 : 0),
    format: stylesFilter.length + kinds.length + (freeOnly ? 1 : 0),
    language: language !== 'any' ? 1 : 0, goal: tracking !== 'any' ? 1 : 0, describe: 0,
  }
  const guidedCount = Object.values(guidedCounts).reduce((sum, value) => sum + value, 0)
  const guidedGroup = GUIDED_FILTER_GROUPS.find((group) => group.key === activeFilterGroup)
  const questions = activeBattery.reduce((sum, entry) => sum + (entry.questionCount || 0), 0)
  const minutes = activeBattery.reduce((sum, entry) => sum + (entry.durationMinutes || 0), 0)
  const breadth = c[activeCoverage.breadth]
  const chooseSuggested = () => {
    if (simpleMode) {
      setSelectedKeys(simpleAuto.map((entry) => entry.key))
      setSimpleSelectionChanged(true)
      return
    }
    setSelectedKeys(buildStarterBattery(matching.filter((entry) => !axisFilter || entry.measurementAxes?.includes(axisFilter)), { focus, details, axes, depth, styles: stylesFilter, lengths }).map((entry) => entry.key))
  }
  const resetFilters = () => { setAvailability('available'); setFocus([]); setProblems([]); setStylesFilter([]); setKinds([]); setLengths([]); setDepth('balanced'); setAreas([]); setDetails([]); setAxes([]); setMaxMinutes(0); setLanguage('any'); setTracking('any'); setFreeOnly(false); setQuery(''); setSort('recommended'); setAxisFilter(null) }
  const toggleSelected = (key) => {
    if (simpleMode) setSimpleSelectionChanged(true)
    setSelectedKeys((current) => {
      // Full-catalog checkboxes display explicit selection, never implicit starters.
      const baseline = current
      return baseline.includes(key)
        ? baseline.filter((item) => item !== key)
        : baseline.length < 12 ? [...baseline, key] : baseline
    })
  }
  const toggleSimpleSelected = (key) => {
    // In the uncomplicated initial view, the automatically recommended plan is
    // already selected. The first manual click edits the full suggested set.
    setSelectedKeys((current) => {
      const baseline = !simpleSelectionChanged && !current.length
        ? simpleAuto.map((entry) => entry.key) : current
      return baseline.includes(key)
        ? baseline.filter((item) => item !== key)
        : baseline.length < 12 ? [...baseline, key] : baseline
    })
    setSimpleSelectionChanged(true)
  }
  // Batch selection only saves the explicitly chosen set. A signed-in card may
  // additionally launch just that test after it is added to the account plan.
  const start = async () => {
    if (!activeBattery.length || !onStart || starting) return
    setStarting(true); setActionError(null)
    try { await onStart(activeBattery, {
      focus: selectionFocus, problems, details, axes, areas, styles: stylesFilter, kinds, lengths,
      depth, maxMinutes, language, tracking, freeOnly,
    }) } catch (error) { setActionError(error) } finally { setStarting(false) }
  }
  const startSingle = async (entry) => {
    if (!entry?.selectable || !(onStartSingle || onStart) || starting) return
    setStarting(true); setActionError(null)
    try {
      const preferences = {
        focus: selectionFocus, problems, details, axes, areas, styles: stylesFilter, kinds, lengths,
        depth, maxMinutes, language, tracking, freeOnly,
      }
      if (audience === 'account' && onStartSingle) {
        await onStartSingle(entry, preferences)
      } else {
        // Public/guest flow and legacy consumers still use the existing handoff.
        await onStart([entry], preferences)
      }
    } catch (error) { setActionError(error) } finally { setStarting(false) }
  }

  if (simpleMode && !browseFull) {
    return <SimpleTestPicker
      locale={locale} authenticated={authenticated}
      initialMode={initialMode}
      focus={focus}
      onToggleFocus={(key) => { setFocus((current) => toggle(current, key)); setAvailability('available') }}
      problems={problems}
      onToggleProblem={(key) => {
        const allowed = normalizeProblemsForTopics([key], selectionFocus)
        if (!allowed.length) return
        setProblems((current) => current.includes(key)
          ? current.filter((problem) => problem !== key)
          : current.length < 12 ? [...current, key] : current)
      }}
      onClearProblems={() => setProblems([])}
      depth={depth}
      onDepth={setDepth}
      maxMinutes={maxMinutes}
      onMaxMinutes={setMaxMinutes}
      testKinds={kinds}
      onToggleTestKind={(key) => setKinds((current) => toggle(current, key))}
      onClearTestKinds={() => setKinds([])}
      onSelectTestKind={(kind) => setKinds(kind ? [kind] : [])}
      recommendations={simpleRecommendations}
      searchRecommendations={searchRecommendations}
      catalogEntries={entries}
      activeCollectionId={activeCollectionId}
      onChooseCollection={(id) => {
        setActiveCollectionId(id)
        setAvailability('available')
        setQuery('')
        setSort('recommended')
        setAxisFilter(null)
        setActionError(null)
      }}
      viaProfileEntry={entries.find((entry) => entry.key === 'ipip-via-r-strengths-96' && entry.selectable) || null}
      activeBattery={activeBattery}
      onToggleTest={toggleSimpleSelected}
      onResetSuggested={() => { setSelectedKeys([]); setSimpleSelectionChanged(false) }}
      matchCount={simpleRecommendations.length}
      onStart={start}
      onStartSingle={startSingle}
      onStartCourse={onStartCourse ? () => onStartCourse(activeBattery, { focus: selectionFocus, problems }) : null}
      onBrowseCore={() => { setBrowseFull(true); setAvailability('core') }}
      onBrowsePdf={() => {
        setBrowseFull(true); setAvailability('pdf')
        setQuery(''); setMaxMinutes(0); setFreeOnly(false); setLanguage('any'); setTracking('any')
        setFocus([]); setProblems([]); setDetails([]); setAxes([]); setAreas([])
        setKinds([]); setStylesFilter([]); setLengths([]); setAxisFilter(null)
      }}
      onBrowseFull={() => {
        // Carry the three implicit selections into the full catalog editor.
        if (!simpleSelectionChanged) {
          setSelectedKeys(simpleAuto.map((entry) => entry.key))
          setSimpleSelectionChanged(true)
        }
        setBrowseFull(true)
        setAvailability('available')
      }}
      starting={starting}
      actionError={actionError}
    />
  }

  return <section className={`${styles.explorer} ${embedded ? styles.embedded : ''}`}>
    {simpleMode && browseFull && <button type="button" className={styles.simpleBack} onClick={() => { if (!preserveScaleFilters) setAxes([]); setBrowseFull(false); setCustomizeOpen(false) }}>
      ← {locale === 'ru' ? 'Назад к простому подбору' : locale === 'es' ? 'Volver al selector sencillo' : 'Back to easy selection'}
    </button>}
    <div className={styles.explorerHero}>
    <header className={styles.quickStart}>
      <p className={styles.eyebrow}>{c.kicker}</p>
      <h1>{quick.title}</h1>
      <p className={styles.quickIntro}>{quick.intro}</p>
      {activePlan?.status === 'active' && <button className={styles.resumeButton} type="button" onClick={() => onResume?.(activePlan)}>{locale === 'ru' ? `Продолжить набор: шаг ${activePlan.currentIndex + 1}` : locale === 'es' ? `Continuar selección: paso ${activePlan.currentIndex + 1}` : `Resume set: step ${activePlan.currentIndex + 1}`}</button>}
      <div className={styles.quickActions}>
        <button type="button" className={styles.quickPrimary} data-test-action={explicitSelectionOnly ? 'save' : 'start'} disabled={!activeBattery.length || starting || !onStart} onClick={() => start()}>{starting ? '…' : explicitSelectionOnly ? (locale === 'ru' ? 'Сохранить выбранные тесты' : 'Save my chosen tests') : c.start}</button>
        <span>{activeBattery.length} {quick.summary} · {questions} {c.questions} · ~{minutes} {c.minutes}</span>
      </div>
      {audience === 'guest' && <p className={styles.quickPrivacy} data-guest-start-notice>{guestStartNotice}</p>}
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
        <div className={styles.scaleFirst} data-scale-first-selection>
          <strong>{locale === 'ru' ? 'Какие показатели хотите наблюдать или поддерживать?' : 'Which indicators would you like to track or support?'}</strong>
          <p>{locale === 'ru' ? 'Выберите шкалы: первыми появятся тесты, которые их действительно измеряют. Это не диагноз.' : 'Choose scales: tests that actually measure them appear first. This is not a diagnosis.'}</p>
          <div className={styles.scaleRail} role="group" aria-label={locale === 'ru' ? 'Шкалы для подбора тестов' : 'Scales for selecting tests'}>
            {TEST_EXPLORER_AXES.map((key) => <button key={key} type="button" aria-pressed={axes.includes(key)} onClick={() => setAxes((value) => toggle(value,key))}>
              {axes.includes(key) ? '✓ ' : ''}{TEST_EXPLORER_AXIS_LABELS[key]?.[locale === 'ru' ? 'ru' : 'en'] || key}
            </button>)}
          </div>
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
          {(focus.length > 0 || appliedFilters > 0) && <button className={styles.quickFilterReset} type="button" onClick={resetFilters}>{locale === 'ru' ? 'Сбросить всё ×' : locale === 'es' ? 'Borrar todo ×' : 'Clear all ×'}</button>}
        </div>
      </div>
      <div className={styles.quickDiscoveryFooter}>
        <button type="button" className={styles.customizeButton} aria-expanded={customizeOpen} aria-controls="hh-test-customizer" onClick={() => { setCustomizeOpen((open) => !open); setActiveFilterGroup(null) }}>{customizeOpen ? '− ' + quick.hide : '⚙ ' + quick.customize}</button>
        <p className={styles.quickPrivacy}>{quick.google}</p>
      </div>
    </div>
    </div>
    <div id="hh-test-customizer" className={styles.customizer} hidden={!customizeOpen}>
      <section className={styles.guidedPicker} aria-label={locale === 'ru' ? 'Пошаговый фильтр тестов' : locale === 'es' ? 'Filtros paso a paso' : 'Step-by-step test filters'}>
        <header className={styles.guidedIntro}>
          <span className={styles.guidedStep}>{activeFilterGroup ? guidedCopy.second : guidedCopy.first}</span>
          <div className={styles.guidedLead}>
            <div><h2>{activeFilterGroup ? (guidedGroup?.label[locale] || guidedGroup?.label.en) : guidedCopy.title}</h2>
              <p>{activeFilterGroup ? (guidedGroup?.detail[locale] || guidedGroup?.detail.en) : guidedCopy.subtitle}</p></div>
            <span className={styles.guidedMatches} role="status" aria-live="polite"><strong>{matchCount}</strong> {c.matching}</span>
          </div>
        </header>
        {!activeFilterGroup ? (
          <div className={styles.guidedCategories} role="group" aria-label={guidedCopy.title}>
            {GUIDED_FILTER_GROUPS.map((group) => {
              const Icon = group.icon
              const count = guidedCounts[group.key] || 0
              return <button key={group.key} type="button" className={styles.guidedCategory} data-active={count > 0} onClick={() => setActiveFilterGroup(group.key)}>
                <span className={styles.guidedCategoryIcon}><Icon size={22} strokeWidth={1.7} aria-hidden="true" /></span>
                <span className={styles.guidedCategoryText}><strong>{group.label[locale] || group.label.en}</strong><small>{group.detail[locale] || group.detail.en}</small></span>
                <span className={styles.guidedCategoryAction}>{count ? count + ' ' + guidedCopy.active : guidedCopy.choose}</span>
                <ChevronRight aria-hidden="true" size={19} />
              </button>
            })}
          </div>
        ) : (
          <div className={styles.guidedDetail}>
            <button type="button" className={styles.guidedBack} onClick={() => setActiveFilterGroup(null)}><ArrowLeft size={17} aria-hidden="true" />{guidedCopy.back}</button>
            <div className={styles.guidedChoices}>
              {activeFilterGroup === 'topics' && <Filter label={c.themes} items={TEST_RECOMMENDATION_FOCUS} selected={focus} onToggle={(key) => setFocus((current) => toggle(current, key))} locale={locale} />}
              {activeFilterGroup === 'concerns' && <Filter label={advanced.detail} items={TEST_EXPLORER_DETAIL_TOPICS.map((item) => ({ ...item, label: { ...item.label, [locale]: `${item.label[locale] || item.label.en} · ${detailCounts[item.key] || 0}` } }))} selected={details} onToggle={(key) => setDetails((value) => toggle(value, key))} locale={locale} />}
              {activeFilterGroup === 'areas' && <Filter label={c.area} items={MONITOR_AREAS.map((area) => ({ key: area.key, label: { en: `${area.en} · ${areaCounts[area.key] || 0}`, ru: `${area.ru} · ${areaCounts[area.key] || 0}`, es: `${area.en} · ${areaCounts[area.key] || 0}` } }))} selected={areas} onToggle={(key) => setAreas((value) => toggle(value, key))} locale={locale} />}
              {activeFilterGroup === 'scales' && <Filter label={advanced.scales} items={TEST_EXPLORER_AXES.map((key) => ({ key, label: { ...TEST_EXPLORER_AXIS_LABELS[key], en: `${TEST_EXPLORER_AXIS_LABELS[key].en} · ${axisCounts[key] || 0}`, ru: `${TEST_EXPLORER_AXIS_LABELS[key].ru} · ${axisCounts[key] || 0}` } }))} selected={axes} onToggle={(key) => setAxes((value) => toggle(value, key))} locale={locale} />}
              {activeFilterGroup === 'timing' && <div className={styles.guidedOptionStack}>
                <Filter label={advanced.time} items={[{ key: '0', label: { en: advanced.any } }, { key: '2', label: { en: advanced.two } }, { key: '5', label: { en: advanced.five } }, { key: '10', label: { en: advanced.ten } }]} selected={[String(maxMinutes)]} onToggle={(key) => setMaxMinutes(Number(key))} locale={locale} single />
                <Filter label={c.length} items={TEST_LENGTH_FILTERS} selected={lengths} onToggle={(key) => setLengths((value) => toggle(value, key))} locale={locale} />
                <Filter label={c.depth} items={depthOptions.map((key) => ({ key, label: { en: key[0].toUpperCase() + key.slice(1), ru: key === 'quick' ? 'Быстро' : key === 'balanced' ? 'Сбалансированно' : 'Глубоко', es: key === 'quick' ? 'Breve' : key === 'balanced' ? 'Equilibrada' : 'Profunda' } }))} selected={[depth]} onToggle={setDepth} locale={locale} single />
              </div>}
              {activeFilterGroup === 'format' && <div className={styles.guidedOptionStack}>
                <KindCheckboxFilters locale={locale} selected={kinds} onToggle={(key) => setKinds((current) => toggle(current, key))} />
                <Filter label={c.style} items={TEST_STYLE_FILTERS} selected={stylesFilter} onToggle={(key) => setStylesFilter((value) => toggle(value, key))} locale={locale} />
                <label className={styles.check}><input type="checkbox" checked={freeOnly} onChange={(event) => setFreeOnly(event.target.checked)} />{c.free}</label>
              </div>}
              {activeFilterGroup === 'language' && <Filter label={advanced.language} items={[{ key: 'any', label: { en: advanced.any } }, { key: 'bilingual', label: { en: advanced.bilingual } }, { key: 'english', label: { en: advanced.english } }]} selected={[language]} onToggle={setLanguage} locale={locale} single />}
              {activeFilterGroup === 'goal' && <Filter label={advanced.tracking} items={[{ key: 'any', label: { en: advanced.any } }, { key: 'repeat', label: { en: advanced.repeat } }, { key: 'baseline', label: { en: advanced.baseline } }]} selected={[tracking]} onToggle={setTracking} locale={locale} single />}
              {activeFilterGroup === 'describe' && <div className={styles.guidedDescription}><section className={styles.concernPanel} aria-labelledby="hh-concern-title">
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
        </section></div>}
            </div>
            <p className={styles.guidedTip}>{guidedCopy.done}</p>
          </div>
        )}
        <footer className={styles.guidedFooter}>
          <span className={styles.guidedSelected} role="status">{guidedCount} {guidedCopy.selected}</span>
          <button type="button" className={styles.guidedClear} onClick={resetFilters}>{c.filterClear}</button>
          <button type="button" className={styles.guidedResults} onClick={() => { setCustomizeOpen(false); setActiveFilterGroup(null); document.getElementById('hh-test-list')?.scrollIntoView({ block: 'start', behavior: 'smooth' }) }}>
            {guidedCopy.results} ({matchCount}) <ChevronRight size={18} aria-hidden="true" />
          </button>
        </footer>
      </section>
    </div>
    <section id="hh-test-list" className={styles.catalogTopbar} aria-label={locale === 'ru' ? 'Каталог тестов' : locale === 'es' ? 'Catálogo de pruebas' : 'Test catalog'}>
      {initialAxis && axes.includes(initialAxis) && <div className={styles.portraitAxisBrowse} data-testid="portrait-axis-test-choices">
        <strong>{locale === 'ru' ? 'Тесты для шкалы' : locale === 'es' ? 'Pruebas para' : 'Tests for'}: {TEST_EXPLORER_AXIS_LABELS[initialAxis]?.[locale] || TEST_EXPLORER_AXIS_LABELS[initialAxis]?.en || initialAxis}</strong>
        <p>{locale === 'ru'
          ? 'Выберите один или несколько тестов, измеряющих эту шкалу. Тестирование не запускается автоматически.'
          : locale === 'es' ? 'Elige las pruebas que miden esta escala. Ninguna comienza automáticamente.'
            : 'Choose from tests that measure this scale. Nothing starts automatically.'}</p>
      </div>}
      <div className={styles.catalogTopline}>
        <div className={styles.catalogHeading}>
          <p className={styles.eyebrow}>{locale === 'ru' ? 'Ваш выбор' : locale === 'es' ? 'Tu selección' : 'Make it personal'}</p>
          <h2>{locale === 'ru' ? 'Выберите подходящие тесты' : locale === 'es' ? 'Elige tus pruebas' : 'Find the tests that fit you'}</h2>
          <p>{locale === 'ru' ? 'Отмечайте тесты в каталоге. Счётчик, подборка и зоны на портрете обновятся автоматически.' : locale === 'es' ? 'Selecciona pruebas. El contador y las áreas destacadas se actualizan automáticamente.' : 'Browse and tick the tests you want. Your selected set and highlighted focus areas update immediately.'}</p>
        </div>
    <div className={styles.availability} role="tablist" aria-label={c.title}><button type="button" role="tab" aria-selected={availability === 'available'} onClick={() => setAvailability('available')}>{c.available}</button><button type="button" role="tab" aria-selected={availability === 'core'} onClick={() => setAvailability('core')}>{c.core100}</button><button type="button" role="tab" aria-selected={availability === 'pdf'} onClick={() => { setAvailability('pdf'); setMaxMinutes(0); setFreeOnly(false); setLanguage('any'); setTracking('any'); setFocus([]); setProblems([]); setDetails([]); setAxes([]); setAreas([]); setKinds([]); setStylesFilter([]); setLengths([]); setAxisFilter(null); setQuery('') }}>{locale === 'ru' ? 'PDF: шкалы' : locale === 'es' ? 'PDF: escalas' : 'PDF scale guides'} ({pdfResourceCount})</button><button type="button" role="tab" aria-selected={availability === 'full'} onClick={() => setAvailability('full')}>{c.full}</button></div>
      </div>
      {availability === 'core' && <p className={styles.quickPrivacy}>{c.coreNote}</p>}
      {availability === 'pdf' && <p className={styles.quickPrivacy}>{locale === 'ru' ? 'Профессиональные шкалы: скачать PDF-справку можно бесплатно. Это не оригинальный опросник: защищённые вопросы, ответы и нормы в PDF не воспроизводятся.' : locale === 'es' ? 'Guías de escalas profesionales en PDF. No son cuestionarios originales: no incluyen preguntas, claves ni baremos protegidos.' : 'Professional scales: download an educational PDF guide. It is not the original questionnaire and contains no restricted questions, scoring keys or proprietary norms.'}</p>}
      <div className={styles.catalogControls}>
        <label className={styles.catalogSearchLabel}>
          <span>{locale === 'ru' ? 'Найти тест' : locale === 'es' ? 'Buscar pruebas' : 'Search tests'}</span>
      <input className={styles.search} type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={c.search} aria-label={c.search} />
        </label>
      <label className={styles.sort}>{c.sort}<select value={sort} onChange={(event) => setSort(event.target.value)}><option value="recommended">{c.recommended}</option><option value="shortest">{c.shortest}</option><option value="deepest">{c.deepest}</option><option value="alphabetic">{c.alphabetic}</option><option value="type">{locale === "ru" ? "По типу теста" : locale === "es" ? "Por tipo" : "By type"}</option><option value="popular">{socialCopy.popular}</option><option value="rating">{socialCopy.rating}</option></select></label>
      </div>
    </section>
    {availability === 'full' && <PriorityMethodsReview locale={locale} runnableKeys={entries.filter((entry) => entry.selectable).map((entry) => entry.key)} onOpenCfpbShort={() => { setAvailability('available'); setQuery('CFPB'); document.getElementById('hh-test-list')?.scrollIntoView({ block: 'start', behavior: 'smooth' }) }} />}
    {availability === 'full' && <ResearchDirectory locale={locale} search={query} />}
    <div className={styles.workspace}><div className={styles.database}><div className={styles.databaseHeader}><div className={styles.countBlock}><strong role="status" aria-live="polite">{matchCount} {c.matching}</strong><small>{c.of} {availability === 'available' ? entries.filter((entry) => entry.selectable).length : availability === 'core' ? entries.filter((entry) => entry.psychotherapyCore).length : availability === 'pdf' ? pdfResourceCount : entries.length} · {c.totalAvailable}{selectedKeys.length > 0 && ` · ${selectedKeys.length} ${c.kept}`}</small></div><button type="button" onClick={chooseSuggested}>{c.suggested}</button></div>
      {viaStandaloneMatches > 0 && !query.trim() && <div className={styles.viaFamilyNote} data-via-family-collapsed={collapsedViaCount}>
        <span>{locale === 'ru' ? 'IPIP-VIA-R: полный профиль 24 сильных сторон доступен одним тестом на 96 вопросов. Отдельные шкалы сохранены.' : locale === 'es' ? 'IPIP-VIA-R: explora las 24 fortalezas con una prueba de 96 preguntas. Las escalas individuales siguen disponibles.' : 'IPIP-VIA-R: explore 24 strengths in one optional 96-question test. Individual scales remain available.'}</span>
        <button type="button" aria-expanded={showStandaloneVia} onClick={() => setShowStandaloneVia((value) => !value)}>{showStandaloneVia ? (locale === 'ru' ? 'Свернуть отдельные шкалы' : locale === 'es' ? 'Ocultar escalas individuales' : 'Hide individual scales') : (locale === 'ru' ? `Показать отдельные шкалы (${viaStandaloneMatches})` : locale === 'es' ? `Mostrar escalas individuales (${viaStandaloneMatches})` : `Show individual scales (${viaStandaloneMatches})`)}</button>
      </div>}
      {visibleCatalog.length === 0 && <p className={styles.emptyState} role="status">{c.noMatches}</p>}
      <div className={styles.list}>{(showAll ? visibleCatalog : visibleCatalog.slice(0, 8)).map((entry, index) => <article key={entry.key} className={`${styles.row} ${selectedKeys.includes(entry.key) ? styles.rowSelected : ''} ${axisFilter && entry.measurementAxes?.includes(axisFilter) ? styles.rowAxis : ''}`}>
        <div className={styles.rowSelect}>{entry.selectable ? <input type="checkbox" checked={selectedKeys.includes(entry.key)} onChange={() => toggleSelected(entry.key)} aria-label={entry.title} /> : <span className={styles.status}>{entry.pdfResource ? 'PDF' : entry.source === 'research' ? c.metadata : entry.managedSafety ? 'Managed safety' : entry.rightsStatus}</span>}</div>
        <TestArtwork entry={entry} />
        <div className={styles.rowBody}><div className={styles.rowTitle}><span className={styles.area}>{availability === 'core' && entry.psychotherapyCoreCategory ? (PSYCHOTHERAPY_CORE_CATEGORIES[entry.psychotherapyCoreCategory]?.[locale] || PSYCHOTHERAPY_CORE_CATEGORIES[entry.psychotherapyCoreCategory]?.en || entry.area) : entry.area}</span><h2>{entry.title}</h2><TestKindBadge entry={entry} locale={locale} />{index === 0 && entry.selectable && (focus.length > 0 || appliedFilters > 0) && <b>{c.best}</b>}{entry.marginalCoverageGain >= .08 && selected.length > 0 && <b>{c.complements}</b>}</div><p>{availability === 'core' ? (entry.psychotherapyCoreSummary || entry.description || entry.category) : (entry.description || entry.category)}</p>{entry.methodology && entry.methodologyStatus !== 'original' && <p className={styles.methodology}>{entry.methodology}{entry.methodologySourceUrl && <a className={styles.sourceLink} href={entry.methodologySourceUrl} rel="noopener noreferrer" target="_blank">{locale === 'ru' ? 'Источник' : 'Source'}</a>}</p>}{entry.validity && <p className={styles.methodology} data-psychometric-evidence={entry.validity.status} data-test-evidence-key={entry.validity.key}><strong>{(VALIDITY_COPY[locale] || VALIDITY_COPY.en).label}: </strong>{entry.validity.grade ? (VALIDITY_COPY[locale] || VALIDITY_COPY.en).graded + ' ' + entry.validity.grade : (VALIDITY_COPY[locale] || VALIDITY_COPY.en)[entry.validity.status]} · {(VALIDITY_COPY[locale] || VALIDITY_COPY.en).locale}: {entry.validity.respondentLocale}</p>}
        <TestScaleGuide guide={entry.scaleGuide} locale={locale} selectedAxes={axes} onSelectAxis={(key) => setAxes((current) => toggle(current,key))} />
        {!entry.selectable && entry.pdfResource && <div className={styles.pdfResource} data-professional-pdf={entry.key}>
          <div className={styles.pdfResourceActions}>
            <a className={styles.pdfResourcePrimary} href={`/api/assessments/scale-guide/${encodeURIComponent(entry.key)}`} download={`${entry.key}-scale-guide.pdf`}><FileDown size={17} aria-hidden="true" />{locale === 'ru' ? 'Скачать описание шкал (PDF)' : locale === 'es' ? 'Descargar guía de escalas (PDF)' : 'Download scale guide (PDF)'}</a>
            
          </div>
          <small>{locale === 'ru' ? 'Содержит названия и назначение шкал, ограничения использования и ссылку на источник. Не содержит закрытых вопросов и не заменяет тест.' : locale === 'es' ? 'Incluye nombres de escalas y condiciones de uso, sin preguntas protegidas. No sustituye la prueba.' : 'Contains scale names, measurement context, rights notes and sources - no restricted test items. Not a substitute for the assessment.'}</small>
        </div>}
        {!entry.selectable && entry.officialSource && <div className={styles.pdfResource} data-official-original-source={entry.key}>
          <a className={styles.pdfResourceSecondary} href={entry.officialSource.url} target="_blank" rel="noopener noreferrer" aria-label={entry.officialSource.owner}>
            <FileDown size={17} aria-hidden="true" /> {(VALIDITY_COPY[locale] || VALIDITY_COPY.en)[entry.officialSource.directPdf ? 'direct' : 'open']} ↗
          </a>
          <small>{(VALIDITY_COPY[locale] || VALIDITY_COPY.en).caution} {entry.officialSource.notice}</small>
        </div>}
        {audience === 'account' && historyByKey.has(entry.key) && (() => { const h = historyByKey.get(entry.key); return <div className={styles.historyStatus}><strong>{h.count ? (locale === 'ru' ? `Пройдено: ${h.count}` : `Completed: ${h.count}`) : (locale === 'ru' ? 'Не завершён' : 'Not completed')}</strong>{h.latest && <span> · {locale === 'ru' ? 'Последний' : 'Last'}: {new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(new Date(h.latest.measurementAt))}</span>}{h.draft && <button type="button" onClick={() => onResumeRun?.(h.draft)}>{locale === 'ru' ? `Продолжить (${Math.min(100, Math.round(100 * (h.draft.progress || 0) / Math.max(1, entry.questionCount || 1)))}%)` : `Resume (${Math.max(0, h.draft.progress || 0)}%)`}</button>}{h.latest && <Link href={`/${locale}/app/results/${h.latest.id}`}>{locale === 'ru' ? 'Результат' : 'View result'}</Link>}</div> })()}<div className={styles.meta}><span>{entry.questionCount ?? '—'} {c.questions}</span><span>~{entry.durationMinutes ?? '—'} {c.minutes}</span><span>{entry.testStyle}</span><span>{entry.testLength}</span>{entry.acronym && <span>{entry.acronym}</span>}</div>
        {entry.selectable && socialStats[entry.key] && (socialStats[entry.key].starts > 0 || socialStats[entry.key].ratingCount > 0) && <div className={styles.socialProof} data-test-social-proof={entry.key}>
          {socialStats[entry.key].ratingCount > 0 && <strong aria-label={socialCopy.userScore}>{'★ ' + Number(socialStats[entry.key].averageRating).toFixed(1)} <small>({socialStats[entry.key].ratingCount} {socialCopy.votes})</small></strong>}
          <span>{socialStats[entry.key].starts} {socialCopy.launches} · {socialStats[entry.key].completions} {socialCopy.completed}</span>
        </div>}</div>

      </article>)}</div>
        {visibleCatalog.length > 8 && <button className={styles.showMore} type="button" onClick={() => setShowAll((value) => !value)}>{showAll ? quick.showLess : `${quick.showAll} (${visibleCatalog.length})`}</button>}
      </div>
    </div>
      <footer className={styles.battery}>
        <div>
          <strong>{activeBattery.length ? `${activeBattery.length} · ${questions} ${c.questions} · ~${minutes} ${c.minutes} · ${activeCoverage.coveredCount} ${c.axes} · ${breadth}` : c.choose}</strong>
          {(activeBattery.length > 8 || minutes > 30) && <p>{c.warning}</p>}
          <small>{audience === 'guest' ? guestStartNotice : c.privacy}</small>
        </div>
        <div>
          <button type="button" onClick={() => setSelectedKeys([])}>{quick.resetSet}</button>
          <button className={styles.primary} type="button" data-test-action={explicitSelectionOnly ? 'save' : 'start'} disabled={!activeBattery.length || starting || !onStart} onClick={() => start()}>{starting ? '…' : explicitSelectionOnly ? (locale === 'ru' ? 'Сохранить выбранные тесты' : 'Save my chosen tests') : c.start}</button>
        </div>
      </footer>
  </section>
}

function Filter({ label, items, selected, onToggle, locale, single = false }) { return <fieldset className={styles.filter}><legend>{label}</legend>{items.map((item) => <button type="button" key={item.key} aria-pressed={selected.includes(item.key)} onClick={() => onToggle(item.key)}>{item.label[locale] || item.label.en}</button>)}</fieldset> }
