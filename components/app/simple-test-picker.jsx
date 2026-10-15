'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { Activity, ArrowRight, Check, ChevronDown, Clock3, Compass, BookOpen, GraduationCap, ListChecks, BriefcaseBusiness, Search, Heart, Leaf, Moon, Play, SlidersHorizontal, Smile, Sparkles, Sun, Target, Users, Zap } from 'lucide-react'
import styles from './simple-test-picker.module.css'
import { problemsForTopics } from '@/lib/assessments/test-problems'
import { TestScaleGuide } from './test-scale-guide'
import { HOME_TEST_TOPICS } from '@/lib/assessments/insights-categories'
import { TEST_RECOMMENDATION_FOCUS } from '@/lib/assessments/test-recommendations'
import { TEST_KINDS } from '@/lib/assessments/test-kinds'
import { groupViaRecommendations, resolveViaProfile, VIA_PROFILE_KEY } from '@/lib/assessments/via-family'

const TEXT = {
  en: {
    kicker:'FREE WELLBEING MONITORING', title:'Choose your tests',
    heroKicker:'MY TESTS · HOLISTIC HOUSE', heroHeadline:'Understand yourself and your life better',
    heroDescription:'Choose topics, explore suitable tests and receive personal guidance.',
    accessNote:'Choose topics freely. Eligible individual tests can be taken without Google; creating and saving a multi-test plan requires Google sign-in.', guestAction:'Try guest tests',
    benefitOne:'Measurable progress', benefitTwo:'Deeper understanding', benefitThree:'Personal guidance', benefitFour:'Support & growth',
    promoKicker:'FREE SELF-REFLECTION', promoTitle:'Start with a personal check-in',
    promoText:'Explore stress, mood and inner resources, with gentle next steps.', promoAction:'Choose my topics',
    lead:'Choose what you want to monitor — stress, mood, sleep or inner resources. We’ll suggest relevant self-checks.',
    first:'What would you like to explore?', firstHelp:'Select one or more areas. We will recommend tests using the scales they actually measure.',
    detail:'Detailed selection (optional)', detailHelp:'Choose the level of detail or add time and format filters.',
    depth:'How deep do you want to go?', depthHelp:'This helps prioritize recommendations. It does not limit your options.',
    quick:'Quick check-in', quickNote:'Short introductory tests',
    balanced:'Core set', balancedNote:'A balanced overview',
    deep:'In-depth battery', deepNote:'More detailed questionnaires',
    time:'Time per test', anyTime:'Any duration', shortTime:'Up to 5 min', mediumTime:'Up to 10 min',
    professional:'Professional tests only', clear:'Clear optional filters',
    recommended:'Recommended for you', recommendedHelp:'Suggested from your selected topics, using tests available to take now.',
    modeLabel:'Choose your next step', modeTests:'Tests', modeCourse:'Tests + support course', courseHint:'A personal, self-guided 14-day support course. Review your selected tests and explicitly consent before saving.', courseCta:'Start my personal course', courseCtaHint:'Continue to course setup and review these tests.', syncHint:'Already selected from your themes. You can edit the concerns below.',
    why:'Why these tests?', whyText:'The approximate match percentage is based on selected topics, specific concerns, coverage and optional depth. Without choices it reflects general starter relevance. This is not a clinical probability, diagnosis or health score.',
    suggested:'Suggested', available:'Available', selected:'selected', matching:'matching tests', takeTest:'Take test', expandTest:'What it measures', scalesLabel:'Measured scales', methodDetails:'Method & sources', sourceLink:'Original source', questionUnit:'questions', minuteUnit:'min',
    minutes:'min total', viewSelection:'Included in your plan', none:'No available tests match. Try a different topic or clear optional filters.',
    build:'Start free monitoring', buildHelp:'Save your selection and get started',
    browse:'Browse full database', core100:'100 psychotherapy tests', privacy:'Your selection stays on this page until you choose to continue. Google sign-in is required to save a personal plan.',
    noTests:'Choose a test to continue.', reset:'Use suggested set', back:'Back to easy selection', saved:'Already have a plan? Open my saved tests',
    more:'Show {count} more tests', showing:'Showing {shown} of {total} matching tests', fit:'match', fitInfo:'Estimated relevance from your selected topics and concerns — not a clinical score or diagnosis.',
    selectAll:'Select all',clearAll:'Clear topics',skip:'Skip',problemSearch:'e.g. trouble relaxing, low energy, relationships…',noProblemMatches:'No matching concerns.',filterTitle:'Filter tests',filters:'Filters',problemsTitle:'Which problems are most important?', problemsHelp:'Optional: choose what specifically troubles you. These suggestions come from the topics above.', problemsEmpty:'Choose a topic above to see relevant concerns.', problemsClear:'Clear problems', problemsMore:'Show more problems', problemsLess:'Show fewer problems',
  },
  ru: {
    kicker:'БЕСПЛАТНЫЙ МОНИТОРИНГ', title:'Подберите свои тесты',
    heroKicker:'МОИ ТЕСТЫ · HOLISTIC HOUSE', heroHeadline:'Лучше понять себя и свою жизнь',
    heroDescription:'Выберите темы, пройдите тесты и получите персональные рекомендации.',
    accessNote:'Выбирайте темы свободно. Отдельные доступные тесты можно пройти без Google; для составления и сохранения набора нужен вход через Google.', guestAction:'Попробовать без регистрации',
    benefitOne:'Измеримый прогресс', benefitTwo:'Глубокое понимание', benefitThree:'Персональные рекомендации', benefitFour:'Поддержка и развитие',
    promoKicker:'БЕСПЛАТНЫЙ МОНИТОРИНГ', promoTitle:'Начните с базовых тестов',
    promoText:'Узнайте больше о стрессе, настроении и ресурсах, а затем получите рекомендации.', promoAction:'Выбрать темы',
    lead:'Выберите, за чем хотите наблюдать: стресс, настроение, сон или внутренние ресурсы. Мы предложим подходящие опросники.',
    first:'Что вы хотите исследовать?', firstHelp:'Отметьте важные темы. Мы подберём тесты по шкалам, которые они действительно измеряют.',
    detail:'Подробный подбор (необязательно)', detailHelp:'Глубина, время прохождения и формат — при желании.',
    depth:'Насколько глубоко хотите исследовать?', depthHelp:'Меняет порядок рекомендаций, не закрывая другие тесты.',
    quick:'Быстрый обзор', quickNote:'Короткие вводные тесты',
    balanced:'Основной набор', balancedNote:'Сбалансированная подборка',
    deep:'Глубокий анализ', deepNote:'Более подробные опросники',
    time:'Время на один тест', anyTime:'Любое', shortTime:'До 5 мин', mediumTime:'До 10 мин',
    professional:'Только профессиональные тесты', clear:'Очистить дополнительные фильтры',
    recommended:'Рекомендуем для вас', recommendedHelp:'На основе выбранных тем и реально доступных тестов.',
    modeLabel:'Как хотите продолжить', modeTests:'Тесты', modeCourse:'Тесты + коррекция', courseHint:'Персональный курс поддержки на 14 дней с ежедневными упражнениями. Перед сохранением вы подтвердите выбор и согласие.', courseCta:'Начать персональный курс', courseCtaHint:'Перейти к запуску курса с выбранной подборкой тестов.', syncHint:'Эти проблемы уже отмечены по выбранным подтемам. Можно изменить выбор.',
    why:'Почему эти тесты?', whyText:'Процент — ориентировочное соответствие выбранным темам, конкретным проблемам, охвату шкал и глубине теста. Без выбора оценивается общая релевантность. Это не диагноз, клиническая вероятность или процент здоровья.',
    suggested:'Подходит', available:'Доступен', selected:'выбрано', matching:'подходящих тестов', takeTest:'Пройти', expandTest:'Что измеряет', scalesLabel:'Шкалы', methodDetails:'Методика и источники', sourceLink:'Первоисточник', questionUnit:'вопросов', minuteUnit:'мин',
    minutes:'мин всего', viewSelection:'В вашем наборе', none:'Подходящих доступных тестов нет. Выберите другую тему или сбросьте фильтры.',
    build:'Начать бесплатный мониторинг', buildHelp:'Сохранить подборку и начать',
    browse:'Открыть всю базу тестов', core100:'100 тестов психотерапии', privacy:'До нажатия кнопки продолжения выбор остаётся на этой странице. Для сохранения набора нужен вход через Google.',
    noTests:'Выберите тест для продолжения.', reset:'Вернуть рекомендованный набор', back:'Назад к простому подбору', saved:'Уже есть подборка? Открыть мои тесты',
    more:'Показать ещё {count} тестов', showing:'Показано {shown} из {total} подходящих тестов', fit:'соответствие', fitInfo:'Ориентировочная релевантность по выбранным темам и проблемам — не диагноз и не показатель здоровья.',
    selectAll:'Выбрать все',clearAll:'Снять выбор',skip:'Пропустить',problemSearch:'Например: не могу расслабиться, мало энергии, отношения…',noProblemMatches:'Уточнения не найдены.',filterTitle:'Фильтры тестов',filters:'Фильтры',problemsTitle:'Какие проблемы беспокоят?', problemsHelp:'Необязательно: уточните запрос. Варианты зависят от выбранных тем.', problemsEmpty:'Сначала выберите тему — появятся соответствующие проблемы.', problemsClear:'Очистить проблемы', problemsMore:'Показать больше проблем', problemsLess:'Показать меньше проблем',
  },
  es: {
    kicker:'MONITOREO GRATUITO', title:'Elige tus pruebas',
    heroKicker:'MIS PRUEBAS · HOLISTIC HOUSE', heroHeadline:'Conócete mejor y comprende tu vida',
    heroDescription:'Elige temas, completa pruebas adecuadas y recibe orientación personal.',
    accessNote:'Elige temas libremente. Puedes realizar pruebas individuales aptas sin Google; crear y guardar un conjunto requiere iniciar sesión con Google.', guestAction:'Probar sin registrarse',
    benefitOne:'Progreso visible', benefitTwo:'Conócete mejor', benefitThree:'Orientación personal', benefitFour:'Apoyo y crecimiento',
    promoKicker:'MONITOREO GRATUITO', promoTitle:'Empieza con pruebas sencillas',
    promoText:'Explora tu estrés, tu ánimo y tus recursos para dar el siguiente paso.', promoAction:'Elegir temas',
    lead:'Elige lo que quieres observar: estrés, ánimo, sueño o recursos personales. Te sugeriremos cuestionarios adecuados.',
    first:'¿Qué te gustaría explorar?', firstHelp:'Elige los temas importantes. Priorizaremos pruebas según las escalas que realmente miden.',
    detail:'Selección detallada (opcional)', detailHelp:'Profundidad, tiempo y formato.',
    depth:'¿Cuánto quieres profundizar?', depthHelp:'Ajusta la prioridad, sin excluir los demás tests.',
    quick:'Revisión rápida', quickNote:'Pruebas introductorias',
    balanced:'Conjunto básico', balancedNote:'Selección equilibrada',
    deep:'Análisis profundo', deepNote:'Cuestionarios más completos',
    time:'Tiempo por prueba', anyTime:'Sin límite', shortTime:'Hasta 5 min', mediumTime:'Hasta 10 min',
    professional:'Solo pruebas profesionales', clear:'Borrar filtros opcionales',
    recommended:'Recomendados para ti', recommendedHelp:'Basados en tus temas y pruebas disponibles.',
    modeLabel:'Elige cómo continuar', modeTests:'Pruebas', modeCourse:'Pruebas + apoyo', courseHint:'Curso personal de apoyo de 14 días. Revisa las pruebas y da tu consentimiento antes de guardar.', courseCta:'Iniciar mi curso personal', courseCtaHint:'Revisar pruebas y configurar el curso.', syncHint:'Tus temas ya seleccionaron estas preocupaciones; puedes editarlas.',
    why:'¿Por qué estas pruebas?', whyText:'El porcentaje es una estimación orientativa basada en temas, cobertura y profundidad del test. Sin temas elegidos indica relevancia general. No es una probabilidad clínica ni un diagnóstico.',
    suggested:'Sugerida', available:'Disponible', selected:'seleccionadas', matching:'pruebas coincidentes', takeTest:'Realizar', expandTest:'Qué mide', scalesLabel:'Escalas', methodDetails:'Método y fuentes', sourceLink:'Fuente original', questionUnit:'preguntas', minuteUnit:'min',
    minutes:'min en total', viewSelection:'En tu selección', none:'No hay pruebas disponibles con estos filtros.',
    build:'Iniciar monitoreo gratuito', buildHelp:'Guardar selección y empezar',
    browse:'Explorar base completa', core100:'100 pruebas de psicoterapia', privacy:'La selección queda en esta página hasta que continúes. Inicia sesión con Google para guardarla.',
    noTests:'Elige una prueba para continuar.', reset:'Usar selección sugerida', back:'Volver al selector sencillo', saved:'¿Ya tienes pruebas? Abrir mis pruebas',
    more:'Mostrar {count} pruebas más', showing:'Mostrando {shown} de {total} pruebas', fit:'coincidencia', fitInfo:'Relevancia estimada por temas y dificultades seleccionadas; no es un diagnóstico.',
    selectAll:'Elegir todo',clearAll:'Quitar selección',skip:'Omitir',problemSearch:'Por ejemplo: tensión, poca energía, relaciones…',noProblemMatches:'Sin resultados.',filterTitle:'Filtrar pruebas',filters:'Filtros',problemsTitle:'¿Qué dificultades te preocupan?', problemsHelp:'Opcional: concreta tus inquietudes según los temas elegidos.', problemsEmpty:'Elige primero un tema para ver dificultades relacionadas.', problemsClear:'Borrar dificultades', problemsMore:'Mostrar más dificultades', problemsLess:'Mostrar menos dificultades',
  },
}

