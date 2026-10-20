'use client'

import Link from 'next/link'
import { DiscoverySectionTabs } from '../discovery-section-tabs'
import { useEffect, useState } from 'react'
import { Activity, ArrowRight, Check, ChevronDown, Clock3, Compass, BookOpen, GraduationCap, Layers, ListChecks, BriefcaseBusiness, CirclePlus, Search, Heart, Leaf, Moon, Play, ShieldCheck, SlidersHorizontal, Smile, Sparkles, Sun, Target, Users, Zap } from 'lucide-react'
import styles from './simple-test-picker.module.css'
import academyStyles from '../academy-discovery.module.css'
import { problemsForTopics } from '@/lib/assessments/test-problems'
import { availableTestCollections, TEST_TOPIC_COLLECTIONS } from '@/lib/assessments/test-collections'
import { testCollectionIds } from '@/lib/assessments/test-collection-membership'
import { TestScaleGuide } from './test-scale-guide'
import { HOME_TEST_TOPICS } from '@/lib/assessments/insights-categories'
import { TEST_RECOMMENDATION_FOCUS } from '@/lib/assessments/test-recommendations'
import { TEST_KINDS, testKindCardLabel, testKindShortLabel } from '@/lib/assessments/test-kinds'
import { groupViaRecommendations, resolveViaProfile, VIA_PROFILE_KEY } from '@/lib/assessments/via-family'
import { searchPublicTestEntries } from '@/lib/assessments/test-explorer'