// These keys are mapped to existing test facets and shared with Insights.
const TEST_KIND_ICONS = { professional: GraduationCap, monitoring: Activity, hobby: Sparkles }
const TOPIC_ICONS = { stress: Zap, anxiety: Heart, mood: Smile, sleep: Moon,
  body: Sun, relationships: Users, resources: Leaf, attention: Target, function: BriefcaseBusiness }
// The ninth visible topic reuses the existing functioning/work discovery facet.
const TOPICS = [...HOME_TEST_TOPICS, { key: 'function', en: 'Work & daily life', ru: 'Работа и дела', es: 'Trabajo y vida' }]
  .map((topic) => ({ ...topic, Icon: TOPIC_ICONS[topic.key] }))
const BROWSE_TABS = [
  { key: 'all', label: { en: 'All', ru: 'Все', es: 'Todas' } },
  { key: 'closest', label: { en: 'Best fit', ru: 'Подходят', es: 'Más afines' } },
  { key: 'professional', label: { en: 'Sourced', ru: 'Методики', es: 'Con fuente' } },
  { key: 'personality', label: { en: 'Personality', ru: 'Личность', es: 'Personalidad' } },
  { key: 'relationships', label: { en: 'Relationships', ru: 'Отношения', es: 'Relaciones' } },
  { key: 'stress', label: { en: 'Stress', ru: 'Стресс', es: 'Estrés' } },
]
function matchesBrowseTab(entry, key) {
  if (key === 'all') return true
  if (key === 'professional') return entry.testKind === 'professional'
  const tags = [...(entry.topics || []), ...(entry.measurementAxes || []), ...(entry.areas || [])]
  return tags.some((tag) => String(tag).toLowerCase() === key || (key === 'relationships' && tag === 'intimacy'))
}

// A pictogram and a short, non-clinical type label, including on phones.
const COMPACT_KIND_LABELS = {
  professional: { en: 'Sourced', ru: 'Методика', es: 'Con fuente' },
  monitoring: { en: 'Check-in', ru: 'Состояние', es: 'Estado' },
  hobby: { en: 'Explore', ru: 'Самопознание', es: 'Explorar' },
}

function KindBadge({ entry, locale }) {
  const kind = TEST_KINDS.find((type) => type.key === entry.testKind)
  if (!kind) return null
  const Icon = TEST_KIND_ICONS[kind.key]
  const label = COMPACT_KIND_LABELS[kind.key]?.[locale] || COMPACT_KIND_LABELS[kind.key]?.en || kind.label.en
  return <span className={styles.testKindBadge} data-test-kind-badge={kind.key}
    title={kind.description[locale] || kind.description.en}
    aria-label={`${locale === 'ru' ? 'Тип теста' : locale === 'es' ? 'Tipo de prueba' : 'Test type'}: ${kind.label[locale] || kind.label.en}`}>
    <Icon size={14} aria-hidden="true" /><span>{label}</span>
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
  testKinds = [], onToggleTestKind, onClearTestKinds,
  recommendations, activeBattery, onToggleTest, onResetSuggested,
  matchCount, viaProfileEntry = null, onStart, onStartSingle = null, onStartCourse = null, onBrowseFull, onBrowseCore,
  starting = false, actionError = null,
}) {
  const publicCopy = TEXT[locale] || TEXT.en
  const accountCopy = {
    en: { kicker: 'MY TESTS', build: 'Add selected tests', buildHelp: 'Save these tests to My tests', takeTest: 'Add test', privacy: 'Your choices stay on this page until you choose to add tests. Your saved tests, answers and results are preserved.', saved: 'Open My tests' },
    ru: { kicker: 'МОИ ТЕСТЫ', build: 'Добавить выбранные тесты', buildHelp: 'Сохранить эти тесты в «Мои тесты»', takeTest: 'Добавить тест', privacy: 'Выбор остаётся на этой странице, пока вы не решите добавить тесты. Сохранённые тесты, ответы и результаты остаются без изменений.', saved: 'Открыть «Мои тесты»' },
    es: { kicker: 'MIS PRUEBAS', build: 'Añadir pruebas seleccionadas', buildHelp: 'Guardar estas pruebas en Mis pruebas', takeTest: 'Añadir prueba', privacy: 'La selección queda en esta página hasta que decidas añadir pruebas. Se conservan las pruebas, respuestas y resultados guardados.', saved: 'Abrir Mis pruebas' },
  }
  const c = authenticated ? { ...publicCopy, ...(accountCopy[locale] || accountCopy.en) } : publicCopy
  const [visibleCount, setVisibleCount] = useState(5)
  const [journeyMode, setJourneyMode] = useState(initialMode === 'course' ? 'course' : 'tests')
  const [showAllProblems, setShowAllProblems] = useState(false)
  const [problemQuery, setProblemQuery] = useState('')
  const [browseTab, setBrowseTab] = useState('all')
  const [showIndividualVia, setShowIndividualVia] = useState(false)
  const focusKey = [...focus].sort().join('|')
  const problemKey = [...problems].sort().join('|')
  const testKindsKey = [...testKinds].sort().join('|')
  const allProblems = problemsForTopics(focus)
  const chosenFirst = [...allProblems.filter((item) => problems.includes(item.key)),
    ...allProblems.filter((item) => !problems.includes(item.key))]
  const queryText = problemQuery.trim().toLocaleLowerCase(locale)
  const matchingProblems = queryText ? chosenFirst.filter((item) => (item.label[locale] || item.label.en).toLocaleLowerCase(locale).includes(queryText)) : chosenFirst
  const visibleProblems = (showAllProblems || queryText) ? matchingProblems : matchingProblems.slice(0, 8)
  useEffect(() => {
    // The first screen starts from the five closest matches after any filter change.
    setVisibleCount(5)
    setShowAllProblems(false)
  }, [focusKey, depth, maxMinutes, testKindsKey, problemKey])
  const selectedKeys = new Set(activeBattery.map((item) => item.key))
  const via = groupViaRecommendations(recommendations, selectedKeys, showIndividualVia)
  const fullVia = resolveViaProfile(via, viaProfileEntry, selectedKeys, { maxMinutes, testKinds })
  const viaCopy = VIA_COPY[locale] || VIA_COPY.en
  const groupedRecommendations = via.visible
  const visibleRecommendations = groupedRecommendations.slice(0, visibleCount)
  const remainingCount = Math.max(0, groupedRecommendations.length - visibleCount)
  const nextBatch = Math.min(5, remainingCount)
  const format = (template, values) => template.replace(/\{(\w+)\}/g, (_, key) => String(values[key] ?? ''))
  const minutes = activeBattery.reduce((total, item) => total + (item.durationMinutes || 0), 0)
  const hasExtraFilters = maxMinutes > 0 || testKinds.length > 0 || depth !== 'balanced'
  const visibleFocus = new Set(TOPICS.map((topic) => topic.key))
  const themeRefinements = TEST_RECOMMENDATION_FOCUS.filter((topic) => focus.includes(topic.key) && !visibleFocus.has(topic.key))

  return <section className={styles.shell} aria-label={c.title} data-prelogin-test-picker>
    <header className={styles.hero} data-client-tests-hero>
      <div>
        <p className={styles.eyebrow}>{c.heroKicker}</p>
        <h1>{c.heroHeadline}</h1>
        <p className={styles.lead}>{c.heroDescription}</p>
      </div>
      <div className={styles.heroSaying} aria-hidden="true">
        <span>{locale === 'ru' ? 'Осознанность сегодня — больше свободы завтра' : locale === 'es' ? 'Más conciencia hoy, más libertad mañana' : 'Awareness today, more freedom tomorrow'}</span>
        <Heart size={22} strokeWidth={1.5}/>
      </div>
    </header>
    <div className={styles.benefits} aria-label={locale === 'ru' ? 'Возможности мониторинга' : 'Monitoring benefits'} data-client-tests-benefits>
      <div><Activity size={21} aria-hidden="true"/><span>{c.benefitOne}</span></div>
      <div><Heart size={21} aria-hidden="true"/><span>{c.benefitTwo}</span></div>
      <div><Leaf size={21} aria-hidden="true"/><span>{c.benefitThree}</span></div>
      <div><Users size={21} aria-hidden="true"/><span>{c.benefitFour}</span></div>
    </div>
    <section className={styles.promo} aria-label={c.promoTitle} data-client-tests-promo>
      <div className={styles.promoImage}>
        <img src="/images/holistic-house/assessment-coast.svg" alt="" width="480" height="480" decoding="async" />
      </div>
      <div className={styles.promoCopy}>
        <p className={styles.promoKicker}>{c.promoKicker}</p>
        <h2>{c.promoTitle}</h2>
        <p>{c.promoText}</p>
        <a href="#hh-simple-topic-title" className={styles.promoAction}>{c.promoAction}<ArrowRight size={19} aria-hidden="true"/></a>
        {!authenticated && <p className={styles.accessNote} data-prelogin-google-notice>
          {c.accessNote}{' '}
          <Link href={`/${locale === 'ru' ? 'ru' : 'en'}/client`} prefetch={false}>{c.guestAction} →</Link>
        </p>}
      </div>
    </section>

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
          onClick={() => document.getElementById('hh-simple-recommendations')?.scrollIntoView({ behavior:'smooth', block:'start' })}>{c.skip} →</button>
      </div>
      <label className={styles.problemSearch}>
        <Search size={19} aria-hidden="true" />
        <input type="search" value={problemQuery} onChange={(event) => setProblemQuery(event.target.value)}
          placeholder={c.problemSearch} aria-label={c.problemSearch} disabled={!focus.length}/>
      </label>
      {focus.length === 0 ? <p className={styles.problemHint}>{c.problemsEmpty}</p> : <>
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
      {focus.length > 0 && <div className={styles.problemActions}>
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
        {hasExtraFilters && <span className={styles.appliedMark} aria-label={locale === 'ru' ? 'Есть активные фильтры' : 'Filters active'}>•</span>}
        <ChevronDown aria-hidden="true" size={20} className={styles.chevron}/>
      </summary>
      <div className={styles.advancedBody}>
        <h3>{c.depth}</h3>
        <p>{c.depthHelp}</p>
        <div className={styles.depthOptions} role="group" aria-label={c.depth}>
          {[
            {key:'quick', name:c.quick, desc:c.quickNote, Icon:Zap},
            {key:'balanced', name:c.balanced, desc:c.balancedNote, Icon:Sparkles},
            {key:'deep', name:c.deep, desc:c.deepNote, Icon:Compass},
          ].map(({key,name,desc,Icon}) => <button type="button" className={styles.depthOption}
            aria-pressed={depth === key} onClick={() => onDepth(key)} key={key}>
            <Icon size={21} aria-hidden="true"/><span><strong>{name}</strong><small>{desc}</small></span>
          </button>)}
        </div>
        <div className={styles.extraRow}>
          <div className={styles.timeButtons} role="group" aria-label={c.time}>
            <strong>{c.time}</strong>
            {[[0,c.anyTime],[5,c.shortTime],[10,c.mediumTime]].map(([minutes,label]) =>
              <button key={minutes} type="button" aria-pressed={maxMinutes===minutes} onClick={() => onMaxMinutes(minutes)}>{label}</button>
            )}
          </div>
        </div>
        <fieldset className={styles.kindFilters} data-test-kind-filter>
          <legend>{locale === 'ru' ? 'Выберите типы тестов' : locale === 'es' ? 'Elige tipos de pruebas' : 'Choose types of tests'}</legend>
          <p>{locale === 'ru' ? 'Можно отметить несколько типов одновременно. Остальные фильтры тоже сохранятся.' : locale === 'es' ? 'Puedes seleccionar varios tipos a la vez.' : 'Select one or more types. Other filters still apply.'}</p>
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
        <button type="button" className={styles.clearFilters} onClick={() => { onDepth('balanced'); onMaxMinutes(0); onClearTestKinds?.() }}>{c.clear}</button>
      </div>
    </details>


    <section className={styles.section} aria-labelledby="hh-simple-recommendations-title" id="hh-simple-recommendations" data-recommendation-mode={journeyMode}>
      <div className={styles.sectionHeader}>
        <span className={styles.step} aria-hidden="true">3</span>
        <div><h2 id="hh-simple-recommendations-title">{c.recommended}</h2><p>{c.recommendedHelp}</p></div>
      </div>
      {onStartCourse && <div className={styles.modeSwitch} role="group" aria-label={c.modeLabel} data-test-course-switch>
        <button type="button" aria-pressed={journeyMode === 'tests'} onClick={() => setJourneyMode('tests')}>{c.modeTests}</button>
        <button type="button" aria-pressed={journeyMode === 'course'} onClick={() => setJourneyMode('course')}>{c.modeCourse}</button>
      </div>}
      {journeyMode === 'course' && <p className={styles.modeHint}>{c.courseHint}</p>}
      <div className={styles.matchCount} role="status" aria-live="polite">{matchCount} {c.matching}</div>
      <details className={styles.why}>
        <summary>{c.why} <ArrowRight size={14} aria-hidden="true"/></summary>
        <p>{c.whyText}</p>
      </details>
      {(fullVia || via.individualCount > 0) && <section className={styles.viaFamily} aria-label={viaCopy.title} data-via-family data-via-collapsed={via.collapsedCount}>
        <div className={styles.viaFamilyIntro}>
          <strong>{viaCopy.title}</strong>
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
      {recommendations.length > 0 ? <div className={styles.testList} id="hh-public-recommended-tests" data-visible-test-count={visibleRecommendations.length}>
         {visibleRecommendations.map((entry, index) => {
           const checked = selectedKeys.has(entry.key)
           const inputId = `hh-public-test-${entry.key}`
           return <article className={styles.testEntry} key={entry.key} data-test-match={entry.key} data-relevance={entry.matchPercent} data-selected={checked}>
             <div className={styles.testRow} data-selected={checked}>
               <input id={inputId} type="checkbox" checked={checked} onChange={() => onToggleTest(entry.key)}
                 aria-label={entry.title} />
               <span className={styles.testArt} aria-hidden="true">
                 <img src={artworkFor(entry)} alt="" width="80" height="80" loading="lazy" decoding="async" />
               </span>
               <label htmlFor={inputId} className={styles.testInfo}>
                 <strong>{entry.title}</strong>
                 <small>{entry.description || entry.category}</small>
                 <span className={styles.testChips}>
                   <KindBadge entry={entry} locale={locale} />
                   <span className={styles.matchBadge} title={c.fitInfo} aria-label={entry.matchPercent + '% ' + c.fit}>
                     {entry.matchPercent}% <span>{c.fit}</span>
                   </span>
                   <span className={styles.duration}><Clock3 size={13} aria-hidden="true" /> ~{entry.durationMinutes ?? '—'} {c.minuteUnit}</span>
                    {Number.isFinite(entry.questionCount) && entry.questionCount > 0 && <span className={styles.questionCount} title={`${entry.questionCount} ${c.questionUnit}`}><ListChecks size={13} aria-hidden="true" />{entry.questionCount}</span>}
                   {index === 0 && !checked && <span className={styles.suggestion}>{c.suggested}</span>}
                 </span>
               </label>
               <button type="button" className={styles.takeTest}
                 onClick={() => onStartSingle?.(entry)} disabled={starting || !onStartSingle}
                 aria-label={`${c.takeTest}: ${entry.title}`}>
                 {c.takeTest} <ArrowRight size={16} aria-hidden="true" />
               </button>
             </div>
             <details className={styles.testDetails}>
               <summary><Activity size={15} aria-hidden="true" />{c.expandTest}<ChevronDown size={15} aria-hidden="true" /></summary>
               <div className={styles.testDetailsBody}>
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
             </details>
           </article>
         })}
       </div> : <p className={styles.noMatches} role="status">{c.none}</p>}
       {groupedRecommendations.length > 0 && <div className={styles.moreTests} data-inline-test-expansion>
        <span role="status" aria-live="polite">
          {format(c.showing, { shown: visibleRecommendations.length, total: groupedRecommendations.length })}
        </span>
        {remainingCount > 0 && <button type="button" className={styles.showFiveMore}
          aria-controls="hh-public-recommended-tests" aria-expanded={visibleCount > 5}
          onClick={() => setVisibleCount((current) => Math.min(groupedRecommendations.length, current + 5))}>
          {format(c.more, { count: nextBatch })} <ArrowRight size={18} aria-hidden="true" />
        </button>}
      </div>}
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
      <button type="button" className={styles.fullDatabase} onClick={onBrowseFull}>
        <Compass size={20} aria-hidden="true"/>{c.browse}<ChevronDown size={17} aria-hidden="true" className={styles.browseArrow}/>
      </button>
    </section>
    <p className={styles.privacy}>{c.privacy} <Link href={`/${locale === 'ru' ? 'ru' : 'en'}/app`} prefetch={false}>{c.saved} →</Link></p>
  </section>
}