const TEXT = {
  en: {
    kicker:'FREE WELLBEING MONITORING', title:'Choose your tests',
    heroKicker:'FREE SELF-CHECKS · HOLISTIC HOUSE', heroHeadline:'Understand yourself. Find your next step.',
    heroDescription:'Explore stress, mood, sleep and inner resources with free self-checks. See your results as soon as you finish.',
    heroPrimary:'Choose my topics', heroSecondary:'Browse free tests',
    heroFootnote:'Available tests and sets start without registration. Sign in for a free personal analysis.',
    heroSearchLabel:'Find a self-check test', heroSearchPlaceholder:'e.g. stress, sleep, mood or relationships…', heroSearchAction:'Find my tests', heroTopicFilter:'Topic', heroAllTopics:'All topics', heroTypeFilter:'Test type', heroAllTypes:'All types', heroTabTests:'Tests', heroTabCourses:'Courses', heroTabAssist:'Assist', heroPicks:'You could try', heroSearchClear:'Clear search',
    lead:'Choose what you want to monitor — stress, mood, sleep or inner resources. We’ll suggest relevant self-checks.',
    first:'What would you like to explore?', firstHelp:'Select one or more areas. We will recommend tests using the scales they actually measure.',
    detail:'Detailed selection (optional)', detailHelp:'Set recommendation order, time and test types.',
    activeFilters:'Active filters', kindsTitle:'Test types', kindsHelp:'Select one or several. If none are selected, all types are included.',
    depth:'Which tests would you like to see first?', depthHelp:'Adjusts the order and estimated match of recommendations, without hiding tests. Set a time limit below.',
    quick:'Shorter tests', quickNote:'Prioritize shorter questionnaires',
    balanced:'Balanced', balancedNote:'Prioritize medium-length questionnaires',
    deep:'Longer tests', deepNote:'Prioritize longer questionnaires',
    time:'Time per test', anyTime:'Any duration', shortTime:'Up to 5 min', mediumTime:'Up to 10 min',
    professional:'Professional tests only', clear:'Clear optional filters',
    recommended:'Recommended for you', recommendedHelp:'Based on your topics, optional collection, concerns and test-type filters.',
    courseCta:'Start my personal course', courseCtaHint:'Continue to course setup and review these tests.', syncHint:'Already selected from your themes. You can edit the concerns below.',
    why:'Why these tests?', whyText:'The approximate match considers your selected topics, the optional collection, specific concerns and measured scales. Test-type and time filters limit which tests are shown; depth changes their order. Unrelated tests stay available when permitted by those filters. This is not a clinical probability, diagnosis or health score.',
    suggested:'Suggested', available:'Available', selected:'selected', matching:'matching tests', takeTest:'Take test', details:'Details', expandTest:'What it measures', scalesLabel:'Measured scales', methodDetails:'Method & sources', sourceLink:'Original source', questionUnit:'questions', minuteUnit:'min',
    minutes:'min total', viewSelection:'Included in your plan', none:'No available tests match. Try a different topic or clear optional filters.',
    build:'Start free monitoring', buildHelp:'No registration required to start',
    browse:'Browse full database', core100:'100 psychotherapy tests', privacy:'Results stay temporary in this browser; create or open your Cabinet for a free personal analysis.',
    noTests:'Choose a test to continue.', reset:'Use suggested set', back:'Back to easy selection', saved:'Already have a plan? Open my saved tests',
    more:'Show {count} more tests', showing:'Showing {shown} of {total} matching tests', fit:'match', fitInfo:'Estimated relevance from your selected topics and concerns — not a clinical score or diagnosis.',
    selectAll:'Select all',clearAll:'Clear topics',skip:'Skip',problemSearch:'e.g. trouble relaxing, low energy, relationships…',noProblemMatches:'No matching concerns.',filterTitle:'Filter tests',filters:'Filters',problemsTitle:'Which problems are most important?', problemsHelp:'Optional: choose what specifically troubles you. These suggestions come from the topics above.', problemsEmpty:'Choose a topic above to see relevant concerns.', problemsClear:'Clear problems', problemsMore:'Show more problems', problemsLess:'Show fewer problems',
  },
  ru: {
    kicker:'БЕСПЛАТНЫЙ МОНИТОРИНГ', title:'Подберите свои тесты',
    heroKicker:'БЕСПЛАТНЫЕ ТЕСТЫ · HOLISTIC HOUSE', heroHeadline:'Лучше поймите себя. Найдите следующий шаг.',
    heroDescription:'Исследуйте стресс, настроение, сон и внутренние ресурсы с помощью бесплатных тестов. Результаты доступны сразу после прохождения.',
    heroPrimary:'Выбрать темы', heroSecondary:'Посмотреть тесты',
    heroFootnote:'Доступные тесты и наборы проходятся без регистрации. После входа — бесплатные пояснения и анализ.',
    heroSearchLabel:'Поиск тестов', heroSearchPlaceholder:'Например: стресс, сон, настроение, отношения…', heroSearchAction:'Найти тесты', heroTopicFilter:'Тема', heroAllTopics:'Все темы', heroTypeFilter:'Тип теста', heroAllTypes:'Все типы', heroTabTests:'Тесты', heroTabCourses:'Курсы', heroTabAssist:'Помощь', heroPicks:'Попробуйте', heroSearchClear:'Сбросить поиск',
    lead:'Выберите, за чем хотите наблюдать: стресс, настроение, сон или внутренние ресурсы. Мы предложим подходящие опросники.',
    first:'Что вы хотите исследовать?', firstHelp:'Отметьте важные темы. Мы подберём тесты по шкалам, которые они действительно измеряют.',
    detail:'Подробный подбор (необязательно)', detailHelp:'Настройте порядок рекомендаций, время и типы тестов.',
    activeFilters:'Активные фильтры', kindsTitle:'Типы тестов', kindsHelp:'Можно выбрать несколько. Без выбора доступны все типы.',
    depth:'Какие тесты показывать первыми?', depthHelp:'Влияет на порядок и условный % соответствия. Тесты остаются доступны; ограничение времени — ниже.',
    quick:'Короткие', quickNote:'Сначала короткие анкеты',
    balanced:'Баланс', balancedNote:'Сначала тесты средней длины',
    deep:'Длинные', deepNote:'Сначала более длинные анкеты',
    time:'Время на один тест', anyTime:'Любое', shortTime:'До 5 мин', mediumTime:'До 10 мин',
    professional:'Только профессиональные тесты', clear:'Очистить дополнительные фильтры',
    recommended:'Рекомендуем для вас', recommendedHelp:'С учётом ваших тем, подборки, проблем и выбранных типов тестов.',
    courseCta:'Начать персональный курс', courseCtaHint:'Перейти к запуску курса с выбранной подборкой тестов.', syncHint:'Эти проблемы уже отмечены по выбранным подтемам. Можно изменить выбор.',
    why:'Почему эти тесты?', whyText:'Процент учитывает выбранные темы, необязательную подборку, конкретные проблемы и измеряемые шкалы. Тип и время ограничивают список тестов, глубина влияет на порядок. Это не диагноз, клиническая вероятность или процент здоровья.',
    suggested:'Подходит', available:'Доступен', selected:'выбрано', matching:'подходящих тестов', takeTest:'Пройти', details:'Подробнее', expandTest:'Что измеряет', scalesLabel:'Шкалы', methodDetails:'Методика и источники', sourceLink:'Первоисточник', questionUnit:'вопросов', minuteUnit:'мин',
    minutes:'мин всего', viewSelection:'В вашем наборе', none:'Подходящих доступных тестов нет. Выберите другую тему или сбросьте фильтры.',
    build:'Начать бесплатный мониторинг', buildHelp:'Для прохождения регистрация не нужна',
    browse:'Открыть всю базу тестов', core100:'100 тестов психотерапии', privacy:'Результаты временно сохраняются в этом браузере. Для бесплатного анализа создайте кабинет или войдите в него.',
    noTests:'Выберите тест для продолжения.', reset:'Вернуть рекомендованный набор', back:'Назад к простому подбору', saved:'Уже есть подборка? Открыть мои тесты',
    more:'Показать ещё {count} тестов', showing:'Показано {shown} из {total} подходящих тестов', fit:'соответствие', fitInfo:'Ориентировочная релевантность по выбранным темам и проблемам — не диагноз и не показатель здоровья.',
    selectAll:'Выбрать все',clearAll:'Снять выбор',skip:'Пропустить',problemSearch:'Например: не могу расслабиться, мало энергии, отношения…',noProblemMatches:'Уточнения не найдены.',filterTitle:'Фильтры тестов',filters:'Фильтры',problemsTitle:'Какие проблемы беспокоят?', problemsHelp:'Необязательно: уточните запрос. Варианты зависят от выбранных тем.', problemsEmpty:'Сначала выберите тему — появятся соответствующие проблемы.', problemsClear:'Очистить проблемы', problemsMore:'Показать больше проблем', problemsLess:'Показать меньше проблем',
  },
  es: {
    kicker:'MONITOREO GRATUITO', title:'Elige tus pruebas',
    heroKicker:'PRUEBAS GRATUITAS · HOLISTIC HOUSE', heroHeadline:'Conócete mejor. Descubre tu próximo paso.',
    heroDescription:'Explora el estrés, el ánimo, el sueño y tus recursos internos con pruebas gratuitas. Consulta tus resultados al terminar.',
    heroPrimary:'Elegir temas', heroSecondary:'Ver pruebas gratuitas',
    heroFootnote:'Puedes hacer pruebas y conjuntos disponibles sin registrarte. Entra para recibir un análisis personal gratuito.',
    heroSearchLabel:'Buscar pruebas gratuitas', heroSearchPlaceholder:'p. ej. estrés, sueño, ánimo o relaciones…', heroSearchAction:'Buscar pruebas', heroTopicFilter:'Tema', heroAllTopics:'Todos los temas', heroTypeFilter:'Tipo de prueba', heroAllTypes:'Todos los tipos', heroTabTests:'Pruebas', heroTabCourses:'Cursos', heroTabAssist:'Ayuda', heroPicks:'Prueba', heroSearchClear:'Borrar búsqueda',
    lead:'Elige lo que quieres observar: estrés, ánimo, sueño o recursos personales. Te sugeriremos cuestionarios adecuados.',
    first:'¿Qué te gustaría explorar?', firstHelp:'Elige los temas importantes. Priorizaremos pruebas según las escalas que realmente miden.',
    detail:'Selección detallada (opcional)', detailHelp:'Ordena las recomendaciones y filtra por tiempo o tipo.',
    activeFilters:'Filtros activos', kindsTitle:'Tipos de pruebas', kindsHelp:'Elige uno o varios. Sin seleccionar, se incluyen todos.',
    depth:'¿Qué pruebas quieres ver primero?', depthHelp:'Ajusta el orden y la coincidencia estimada sin ocultar pruebas. Puedes limitar el tiempo abajo.',
    quick:'Cortas', quickNote:'Priorizar cuestionarios cortos',
    balanced:'Equilibrado', balancedNote:'Priorizar duración media',
    deep:'Largas', deepNote:'Priorizar cuestionarios más largos',
    time:'Tiempo por prueba', anyTime:'Sin límite', shortTime:'Hasta 5 min', mediumTime:'Hasta 10 min',
    professional:'Solo pruebas profesionales', clear:'Borrar filtros opcionales',
    recommended:'Recomendados para ti', recommendedHelp:'Según tus temas, colección opcional, dificultades y tipos de prueba.',
    courseCta:'Iniciar mi curso personal', courseCtaHint:'Revisar pruebas y configurar el curso.', syncHint:'Tus temas ya seleccionaron estas preocupaciones; puedes editarlas.',
    why:'¿Por qué estas pruebas?', whyText:'La coincidencia estimada combina los temas, la colección opcional, las dificultades y las escalas medidas. Los filtros de tipo y tiempo limitan los resultados; la profundidad ajusta el orden. No es una probabilidad clínica ni un diagnóstico.',
    suggested:'Sugerida', available:'Disponible', selected:'seleccionadas', matching:'pruebas coincidentes', takeTest:'Realizar', details:'Detalles', expandTest:'Qué mide', scalesLabel:'Escalas', methodDetails:'Método y fuentes', sourceLink:'Fuente original', questionUnit:'preguntas', minuteUnit:'min',
    minutes:'min en total', viewSelection:'En tu selección', none:'No hay pruebas disponibles con estos filtros.',
    build:'Iniciar monitoreo gratuito', buildHelp:'Sin registro para comenzar',
    browse:'Explorar base completa', core100:'100 pruebas de psicoterapia', privacy:'Los resultados son temporales en este navegador. Entra a tu espacio para el análisis gratuito.',
    noTests:'Elige una prueba para continuar.', reset:'Usar selección sugerida', back:'Volver al selector sencillo', saved:'¿Ya tienes pruebas? Abrir mis pruebas',
    more:'Mostrar {count} pruebas más', showing:'Mostrando {shown} de {total} pruebas', fit:'coincidencia', fitInfo:'Relevancia estimada por temas y dificultades seleccionadas; no es un diagnóstico.',
    selectAll:'Elegir todo',clearAll:'Quitar selección',skip:'Omitir',problemSearch:'Por ejemplo: tensión, poca energía, relaciones…',noProblemMatches:'Sin resultados.',filterTitle:'Filtrar pruebas',filters:'Filtros',problemsTitle:'¿Qué dificultades te preocupan?', problemsHelp:'Opcional: concreta tus inquietudes según los temas elegidos.', problemsEmpty:'Elige primero un tema para ver dificultades relacionadas.', problemsClear:'Borrar dificultades', problemsMore:'Mostrar más dificultades', problemsLess:'Mostrar menos dificultades',
  },
}

// These keys are mapped to existing test facets and shared with Insights.
const TEST_KIND_ICONS = { professional: GraduationCap, monitoring: Activity, hobby: Sparkles }
const TOPIC_ICONS = { stress: Zap, anxiety: Heart, mood: Smile, sleep: Moon,
  body: Sun, relationships: Users, resources: Leaf, attention: Target, function: BriefcaseBusiness, health: CirclePlus }
// The ninth visible topic reuses the existing functioning/work discovery facet.
const TOPICS = [...HOME_TEST_TOPICS, { key: 'function', en: 'Work & daily life', ru: 'Работа и дела', es: 'Trabajo y vida' },
  // Existing physical-wellbeing/recovery scales, not a new medical test or diagnosis.
  { key: 'health', en: 'Health', ru: 'Здоровье', es: 'Salud' }]
  .map((topic) => ({ ...topic, Icon: TOPIC_ICONS[topic.key] }))
// The quick tabs and detailed checkboxes use the same source-backed kind facet.
const BROWSE_TABS = Object.freeze([
  { key: 'all', label: { en: 'All', ru: 'Все', es: 'Todos' } },
  { key: 'monitoring' },
  { key: 'professional' },
  { key: 'hobby' },
])

// The collection cards browse the same real test catalog; they never auto-start a test.
const COLLECTION_ICONS = {
  stress: Zap, relationships: Heart, tantra: Sparkles, sexuality: ShieldCheck,
  sleep: Moon, resources: Leaf, personality: Compass, mood: Smile,
  attention: Target, body: Activity, meaning: Sun, wellbeing: CirclePlus,
}
const COLLECTION_COPY = {
  en: { eyebrow: 'DISCOVER BY THEME', title: 'Test collections by topic (optional)',
    intro: 'Explore available tests in each collection. Select the tests you want below.',
    test: 'test', tests: 'tests', more: 'Show all collections', less: 'Show fewer collections',
    open: 'Prioritize collection', personalized: 'Prioritized from your selected topics and concerns. Counts reflect available tests and your time/type filters.',
    badge: 'Collection', prioritized: 'Higher priority from collection:', clear: 'Remove priority', tip: 'Included in collections:' },
  ru: { eyebrow: 'ТЕМАТИЧЕСКИЕ ПОДБОРКИ', title: 'Подборки тестов по темам (необязательно)',
    intro: 'Посмотрите доступные тесты по каждой теме. Ниже можно выбрать нужные.',
    test: 'тест', tests: 'тестов', more: 'Показать все подборки', less: 'Свернуть подборки',
    open: 'Повысить приоритет подборки', personalized: 'Подборки упорядочены по вашим темам и запросам. Количество учитывает доступные тесты, время и тип.',
    badge: 'Подборка', prioritized: 'Приоритет подборки:', clear: 'Снять приоритет', tip: 'Входит в подборки:' },
  es: { eyebrow: 'EXPLORA POR TEMA', title: 'Colecciones de pruebas por tema (opcional)',
    intro: 'Descubre las pruebas disponibles para cada tema. Elige las que quieras más abajo.',
    test: 'prueba', tests: 'pruebas', more: 'Mostrar todas las colecciones', less: 'Mostrar menos',
    open: 'Priorizar colección', personalized: 'Ordenadas por tus temas e inquietudes. Los totales reflejan pruebas disponibles y los filtros de tiempo y tipo.',
    badge: 'Colección', prioritized: 'Prioridad de colección:', clear: 'Quitar prioridad', tip: 'Incluida en las colecciones:' },
}

// Always display the explicit assessment type, including on narrow phones.
function KindBadge({ entry, locale }) {
  const kind = TEST_KINDS.find((type) => type.key === entry?.testKind)
  if (!kind) return null
  const Icon = TEST_KIND_ICONS[kind.key]
  const label = testKindShortLabel(entry, locale)
  const evidence = testKindCardLabel(entry, locale)
  const prefix = locale === 'ru' ? 'Тип' : locale === 'es' ? 'Tipo' : 'Type'
  return <span className={styles.testKindBadge} data-test-kind-badge={kind.key}
    title={`${evidence}. ${kind.description[locale] || kind.description.en}`}
    aria-label={`${prefix}: ${label}. ${evidence}`}>
    <Icon size={14} aria-hidden="true" />
    <span className={styles.kindBadgeText}>{prefix}: {label}</span>
  </span>
}

const VIA_COPY = {
  en: { title: 'Character strengths · IPIP-VIA-R', description: 'One optional 96-question profile of 24 strengths, using original English IPIP items. Not the proprietary VIA Survey.', select: 'Select full profile', selected: 'Remove full profile', expand: 'Show individual strengths', collapse: 'Hide individual strengths' },
  ru: { title: 'Сильные стороны · IPIP-VIA-R', description: 'Один дополнительный тест: 96 английских вопросов и 24 шкалы сильных сторон. Не является официальным опросником VIA Survey.', select: 'Выбрать полный профиль', selected: 'Убрать полный профиль', expand: 'Показать отдельные шкалы', collapse: 'Свернуть отдельные шкалы' },
  es: { title: 'Fortalezas · IPIP-VIA-R', description: 'Un perfil opcional de 96 preguntas originales en inglés y 24 fortalezas. No es la encuesta propietaria VIA.', select: 'Seleccionar perfil completo', selected: 'Quitar perfil completo', expand: 'Ver escalas individuales', collapse: 'Ocultar escalas individuales' },
}

// Lightweight images already in the site bundle; avoid additional image transformations.
function artworkFor(entry) {
  const topics = entry.topics || []
  if (topics.includes('relationships') || topics.includes('support')) return '/images/holistic-house/assessment-lotus.svg'
  if (topics.includes('stress') || topics.includes('energy') || topics.includes('recovery')) return '/images/holistic-house/assessment-lotus.svg'
  return '/images/holistic-house/course-calm-illustration.svg'
}

export function SimpleTestPicker({
  locale = 'en', authenticated = false, initialMode = 'tests',
  focus, onToggleFocus,
  problems = [], onToggleProblem, onClearProblems,
  depth, onDepth,
  maxMinutes, onMaxMinutes,
  testKinds = [], onToggleTestKind, onClearTestKinds, onSelectTestKind,
  recommendations, searchRecommendations = [], catalogEntries = [], activeCollectionId = null, onChooseCollection = null, activeBattery, onToggleTest, onResetSuggested,
  matchCount, viaProfileEntry = null, onStart, onStartSingle = null, onStartCourse = null, onBrowseFull, onBrowseCore, onBrowsePdf,
  starting = false, actionError = null,
}) {
  const publicCopy = TEXT[locale] || TEXT.en
  const accountCopy = {
    en: { kicker: 'MY TESTS', finderTitle: 'Find the right tests', finderHelp: 'Search by name, concern or choose a topic below.', finderSearch: 'Search', finderPlaceholder: 'Stress, sleep, relationships…', build: 'Add selected tests', buildHelp: 'Save these tests to My tests', takeTest: 'Start test', privacy: 'Your choices stay on this page until you choose to add tests. Your saved tests, answers and results are preserved.', saved: 'Open My tests' },
    ru: { kicker: 'МОИ ТЕСТЫ', finderTitle: 'Подобрать подходящие тесты', finderHelp: 'Введите запрос или выберите интересующую тему.', finderSearch: 'Найти', finderPlaceholder: 'Стресс, сон, отношения…', build: 'Добавить выбранные тесты', buildHelp: 'Сохранить эти тесты в «Мои тесты»', takeTest: 'Начать тест', privacy: 'Выбор остаётся на этой странице, пока вы не решите добавить тесты. Сохранённые тесты, ответы и результаты остаются без изменений.', saved: 'Открыть «Мои тесты»' },
    es: { kicker: 'MIS PRUEBAS', finderTitle: 'Encuentra tus pruebas', finderHelp: 'Busca por nombre o elige un tema.', finderSearch: 'Buscar', finderPlaceholder: 'Estrés, sueño, relaciones…', build: 'Añadir pruebas seleccionadas', buildHelp: 'Guardar estas pruebas en Mis pruebas', takeTest: 'Iniciar prueba', privacy: 'La selección queda en esta página hasta que decidas añadir pruebas. Se conservan las pruebas, respuestas y resultados guardados.', saved: 'Abrir Mis pruebas' },
  }
  const c = authenticated ? { ...publicCopy, ...(accountCopy[locale] || accountCopy.en) } : publicCopy
  const [visibleCount, setVisibleCount] = useState(5)
  const [collectionsOpen, setCollectionsOpen] = useState(false)
  const collections = availableTestCollections(catalogEntries, { focus, problems, kinds: testKinds, maxMinutes, depth })
  const collectionCopy = COLLECTION_COPY[locale] || COLLECTION_COPY.en
  const activeCollection = TEST_TOPIC_COLLECTIONS.find((collection) => collection.id === activeCollectionId)
  // Keep a previously chosen collection visible in the two-card collapsed row.
  const orderedCollections = activeCollectionId
    ? [...collections.filter((item) => item.id === activeCollectionId), ...collections.filter((item) => item.id !== activeCollectionId)]
    : collections
  const concernFocus = activeCollection ? [...new Set([...focus, ...activeCollection.focus])] : focus
  const [expandedTests, setExpandedTests] = useState(new Set())
  const journeyMode = initialMode === 'course' && onStartCourse ? 'course' : 'tests'
  const [showAllProblems, setShowAllProblems] = useState(false)
  const [problemQuery, setProblemQuery] = useState('')
  const [heroSearch, setHeroSearch] = useState('')
  const [submittedHeroSearch, setSubmittedHeroSearch] = useState('')
  const browseTab = testKinds.length === 0 ? 'all' : testKinds.length === 1 ? testKinds[0] : null
  const [showIndividualVia, setShowIndividualVia] = useState(false)
  const focusKey = [...focus].sort().join('|')
  const problemKey = [...problems].sort().join('|')
  const testKindsKey = [...testKinds].sort().join('|')
  const allProblems = problemsForTopics(concernFocus)
  const chosenFirst = [...allProblems.filter((item) => problems.includes(item.key)),
    ...allProblems.filter((item) => !problems.includes(item.key))]
  const queryText = problemQuery.trim().toLocaleLowerCase(locale)
  const matchingProblems = queryText ? chosenFirst.filter((item) => (item.label[locale] || item.label.en).toLocaleLowerCase(locale).includes(queryText)) : chosenFirst
  const visibleProblems = (showAllProblems || queryText) ? matchingProblems : matchingProblems.slice(0, 8)
  useEffect(() => {
    // The first screen starts from the five closest matches after any filter change.
    setVisibleCount(5)
    setShowAllProblems(false)
  }, [focusKey, activeCollectionId, depth, maxMinutes, testKindsKey, problemKey])
  const selectedKeys = new Set(activeBattery.map((item) => item.key))
  const via = groupViaRecommendations(recommendations, selectedKeys, showIndividualVia)
  const fullVia = resolveViaProfile(via, viaProfileEntry, selectedKeys, { maxMinutes, testKinds })
  const viaCopy = VIA_COPY[locale] || VIA_COPY.en
  const groupedRecommendations = via.visible
  // The parent has already applied the selected kind(s) to these recommendations.
  // Search is local to this page and never sends personal queries to the server.
  const heroSearchTerm = submittedHeroSearch.trim().toLocaleLowerCase(locale)
  const browseRecommendations = heroSearchTerm
    ? searchPublicTestEntries(
        groupViaRecommendations(searchRecommendations, selectedKeys, showIndividualVia).visible,
        heroSearchTerm)
    : groupedRecommendations
  const visibleRecommendations = browseRecommendations.slice(0, visibleCount)
  const remainingCount = Math.max(0, browseRecommendations.length - visibleCount)
  const nextBatch = Math.min(5, remainingCount)
  const format = (template, values) => template.replace(/\{(\w+)\}/g, (_, key) => String(values[key] ?? ''))
  const minutes = activeBattery.reduce((total, item) => total + (item.durationMinutes || 0), 0)
  const appliedFilterCount = Number(maxMinutes > 0) + Number(depth !== 'balanced') + testKinds.length
  const hasExtraFilters = appliedFilterCount > 0
  const visibleFocus = new Set(TOPICS.map((topic) => topic.key))
  const themeRefinements = TEST_RECOMMENDATION_FOCUS.filter((topic) => focus.includes(topic.key) && !visibleFocus.has(topic.key))

  return <section className={styles.shell} aria-label={c.title} data-prelogin-test-picker data-public-test-picker={!authenticated ? 'true' : undefined} data-account-test-picker={authenticated ? 'true' : undefined}>
    <header className={authenticated ? styles.accountFinder : academyStyles.hero} data-client-tests-hero>
      {!authenticated && <div className={academyStyles.topline}>
        <p className={academyStyles.eyebrow}><Sparkles size={16} aria-hidden="true" />{c.heroKicker}</p>
        <DiscoverySectionTabs locale={locale} active="tests" />
      </div>}
      {authenticated && <p className={styles.accountFinderEyebrow}>{c.kicker}</p>}
      {authenticated
        ? <h2 className={styles.accountFinderTitle}>{c.finderTitle}</h2>
        : <h1>{c.heroHeadline}</h1>}
      <p className={authenticated ? styles.accountFinderHelp : academyStyles.intro}>
        {authenticated ? c.finderHelp : c.heroDescription}
      </p>
      <form className={authenticated ? styles.accountFinderSearch : academyStyles.form} role="search" onSubmit={(event) => {
        event.preventDefault()
        setSubmittedHeroSearch(heroSearch.trim())
        setVisibleCount(5)
        document.getElementById('hh-simple-recommendations')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }}>
        <label className={authenticated ? styles.accountSrOnly : academyStyles.srOnly} htmlFor="hh-test-hero-search">{c.heroSearchLabel}</label>
        <input id="hh-test-hero-search" className={authenticated ? styles.accountFinderInput : academyStyles.search} type="search" value={heroSearch}
          onChange={(event) => { setHeroSearch(event.target.value); if (!event.target.value.trim()) setSubmittedHeroSearch('') }}
          placeholder={authenticated ? c.finderPlaceholder : c.heroSearchPlaceholder} maxLength={120} autoComplete="off" />
        <button className={authenticated ? styles.accountFinderSubmit : academyStyles.submit} type="submit">{authenticated ? c.finderSearch : c.heroSearchAction}<Search size={19} aria-hidden="true" /></button>
      </form>
      {authenticated && <div className={styles.accountFinderFilters}>
        <label>{c.heroTopicFilter}
          <select value={focus.length === 1 && TOPICS.some((item) => item.key === focus[0]) ? focus[0] : 'all'}
            onChange={(event) => {
              const chosen = event.target.value
              focus.forEach((key) => onToggleFocus(key))
              if (chosen !== 'all') onToggleFocus(chosen)
              setVisibleCount(5)
            }}>
            <option value="all">{c.heroAllTopics}</option>
            {TOPICS.map((topic) => <option value={topic.key} key={topic.key}>{topic[locale] || topic.en}</option>)}
          </select>
        </label>
        <label>{c.heroTypeFilter}
          <select value={browseTab || 'all'} onChange={(event) => {
            onSelectTestKind?.(event.target.value === 'all' ? null : event.target.value)
            setVisibleCount(5)
          }}>
            <option value="all">{c.heroAllTypes}</option>
            {BROWSE_TABS.filter((item) => item.key !== 'all').map((item) =>
              <option value={item.key} key={item.key}>{testKindShortLabel({ testKind: item.key }, locale)}</option>)}
          </select>
        </label>
      </div>}
    </header>

    <section className={styles.section} aria-labelledby="hh-simple-topic-title">
      <div className={styles.topicHeading}>
        <div className={styles.sectionHeader}>
          <span className={styles.step} aria-hidden="true">1</span>
          <div><h2 id="hh-simple-topic-title">{c.first}</h2><p>{c.firstHelp}</p></div>
        </div>
        <button type="button" className={styles.selectAll} aria-pressed={TOPICS.every(({key}) => focus.includes(key))}
          onClick={() => {
            const all = TOPICS.every(({key}) => focus.includes(key))
            TOPICS.filter(({key}) => all ? focus.includes(key) : !focus.includes(key)).forEach(({key}) => onToggleFocus(key))
          }}>{TOPICS.every(({key}) => focus.includes(key)) ? c.clearAll : c.selectAll}</button>
      </div>
      <div className={styles.topicGrid} role="group" aria-label={c.first}>
        {TOPICS.map(({ key, Icon, ...labels }) => {
          const checked = focus.includes(key)
          return <button key={key} type="button" aria-pressed={checked}
            className={styles.topic} onClick={() => onToggleFocus(key)}>
            <Icon size={20} aria-hidden="true" strokeWidth={1.9}/>
            <span>{labels[locale] || labels.en}</span>
            {checked && <Check size={16} className={styles.topicCheck} aria-hidden="true"/>}
          </button>
        })}
      </div>
      {themeRefinements.length > 0 && <div className={styles.themeRefinements} data-theme-refinements>
        <strong>{locale === 'ru' ? 'Уточнения темы:' : 'Selected refinements:'}</strong>
        {themeRefinements.map((topic) => <button key={topic.key} type="button" onClick={() => onToggleFocus(topic.key)}
          aria-label={(locale === 'ru' ? 'Убрать фильтр: ' : 'Remove filter: ') + (topic.label[locale] || topic.label.en)}>
          {topic.label[locale] || topic.label.en} <span aria-hidden="true">×</span>
        </button>)}
      </div>}
    </section>

    <section className={styles.problemSection} aria-labelledby="hh-simple-problems-title" data-topic-problem-filter>
      <div className={styles.problemHeading}>
        <div className={styles.sectionHeader}>
          <span className={styles.step} aria-hidden="true">2</span>
          <div><h2 id="hh-simple-problems-title">{c.problemsTitle}</h2><p>{c.problemsHelp}</p></div>
        </div>
        <button type="button" className={styles.skipProblems}
          onClick={() => (document.getElementById('hh-test-curated-heading') || document.getElementById('hh-simple-recommendations'))?.scrollIntoView({ behavior:'smooth', block:'start' })}>{c.skip} →</button>
      </div>
      <label className={styles.problemSearch}>
        <Search size={19} aria-hidden="true" />
        <input type="search" value={problemQuery} onChange={(event) => setProblemQuery(event.target.value)}
          placeholder={c.problemSearch} aria-label={c.problemSearch} disabled={!concernFocus.length}/>
      </label>
      {concernFocus.length === 0 ? <p className={styles.problemHint}>{c.problemsEmpty}</p> : <>
        {!!problems.length && <p className={styles.syncedConcernNote} role="status">{c.syncHint}</p>}
        <div className={styles.problemGrid} role="group" aria-label={c.problemsTitle}>
          {visibleProblems.map((problem) => {
            const checked = problems.includes(problem.key)
            return <button key={problem.key} type="button" className={styles.problemChip}
              aria-pressed={checked} data-problem-key={problem.key} onClick={() => onToggleProblem(problem.key)}>
              {checked && <Check size={15} aria-hidden="true" />}
              <span>{problem.label[locale] || problem.label.en}</span>
            </button>
          })}
        </div>
        {queryText && matchingProblems.length === 0 && <p className={styles.noMatches} role="status">{c.noProblemMatches}</p>}</>}
      {concernFocus.length > 0 && <div className={styles.problemActions}>
        {allProblems.length > 8 && !queryText && <button type="button" className={styles.problemMore}
          aria-expanded={showAllProblems} onClick={() => setShowAllProblems((current) => !current)}>
          {showAllProblems ? c.problemsLess : c.problemsMore} <ChevronDown size={16} aria-hidden="true"/>
        </button>}
        {problems.length > 0 && <button type="button" className={styles.problemClear}
          onClick={onClearProblems}>{c.problemsClear} ({problems.length})</button>}
      </div>}
    </section>

    <details className={styles.advanced} id="hh-more-test-filters">
      <summary>
        <span className={styles.filterIcon}><SlidersHorizontal size={20} aria-hidden="true"/></span>
        <span className={styles.filterText}><strong>{c.detail}</strong><small>{c.detailHelp}</small></span>
        {hasExtraFilters && <span className={styles.appliedMark} title={c.activeFilters} aria-label={c.activeFilters}>{appliedFilterCount}</span>}
        <ChevronDown aria-hidden="true" size={20} className={styles.chevron}/>
      </summary>
      <div className={styles.advancedBody}>
        <section className={styles.filterGroup} aria-labelledby="hh-test-depth-title">
          <h3 id="hh-test-depth-title">{c.depth}</h3>
          <p>{c.depthHelp}</p>
          <div className={styles.depthOptions} role="group" aria-label={c.depth} data-mobile-depth-layout="grid" data-test-priority-selector>
            {[
              {key:'quick', name:c.quick, desc:c.quickNote, Icon:Zap},
              {key:'balanced', name:c.balanced, desc:c.balancedNote, Icon:Sparkles},
              {key:'deep', name:c.deep, desc:c.deepNote, Icon:Compass},
            ].map(({key,name,desc,Icon}) => <button type="button" className={styles.depthOption}
              aria-pressed={depth === key} onClick={() => onDepth(key)} key={key} title={desc} aria-label={name + '. ' + desc}>
              <Icon size={20} aria-hidden="true"/><span><strong>{name}</strong></span>
              {depth === key && <Check size={16} className={styles.depthCheck} aria-hidden="true"/>}
            </button>)}
          </div>
        </section>
        <section className={styles.filterGroup} aria-labelledby="hh-test-time-title">
          <h3 id="hh-test-time-title">{c.time}</h3>
          <div className={styles.timeButtons} role="group" aria-label={c.time}>
            {[[0,c.anyTime],[5,c.shortTime],[10,c.mediumTime]].map(([minutes,label]) =>
              <button key={minutes} type="button" aria-pressed={maxMinutes===minutes} onClick={() => onMaxMinutes(minutes)}>{label}</button>
            )}
          </div>
        </section>
        <fieldset className={styles.kindFilters} data-test-kind-filter>
          <legend>{c.kindsTitle}</legend>
          <p>{c.kindsHelp}</p>
          <div className={styles.kindChoices}>
            {TEST_KINDS.map((kind) => {
              const Icon = TEST_KIND_ICONS[kind.key]
              return <label className={styles.kindChoice} key={kind.key} data-checked={testKinds.includes(kind.key)}>
                <input type="checkbox" data-test-kind-checkbox value={kind.key} checked={testKinds.includes(kind.key)} onChange={() => onToggleTestKind?.(kind.key)} />
                <Icon size={19} aria-hidden="true" />
                <span>{kind.label[locale] || kind.label.en}</span>
              </label>
            })}
          </div>
        </fieldset>
        {hasExtraFilters && <button type="button" className={styles.clearFilters} onClick={() => { onDepth('balanced'); onMaxMinutes(0); onClearTestKinds?.() }}>{c.clear}</button>}
      </div>
    </details>

    {!authenticated && collections.length > 0 && <section className={styles.curated} data-test-topic-collections
      data-expanded={collectionsOpen ? 'true' : 'false'} aria-labelledby="hh-test-curated-heading">
      <header className={styles.curatedHeading}>
        <h2 id="hh-test-curated-heading">{collectionCopy.title}</h2>
        <p>{focus.length || problems.length ? collectionCopy.personalized : collectionCopy.intro}</p>
      </header>
      <div className={styles.curatedGrid} id="hh-test-curated-grid">
        {orderedCollections.map((collection) => {
          const Icon = COLLECTION_ICONS[collection.id]
          const active = activeCollectionId === collection.id
          const title = collection.title[locale] || collection.title.en
          const countLabel = locale === 'ru'
            ? (collection.count % 10 === 1 && collection.count % 100 !== 11 ? 'тест' :
               collection.count % 10 >= 2 && collection.count % 10 <= 4 && (collection.count % 100 < 12 || collection.count % 100 > 14) ? 'теста' : 'тестов')
            : collection.count === 1 ? collectionCopy.test : collectionCopy.tests
          return <button key={collection.id} type="button" className={styles.curatedCard}
            data-test-collection={collection.id} data-tone={collection.tone} aria-pressed={active}
            aria-label={title + '. ' + collection.count + ' ' + countLabel + '. ' + collectionCopy.open}
            onClick={() => {
              onChooseCollection?.(active ? null : collection.id)
              setHeroSearch('')
              setSubmittedHeroSearch('')
              setVisibleCount(5)
              // Every topic opens the same standard list, without the legacy
              // Tantra card layout or automatic enrollment.
              window.requestAnimationFrame(() => {
                document.getElementById('hh-simple-recommendations')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
              })
            }}>
            <span className={styles.curatedIcon}><Icon size={17} strokeWidth={1.9} aria-hidden="true" /></span>
            <span className={styles.curatedCardText}><strong>{title}</strong></span>
            <span className={styles.curatedCardBottom} aria-hidden="true">
              <span>{collection.count}</span>
              {active && <Check size={13} />}
            </span>
          </button>
        })}
      </div>
      {collections.length > 2 && <button type="button" className={styles.curatedMore}
        aria-expanded={collectionsOpen} aria-controls="hh-test-curated-grid"
        onClick={() => setCollectionsOpen((value) => !value)}>
        {collectionsOpen ? collectionCopy.less : collectionCopy.more}
        <ChevronDown size={17} aria-hidden="true" />
      </button>}
    </section>}

    <section className={styles.section} aria-labelledby="hh-simple-recommendations-title" id="hh-simple-recommendations" data-recommendation-mode={journeyMode}>
      {!authenticated && <p className={academyStyles.subnote} data-test-access-note>{c.heroFootnote}</p>}
      <div className={styles.sectionHeader}>
        <span className={styles.step} aria-hidden="true">3</span>
        <div><h2 id="hh-simple-recommendations-title">{c.recommended}</h2><p>{c.recommendedHelp}</p></div>
      </div>
      {activeCollection && <div className={styles.collectionHighlight} role="status" data-active-test-collection={activeCollection.id}>
        <Layers size={15} aria-hidden="true" />
        <span>{collectionCopy.prioritized} <strong>{activeCollection.title[locale] || activeCollection.title.en}</strong></span>
        <button type="button" onClick={() => onChooseCollection?.(null)} aria-label={collectionCopy.clear}>×</button>
      </div>}
      <div className={styles.recommendationMeta}>
        <div className={styles.matchCount} role="status" aria-live="polite">{heroSearchTerm ? browseRecommendations.length : browseTab === 'all' ? matchCount : browseRecommendations.length} {c.matching}</div>
        <details className={styles.why}>
          <summary>{c.why} <ArrowRight size={14} aria-hidden="true"/></summary>
          <p>{c.whyText}</p>
        </details>
      </div>
      <div className={styles.browseTabs} role="group" aria-label={c.filterTitle}>
        {BROWSE_TABS.map((tab) => <button key={tab.key} type="button" aria-pressed={browseTab === tab.key}
          onClick={() => { onSelectTestKind?.(tab.key === 'all' ? null : tab.key); setVisibleCount(5) }}>
          {tab.key === 'all' ? (tab.label[locale] || tab.label.en) : testKindShortLabel({ testKind: tab.key }, locale)}
        </button>)}
        <button type="button" className={styles.moreFilterButton} title={c.filters} aria-label={c.filters}
          onClick={() => {
            const details = document.getElementById('hh-more-test-filters')
            if (details) { details.open = true; details.scrollIntoView({ behavior: 'smooth', block: 'start' }) }
          }}><SlidersHorizontal size={18} aria-hidden="true" /></button>
      </div>

      {submittedHeroSearch.trim() && <p className={styles.heroSearchSummary} role="status">
        {c.heroSearchLabel}: <strong>{submittedHeroSearch}</strong>
        <button type="button" onClick={() => { setHeroSearch(''); setSubmittedHeroSearch(''); setVisibleCount(5) }}>{c.heroSearchClear}</button>
      </p>}
      {browseRecommendations.length > 0 ? <div className={styles.testList} id="hh-public-recommended-tests" data-visible-test-count={visibleRecommendations.length}>
         {visibleRecommendations.map((entry, index) => {
           const checked = selectedKeys.has(entry.key)
           const inputId = `hh-public-test-${entry.key}`
           const detailsId = `${inputId}-details`
           const expanded = expandedTests.has(entry.key)
           const collectionNames = testCollectionIds(entry).map((id) => {
             const preset = TEST_TOPIC_COLLECTIONS.find((item) => item.id === id)
             return preset?.title[locale] || preset?.title.en
           }).filter(Boolean)
           return <article className={styles.testEntry} key={entry.key} data-test-match={entry.key} data-relevance={entry.matchPercent} data-selected={checked}>
             <div className={styles.testRow} data-selected={checked}>
               <input id={inputId} type="checkbox" checked={checked} onChange={() => onToggleTest(entry.key)}
                 aria-label={entry.title} />
               <div className={styles.testVisual}>
                 <span className={styles.testArt} aria-hidden="true">
                   <img src={artworkFor(entry)} alt="" width="104" height="112" loading="lazy" decoding="async" />
                 </span>
                 <div className={styles.testImageMeta}>
                   {Number.isFinite(entry.questionCount) && entry.questionCount > 0 && <span className={styles.questionCount} title={`${entry.questionCount} ${c.questionUnit}`}><ListChecks size={13} aria-hidden="true" />{entry.questionCount} {c.questionUnit}</span>}
                   <span className={styles.imageDuration}><Clock3 size={13} aria-hidden="true" />~{entry.durationMinutes ?? '—'} {c.minuteUnit}</span>
                   {collectionNames.length > 0 && <span className={styles.collectionMarker} data-test-collection-marker
                     title={`${collectionCopy.tip} ${collectionNames.join(', ')}`}
                     aria-label={`${collectionCopy.tip} ${collectionNames.join(', ')}`}>
                     <Layers size={12} aria-hidden="true" />{collectionCopy.badge}
                   </span>}
                 </div>
               </div>
               <label htmlFor={inputId} className={styles.testInfo}>
                 <strong>{entry.title}</strong>
                 <small>{entry.description || entry.category}</small>
                 <span className={styles.testChips}>
                   <span className={styles.matchBadge} title={c.fitInfo} aria-label={entry.matchPercent + '% ' + c.fit}>
                     {entry.matchPercent}% <span>{c.fit}</span>
                   </span>
                    <KindBadge entry={entry} locale={locale} />
                   {index === 0 && !checked && <span className={styles.suggestion}>{c.suggested}</span>}
                 </span>
               </label>
               <div className={styles.testActions}>
                 <button type="button" className={styles.testDetailsButton}
                   aria-expanded={expanded} aria-controls={detailsId}
                   onClick={() => setExpandedTests((current) => {
                     const next = new Set(current)
                     if (next.has(entry.key)) next.delete(entry.key)
                     else next.add(entry.key)
                     return next
                   })}>
                   {c.details} <ChevronDown size={15} aria-hidden="true" />
                 </button>
                 <button type="button" className={styles.takeTest}
                   onClick={() => onStartSingle?.(entry)} disabled={starting || !onStartSingle}
                   aria-label={`${c.takeTest}: ${entry.title}`}>
                   {c.takeTest} <ArrowRight size={16} aria-hidden="true" />
                 </button>
               </div>
             </div>
             <div id={detailsId} className={styles.testDetailsBody} hidden={!expanded}>
                 <p className={styles.testPurpose}>{entry.description || entry.category}</p>
                 <div className={styles.testFacts}>
                   <span><Clock3 size={14} aria-hidden="true" />~{entry.durationMinutes ?? '—'} {c.minuteUnit}</span>
                   {Number.isFinite(entry.questionCount) && entry.questionCount > 0 && <span><ListChecks size={14} aria-hidden="true" />{entry.questionCount} {c.questionUnit}</span>}
                 </div>
                 {entry.scaleGuide?.scales?.length > 0 && <div className={styles.scaleOverview} data-compact-test-scales>
                   <strong><Activity size={15} aria-hidden="true" />{c.scalesLabel}</strong>
                   <div className={styles.scalePills}>
                     {entry.scaleGuide.scales.slice(0, 3).map((scale) => <span key={scale.key}>{scale.label}</span>)}
                     {entry.scaleGuide.scales.length > 3 && <span>+{entry.scaleGuide.scales.length - 3}</span>}
                   </div>
                 </div>}
                 {((entry.methodology && entry.methodologyStatus !== 'original') || entry.scaleGuide?.scales?.length > 0) && <details className={styles.researchDetails}>
                   <summary><BookOpen size={15} aria-hidden="true" />{c.methodDetails}<ChevronDown size={14} aria-hidden="true" /></summary>
                   <div className={styles.researchBody}>
                     {entry.methodology && entry.methodologyStatus !== 'original' && <p className={styles.methodology}>{entry.methodology}</p>}
                     {entry.methodologySourceUrl && <a href={entry.methodologySourceUrl} target="_blank" rel="noopener noreferrer">{c.sourceLink} ↗</a>}
                     {entry.scaleGuide?.scales?.length > 0 && <div className={styles.testGuide}><TestScaleGuide guide={entry.scaleGuide} locale={locale} /></div>}
                   </div>
                 </details>}
             </div>
           </article>
         })}
       </div> : <p className={styles.noMatches} role="status">{c.none}</p>}
       {browseRecommendations.length > 0 && <div className={styles.moreTests} data-inline-test-expansion>
        <span role="status" aria-live="polite">
          {format(c.showing, { shown: visibleRecommendations.length, total: browseRecommendations.length })}
        </span>
        {remainingCount > 0 && <button type="button" className={styles.showFiveMore}
          aria-controls="hh-public-recommended-tests" aria-expanded={visibleCount > 5}
          onClick={() => setVisibleCount((current) => Math.min(browseRecommendations.length, current + 5))}>
          {format(c.more, { count: nextBatch })} <ArrowRight size={18} aria-hidden="true" />
        </button>}
      </div>}
      {!heroSearchTerm && (testKinds.length === 0 || testKinds.includes('professional')) && (fullVia || via.individualCount > 0) && <section className={styles.viaFamily} aria-label={viaCopy.title} data-via-family data-via-collapsed={via.collapsedCount}>
        <div className={styles.viaFamilyIntro}>
          <strong>{viaCopy.title}</strong>
          {fullVia && <div className={styles.viaTypeLine} data-test-type-line><KindBadge entry={fullVia} locale={locale} /></div>}
          <p>{viaCopy.description}</p>
        </div>
        {fullVia && <div className={styles.viaFamilyActions} data-via-profile={VIA_PROFILE_KEY}>
          <span><ListChecks size={14} aria-hidden="true" />{fullVia.questionCount} {c.questionUnit} · ~{fullVia.durationMinutes} {c.minuteUnit}</span>
          <button type="button" className={styles.viaSelect} aria-pressed={selectedKeys.has(VIA_PROFILE_KEY)}
            onClick={() => onToggleTest(VIA_PROFILE_KEY)} disabled={starting}>
            {selectedKeys.has(VIA_PROFILE_KEY) ? viaCopy.selected : viaCopy.select}
          </button>
          <button type="button" className={styles.takeTest} data-test-action="start"
            onClick={() => onStartSingle?.(fullVia)} disabled={starting || !onStartSingle}>
            {c.takeTest} <ArrowRight size={16} aria-hidden="true" />
          </button>
        </div>}
        {via.individualCount > 0 && <button type="button" className={styles.viaToggle}
          aria-expanded={showIndividualVia} aria-controls="hh-public-recommended-tests"
          onClick={() => { setShowIndividualVia((value) => !value); setVisibleCount(5) }}>
          {showIndividualVia ? viaCopy.collapse : viaCopy.expand} ({via.individualCount})
        </button>}
      </section>}
      <p className={styles.fitNote}>{c.fitInfo}</p>

      <div className={styles.selectedSummary} role="status" aria-live="polite">
        <Check size={19} aria-hidden="true"/>
        <strong>{activeBattery.length} {c.selected} · ~{minutes} {c.minutes}</strong>
        <button type="button" onClick={onResetSuggested}>{c.reset}</button>
      </div>
      <p className={styles.fitNote} data-public-selected-tests>
        {activeBattery.map((entry, index) => <span key={entry.key} data-selected-test-key={entry.key}>{index > 0 ? ' · ' : ''}{entry.title}</span>)}
      </p>
      <button type="button" className={styles.cta} disabled={!activeBattery.length || starting} onClick={journeyMode === 'course' ? onStartCourse : onStart} data-test-start-mode={journeyMode}>
        <Play size={22} fill="currentColor" aria-hidden="true" />
        <span><strong>{starting ? '…' : journeyMode === 'course' ? c.courseCta : c.build}</strong><small>{journeyMode === 'course' ? c.courseCtaHint : c.buildHelp}</small></span>
        <ArrowRight size={23} aria-hidden="true"/>
      </button>
      {actionError && <p className={styles.error} role="alert">{actionError.code || actionError.message || String(actionError)}</p>}
      {!activeBattery.length && <p className={styles.noMatches} role="status">{c.noTests}</p>}
      <button type="button" className={styles.fullDatabase} onClick={onBrowseCore}>
        <Compass size={20} aria-hidden="true"/>{c.core100}<ArrowRight size={17} aria-hidden="true" className={styles.browseArrow}/>
      </button>
      <button type="button" className={styles.fullDatabase} onClick={onBrowsePdf}>
        <BookOpen size={20} aria-hidden="true"/>{locale === 'ru' ? 'Профессиональные шкалы — скачать PDF' : locale === 'es' ? 'Escalas profesionales: descargar PDF' : 'Professional scale guides - PDF'}<ArrowRight size={17} aria-hidden="true" className={styles.browseArrow}/>
      </button>
      <button type="button" className={styles.fullDatabase} onClick={onBrowseFull}>
        <Compass size={20} aria-hidden="true"/>{c.browse}<ChevronDown size={17} aria-hidden="true" className={styles.browseArrow}/>
      </button>
    </section>
    <p className={styles.privacy}>{c.privacy} <Link href={`/${locale === 'ru' ? 'ru' : 'en'}/app`} prefetch={false}>{c.saved} →</Link></p>
  </section>
}
