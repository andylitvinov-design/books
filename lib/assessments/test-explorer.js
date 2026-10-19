import { MONITORING_CATALOG } from '../../data/assessments/catalog.js'
import { getProfessionalScaleResource } from '../../data/assessments/professional-scale-resources-2026.js'
import { officialQuestionnaireSource } from '../../data/assessments/official-questionnaire-sources-2026.js'
import { PSYCHOTHERAPY_CORE_BY_KEY } from '../../data/assessments/psychotherapy-core-100.js'
import { MIND_BODY_MONITOR_REGISTRY, MONITOR_AREAS } from '../../data/assessments/mind-body-monitor-registry.js'
import { getAssessmentDefinition } from './definitions.js'
import { TEST_KINDS, testKindFor, auditTestKey } from './test-kinds.js'
import { assessmentExplanation } from './assessment-methodology.js'
import { assessmentValidity, compareAssessmentValidity } from './psychometric-validity-2026.js'
import { getTestScaleGuide, measuredScaleAxes, scaleOverlap, FOCUS_KEYS } from './scale-guides.js'
import { matchesSelectedProblems, normalizeProblemsForTopics, relevanceForSelectedProblems } from './test-problems.js'
import { testCollectionAffinity } from './test-collection-membership.js'

export const TEST_EXPLORER_AXES = Object.freeze([
  'stress', 'anxiety', 'mood', 'sleep', 'energy', 'clarity', 'focus',
  'emotional_regulation', 'relationships', 'intimacy', 'boundaries', 'sexual_wellbeing', 'embodiment', 'resource', 'self_support',
  'functioning', 'personality', 'meaning',
])

export const TEST_EXPLORER_AXIS_LABELS = Object.freeze({
  stress: { en:'Stress', ru:'Стресс', es:'Estrés' },
  anxiety: { en:'Anxiety', ru:'Тревога', es:'Ansiedad' },
  mood: { en:'Mood', ru:'Настроение', es:'Estado emocional' },
  sleep: { en:'Sleep / recovery', ru:'Сон / восстановление', es:'Sueño / recuperación' },
  energy: { en:'Energy', ru:'Энергия', es:'Energía' },
  clarity: { en:'Mental clarity', ru:'Ясность мышления', es:'Claridad mental' },
  focus: { en:'Focus', ru:'Фокус', es:'Concentración' },
  emotional_regulation: { en:'Emotional awareness', ru:'Осознание эмоций', es:'Conciencia emocional' },
  relationships: { en:'Connection / support', ru:'Связь / поддержка', es:'Conexión / apoyo' },
  intimacy: { en:'Closeness choices', ru:'Выбор близости', es:'Elección de cercanía' },
  boundaries: { en:'Personal boundaries', ru:'Личные границы', es:'Límites personales' },
  sexual_wellbeing: { en:'Sexual self-acceptance', ru:'Самопринятие в сексуальности', es:'Autoaceptación sexual' },
  embodiment: { en:'Body awareness', ru:'Осознание тела', es:'Conciencia corporal' },
  resource: { en:'Perceived resources', ru:'Доступные ресурсы', es:'Recursos percibidos' },
  self_support: { en:'Self-support', ru:'Внутренняя опора', es:'Apoyo interior' },
  functioning: { en:'Daily functioning', ru:'Повседневная активность', es:'Actividad cotidiana' },
  personality: { en:'Personality', ru:'Личность', es:'Personalidad' },
  meaning: { en:'Sense of direction', ru:'Смысл / направление', es:'Sentido y dirección' },
})

// Only catalog topics backed by real questionnaires are offered as detailed facets.
export const TEST_EXPLORER_DETAIL_TOPICS = Object.freeze([
  { key: 'anxiety', label: { en: 'Worry', ru: 'Беспокойство', es: 'Preocupación' } },
  { key: 'stress', label: { en: 'Pressure', ru: 'Напряжение', es: 'Tensión' } },
  { key: 'body', label: { en: 'Physical sensations', ru: 'Телесные ощущения', es: 'Sensaciones físicas' } },
  { key: 'sleep', label: { en: 'Sleep', ru: 'Сон', es: 'Sueño' } },
  { key: 'energy', label: { en: 'Fatigue / vitality', ru: 'Усталость / энергия', es: 'Cansancio / energía' } },
  { key: 'mood', label: { en: 'Emotional state', ru: 'Эмоциональное состояние', es: 'Estado emocional' } },
  { key: 'recovery', label: { en: 'Recovery', ru: 'Восстановление', es: 'Recuperación' } },
  { key: 'self-support', label: { en: 'Inner support', ru: 'Внутренняя опора', es: 'Apoyo interior' } },
  { key: 'support', label: { en: 'Social support', ru: 'Поддержка окружения', es: 'Apoyo social' } },
  { key: 'relationships', label: { en: 'Connection', ru: 'Близость и общение', es: 'Conexiones' } },
  { key: 'intimacy', label: { en: 'Intimacy', ru: 'Близость', es: 'Intimidad' } },
  { key: 'sexuality', label: { en: 'Sexual wellbeing', ru: 'Сексуальность', es: 'Bienestar sexual' } },
  { key: 'tantra', label: { en: 'Tantric presence', ru: 'Тантрическое присутствие', es: 'Presencia tántrica' } },
  { key: 'boundaries', label: { en: 'Boundaries and consent', ru: 'Границы и согласие', es: 'Límites y consentimiento' } },
  { key: 'attention', label: { en: 'Attention', ru: 'Внимание', es: 'Atención' } },
  { key: 'clarity', label: { en: 'Mental clarity', ru: 'Ясность мышления', es: 'Claridad mental' } },
  { key: 'motivation', label: { en: 'Motivation', ru: 'Мотивация', es: 'Motivación' } },
  { key: 'function', label: { en: 'Daily activities', ru: 'Повседневные дела', es: 'Vida cotidiana' } },
  { key: 'work', label: { en: 'Work / productivity', ru: 'Работа / продуктивность', es: 'Trabajo / productividad' } },
  { key: 'meaning', label: { en: 'Meaning and purpose', ru: 'Смысл и цели', es: 'Sentido y metas' } },
  { key: 'personality', label: { en: 'Personal patterns', ru: 'Личностные особенности', es: 'Patrones personales' } },
  { key: 'resources', label: { en: 'Personal strengths', ru: 'Личные ресурсы', es: 'Recursos personales' } },
])

const FOCUS_TOPICS = Object.freeze({
  anxiety: ['anxiety', 'stress', 'mood'], stress: ['stress'], clarity: ['function', 'work', 'stress', 'energy'], body: ['body', 'energy'], health: ['body', 'sleep', 'recovery', 'energy'],
  mood: ['mood'], sleep: ['sleep', 'recovery'], relationships: ['relationships', 'support', 'personality', 'intimacy'],
  intimacy: ['intimacy', 'relationships', 'boundaries'], sexuality: ['sexuality', 'intimacy'], tantra: ['tantra', 'body', 'intimacy'],
  resources: ['support', 'self-support', 'recovery', 'energy'], attention: ['attention', 'function', 'personality'],
  function: ['function', 'work'], personality: ['personality'], meaning: ['meaning'],
})
// These are interest areas, not diagnosis or measured brain activity.
const FOCUS_AXES = Object.freeze({
  anxiety: ['anxiety', 'stress', 'emotional_regulation'],
  stress: ['stress', 'resource', 'energy'],
  clarity: ['clarity', 'focus', 'functioning'],
  body: ['energy', 'stress', 'functioning'],
  // General wellbeing interests use existing measured axes; no clinical health index.
  health: ['energy', 'sleep', 'functioning'],
  mood: ['mood', 'emotional_regulation'],
  sleep: ['sleep', 'energy'],
  relationships: ['relationships', 'intimacy', 'self_support'],
  intimacy: ['intimacy', 'boundaries'], sexuality: ['sexual_wellbeing', 'boundaries'], tantra: ['embodiment', 'intimacy'],
  resources: ['resource', 'self_support', 'energy'],
  attention: ['focus', 'clarity'],
  function: ['functioning', 'clarity'],
  personality: ['personality', 'emotional_regulation'],
  meaning: ['meaning', 'self_support'],
})
const PRIORITY = Object.freeze({ A: 0, B: 1, C: 2 })
const DEPTH_ORDER = Object.freeze(['quick', 'balanced', 'deep'])

const unique = (values) => [...new Set((Array.isArray(values) ? values : []).filter(Boolean))]
const depthFor = (duration) => duration <= 1 ? 'quick' : duration >= 3 ? 'deep' : 'balanced'
const clamp = (value) => Math.max(0, Math.min(1, Number(value) || 0))

// Derive public discovery areas from catalog topics, never from a single internal
// result axis ("state", "symptoms", "resources"), which does not match UI facets.
const AREA_TOPICS = Object.freeze({
  mood: ['mood', 'anxiety'],
  stress: ['stress'],
  sleep: ['sleep', 'recovery'],
  body: ['body', 'energy', 'clarity'],
  relationships: ['relationships', 'intimacy', 'sexuality', 'tantra', 'boundaries', 'support'],
  resources: ['resources', 'self-support', 'recovery', 'motivation'],
  function: ['function', 'work', 'meaning'],
  trauma: ['trauma'],
  attention: ['attention'],
  substances: ['substances'],
  therapy: ['recovery'],
  personality: ['personality'],
  'wu-xing': ['wu-xing'],
})
const VALID_AREAS = new Set(MONITOR_AREAS.map(({ key }) => key))
function discoveryAreas({ topics = [], area = '', axis = '', durationMinutes = null } = {}) {
  const selected = new Set()
  if (area && VALID_AREAS.has(area)) selected.add(area)
  if (durationMinutes != null && durationMinutes <= 1) selected.add('quick')
  for (const [key, keywords] of Object.entries(AREA_TOPICS)) {
    if (keywords.some((topic) => topics.includes(topic))) selected.add(key)
  }
  if (axis === 'baseline') selected.add('personality')
  if (axis === 'function') selected.add('function')
  if (axis === 'resources') selected.add('resources')
  if (axis === 'symptoms' && !selected.size) selected.add('body')
  if (!selected.size) selected.add('quick')
  return Object.freeze([...selected])
}
const normalizeSearch = (value) => String(value || '').normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase().trim()
function searchTextFor({ catalog, research, title, description, methodology, topics, category, area, scaleSearch = [] }) {
  return normalizeSearch([
    title, description, methodology, category, area, research?.instrument, research?.acronym,
    catalog?.title?.en, catalog?.title?.ru, catalog?.description?.en, catalog?.description?.ru,
    ...scaleSearch, ...topics, ...topics.flatMap((topic) => {
      const item = TEST_EXPLORER_DETAIL_TOPICS.find(({ key }) => key === topic)
      return item ? Object.values(item.label) : []
    }),
  ].filter(Boolean).join(' '))
}

function definitionFor(item, locale) {
  if (!item?.startable) return null
  try { return getAssessmentDefinition(item.key, item.version, item.instrumentLocale === 'dynamic' ? locale : item.instrumentLocale) } catch { return null }
}

function isSelectable(entry, audience) {
  return Boolean(entry.catalog && entry.startable && entry.rightsStatus === 'cleared' && entry.definition && (audience !== 'guest' || entry.guestEligible))
}

export function buildExplorerEntries({ locale = 'en', audience = 'guest' } = {}) {
  const registry = new Map(MIND_BODY_MONITOR_REGISTRY.map((item) => [item.key, item]))
  const product = MONITORING_CATALOG.map((catalog, originalIndex) => {
    const research = registry.get(catalog.key)
    const pdfResource = getProfessionalScaleResource(catalog.key)
    const core = PSYCHOTHERAPY_CORE_BY_KEY[catalog.key]
    // Spanish display copy is localised, but an unvalidated Spanish item set must not be inferred.
    const definition = definitionFor(catalog, locale === 'es' ? 'en' : locale)
    const about = assessmentExplanation({key:catalog.key,catalog,definition,research,locale})
    const areas = discoveryAreas({ topics: catalog.topics, area: research?.area, axis: catalog.axis, durationMinutes: catalog.durationMinutes })
    const scaleGuide = definition ? getTestScaleGuide(catalog.key, locale) : null
    const testKind = testKindFor({ key: catalog.key, source: 'product', catalog, definition })
    const keyAudit = auditTestKey({ catalog, definition })
    const entry = {
      key: catalog.key, source: 'product', catalog, testKind, keyAudit,
      psychotherapyCore: Boolean(core), psychotherapyCoreCategory: core?.category || null,
      psychotherapyCoreSummary: core?.summary?.[locale] || core?.summary?.en || null,
      title: catalog.title?.[locale] || catalog.title?.en || catalog.key,
      description: about.summary, methodology: about.originAndEvidence, methodologyStatus: about.status, methodologySourceUrl: about.sourceUrl,
      acronym: research?.acronym || null, area: areas[0], areas, category: research?.category || catalog.axis || 'product_monitoring',
      priority: research?.priority || 'A', topics: unique(catalog.topics), questionCount: catalog.questionCount ?? definition?.questions?.length ?? null,
      durationMinutes: catalog.durationMinutes ?? null, testStyle: catalog.testStyle || 'professional', testLength: catalog.testLength || 'medium',
      depth: depthFor(catalog.durationMinutes || 2), free: catalog.free === true, rightsStatus: catalog.rightsStatus,
      startable: catalog.startable === true, guestEligible: catalog.guestEligible !== false, starterEligible: catalog.starterEligible !== false, explicitOptIn: catalog.explicitOptIn === true,
      managedSafety: research?.rightsStatus === 'managed_safety_only', definition, scaleGuide,
      pdfResource: pdfResource || null,
      officialSource: officialQuestionnaireSource(catalog),
      validity: assessmentValidity(catalog, {locale, sourceUrl: about.sourceUrl}),
      measurementAxes: scaleGuide?.measurementAxes || [],
      scaleSearch: scaleGuide?.scales?.flatMap((item) => [item.label, item.axisLabel, item.skill || '']) || [],
      analysisAxes: unique(catalog.analysisAxes).filter((axis) => TEST_EXPLORER_AXES.includes(axis.key)), originalIndex,
    }
    return Object.freeze({ ...entry, searchText: searchTextFor({ ...entry, research }), selectable: isSelectable(entry, audience) && entry.keyAudit.status === 'ready' })
  })
  const productKeys = new Set(product.map((entry) => entry.key))
  const research = MIND_BODY_MONITOR_REGISTRY.filter((item) => !productKeys.has(item.key)).map((item, index) => {
    const core = PSYCHOTHERAPY_CORE_BY_KEY[item.key]
    const pdfResource = getProfessionalScaleResource(item.key)
    const areas = discoveryAreas({ topics: unique([item.area, item.category]), area: item.area })
    const about = assessmentExplanation({key:item.key,research:item,locale})
    const entry = {
    key: item.key, source: 'research', catalog: null,
    testKind: testKindFor({ key: item.key, source: 'research' }), keyAudit: auditTestKey(),
    psychotherapyCore: Boolean(core), psychotherapyCoreCategory: core?.category || null,
    psychotherapyCoreSummary: core?.summary?.[locale] || core?.summary?.en || null,
    title: item.instrument, description: core?.summary?.[locale] || core?.summary?.en || about.summary, methodology: about.originAndEvidence, methodologyStatus: about.status, methodologySourceUrl: about.sourceUrl, acronym: item.acronym || null,
    area: areas[0], areas, category: item.category, priority: item.priority || 'C', topics: unique([item.area, item.category]),
    questionCount: item.items ?? null, durationMinutes: null, testStyle: 'professional', testLength: 'medium', depth: 'balanced', free: false,
    rightsStatus: item.rightsStatus, startable: false, guestEligible: false, starterEligible: false, managedSafety: item.rightsStatus === 'managed_safety_only',
    definition: null, scaleGuide: null, measurementAxes: [], analysisAxes: [], originalIndex: product.length + index, selectable: false,
    pdfResource: pdfResource || null, officialSource: officialQuestionnaireSource(item),
    validity: assessmentValidity(item, {locale, sourceUrl: about.sourceUrl}), scaleSearch: pdfResource?.scales || [],
    }
    return Object.freeze({ ...entry, searchText: searchTextFor({ ...entry, research: item }) })
  })
  return Object.freeze([...product, ...research])
}

export function filterExplorerEntries(entries, filters = {}) {
  const selected = new Set(unique(filters.selectedKeys)), styles = new Set(unique(filters.styles)), lengths = new Set(unique(filters.lengths)), areas = new Set(unique(filters.areas)), focus = unique(filters.focus).filter((key) => FOCUS_TOPICS[key])
  const kinds = new Set(unique(filters.kinds).filter((key) => TEST_KINDS.some((type) => type.key === key)))
  const details = new Set(unique(filters.details).filter((key) => TEST_EXPLORER_DETAIL_TOPICS.some((topic) => topic.key === key)))
  const problems = normalizeProblemsForTopics(filters.problems, filters.focus)
  const axes = new Set(unique(filters.axes).filter((key) => TEST_EXPLORER_AXES.includes(key)))
  const maxMinutes = Number(filters.maxMinutes)
  const language = ['bilingual', 'english'].includes(filters.language) ? filters.language : 'any'
  const tracking = ['repeat', 'baseline'].includes(filters.tracking) ? filters.tracking : 'any'
  const availability = filters.availability || 'available', words = normalizeSearch(filters.search).split(/\s+/).filter(Boolean)
  return entries.filter((entry) => {
    if (availability === 'pdf' && (!entry.pdfResource || entry.selectable)) return false
    if (selected.has(entry.key)) return true
    if (availability === 'available' && !entry.selectable) return false
    if (availability === 'core' && !entry.psychotherapyCore) return false
    // Several selected themes match by OR; other facets are combined by AND.
    if (focus.length && !directMatches(entry, focus).length &&
        !(axes.size && [...axes].some(axis => measuredScaleAxes(entry).includes(axis)))) return false
    if (!matchesSelectedProblems(entry, problems)) return false
    if (kinds.size && !kinds.has(entry.testKind)) return false
    if (styles.size && !styles.has(entry.testStyle)) return false
    if (lengths.size && !lengths.has(entry.testLength)) return false
    if (areas.size && !(entry.areas || [entry.area]).some((area) => areas.has(area))) return false
    if (details.size && !entry.topics.some((topic) => details.has(topic))) return false
    if (axes.size && ![...axes].some((axis) => measuredScaleAxes(entry).includes(axis))) return false
    if (Number.isFinite(maxMinutes) && maxMinutes > 0 && (!entry.durationMinutes || entry.durationMinutes > maxMinutes)) return false
    if (language === 'bilingual' && entry.catalog?.instrumentLocale !== 'dynamic') return false
    if (language === 'english' && entry.catalog?.instrumentLocale !== 'en') return false
    if (tracking === 'repeat' && !(entry.catalog?.suggestedRepeatDays > 0)) return false
    if (tracking === 'baseline' && (!entry.catalog || entry.catalog.suggestedRepeatDays > 0)) return false
    if (filters.freeOnly && !entry.free) return false
    return !words.length || words.every((word) => (entry.searchText || normalizeSearch([entry.title, entry.description, entry.methodology, entry.acronym, entry.category, entry.area, ...entry.topics].join(' '))).includes(word))
  })
}

// Search is a catalog lookup, independent of previously selected wellbeing
// topics. These aliases describe existing opt-in relationship questionnaires.
const PUBLIC_SEARCH_TOPIC_ALIASES = Object.freeze({
  love: ['relationships', 'intimacy'],
  'любовь': ['relationships', 'intimacy'],
  amor: ['relationships', 'intimacy'],
})

export function searchPublicTestEntries(entries = [], query = '') {
  const term = normalizeSearch(query)
  if (!term) return entries
  const aliasTopics = PUBLIC_SEARCH_TOPIC_ALIASES[term] || []
  return entries
    .filter((entry) => entry?.selectable && (
      aliasTopics.length
        // A Love search means relationship/connection, not unrelated tests
        // that merely mention 'love' in a general strengths explanation.
        ? (entry.topics || []).some((topic) => aliasTopics.includes(topic))
        : normalizeSearch(entry.searchText || [entry.title, entry.description, ...(entry.topics || [])].join(' ')).includes(term)
    ))
    // Place direct title matches first; prefer auditable editions at equal match.
    .sort((left, right) =>
      Number(normalizeSearch(right.title).includes(term)) -
      Number(normalizeSearch(left.title).includes(term)) || compareAssessmentValidity(left, right))
}

function axesCoverage(entries) {
  const coverage = Object.fromEntries(TEST_EXPLORER_AXES.map((key) => [key, 0]))
  for (const entry of entries) for (const axis of entry.analysisAxes || []) coverage[axis.key] = 1 - (1 - coverage[axis.key]) * (1 - clamp(axis.weight))
  return coverage
}
const averageCoverage = (coverage) => Object.values(coverage).reduce((sum, value) => sum + value, 0) / TEST_EXPLORER_AXES.length
const directMatches = (entry, focus) => focus.filter((key) => (FOCUS_TOPICS[key] || []).some((topic) => entry.topics.includes(topic)))
const profileGapBonus = (entry, profileGaps = {}) => {
  const states = entry.analysisAxes.map((axis) => profileGaps?.[axis.key])
  return states.includes('missing') ? 10 : states.includes('stale') ? 6 : 0
}

export function rankExplorerEntries(entries, preferences = {}) {
  const focus = unique(preferences.focus).filter((key) => FOCUS_TOPICS[key]), selected = new Set(unique(preferences.selectedKeys))
  const problems = normalizeProblemsForTopics(preferences.problems, focus)
  const details = new Set(unique(preferences.details)), axes = new Set(unique(preferences.axes))
  const selectedEntries = entries.filter((entry) => selected.has(entry.key)), coverage = axesCoverage(selectedEntries), baseAverage = averageCoverage(coverage)
  const requestedDepth = DEPTH_ORDER.includes(preferences.depth) ? preferences.depth : 'balanced', styles = new Set(unique(preferences.styles)), lengths = new Set(unique(preferences.lengths))
  return [...entries].map((entry) => {
    const matchedFocus = directMatches(entry, focus), prospective = axesCoverage([...selectedEntries, entry])
    const requestedAxes = unique(preferences.axes).filter(key => FOCUS_KEYS.includes(key))
    const impliedAxes = unique(focus.flatMap(key => FOCUS_AXES[key] || [])).filter(key => FOCUS_KEYS.includes(key))
    const scaleIntent = requestedAxes.length ? requestedAxes : impliedAxes
    const matchedScales = scaleOverlap(entry, scaleIntent)
    const marginalCoverageGain = Math.max(0, averageCoverage(prospective) - baseAverage)
    const totalWeight = entry.analysisAxes.reduce((sum, axis) => sum + clamp(axis.weight), 0)
    const redundancyRatio = totalWeight ? Math.min(1, entry.analysisAxes.reduce((sum, axis) => sum + (coverage[axis.key] || 0) * clamp(axis.weight), 0) / totalWeight) : 0
    const distance = Math.abs(DEPTH_ORDER.indexOf(entry.depth) - DEPTH_ORDER.indexOf(requestedDepth))
    // The primary signal is an actual scored scale, not a topic or visual axis.
    let score = 16 + (scaleIntent.length ? 220 * matchedScales : 0)
    score += Math.min(28, matchedFocus.length * 9)
    if (focus.length && !matchedFocus.length && !matchedScales) score -= 12
    score += Math.min(16, entry.topics.filter((topic) => details.has(topic)).length * 8)
    if (problems.length) score += Math.round(32 * relevanceForSelectedProblems(entry, problems))
    // A small ordering tie-break for source-based professional instruments,
    // not a claim that every instrument is clinically validated.
    // Slight source-provenance preference for available, source-documented questionnaires.
    if (entry.selectable && entry.testKind === 'professional') score += 7
    // Audited evidence is a soft ranking factor after topical scale relevance;
    // an article link alone must never be presented as clinical validation.
    score += Math.round(10 * (entry.validity?.priority || 0))
    score += distance === 0 ? 10 : distance === 1 ? 4 : -5
    if (styles.size && styles.has(entry.testStyle)) score += 5
    if (lengths.size && lengths.has(entry.testLength)) score += 5
    score += profileGapBonus(entry, preferences.profileGaps)
    score += Math.round(10 * marginalCoverageGain) - Math.round(7 * redundancyRatio)
    return { ...entry, score, matchedFocus, matchedScales, marginalCoverageGain, redundancyRatio, profileGapBonus: profileGapBonus(entry, preferences.profileGaps) }
  }).sort((a, b) => b.score - a.score || compareAssessmentValidity(a, b) || (PRIORITY[a.priority] ?? 9) - (PRIORITY[b.priority] ?? 9) || (a.durationMinutes ?? Infinity) - (b.durationMinutes ?? Infinity) || a.originalIndex - b.originalIndex || a.key.localeCompare(b.key))
}

/**
 * A transparent heuristic for the public "match %" label.
 * This is a 0..99 relevance estimate from topic overlap, available
 * questionnaire axes, selected concerns, collection and optional depth. It is NOT a clinical
 * probability, a percentile, or an individual person's health measurement.
 */
export function estimatedTestMatchPercent(entry, preferences = {}) {
  if (!entry?.selectable || !entry?.scaleGuide) return null
  const chosen = unique(preferences.axes).filter(key => FOCUS_KEYS.includes(key))
  const focus = unique(preferences.focus).filter(key => FOCUS_TOPICS[key])
  const wanted = chosen.length ? chosen : unique(focus.flatMap(key => FOCUS_AXES[key] || []))
  const fit = scaleOverlap(entry, wanted)
  const depth = DEPTH_ORDER.includes(preferences.depth) ? preferences.depth : 'balanced'
  const depthDistance = Math.abs(DEPTH_ORDER.indexOf(entry.depth) - DEPTH_ORDER.indexOf(depth))
  const depthBonus = depthDistance === 0 ? 10 : depthDistance === 1 ? 5 : 1
  const topicFit = focus.length ? directMatches(entry, focus).length / focus.length : 0
  const problems = normalizeProblemsForTopics(preferences.problems, preferences.focus)
  const problemFit = problems.length ? relevanceForSelectedProblems(entry, problems) : 0
  // A specific concern must meaningfully influence recommendations rather
  // than contribute only a token point or two to the visible percentage.
  const concernBonus = problems.length ? 20 * problemFit : 0
  const percent = wanted.length
    ? 6 + 64 * fit + depthBonus + 7 * topicFit + concernBonus
    : 44 + depthBonus + Math.min(14, measuredScaleAxes(entry).length * 5) + concernBonus
  // A chosen collection is a soft, explicit browsing signal. Extra points go
  // only to questionnaires genuinely tagged with the selected collection,
  // never to measured scores, diagnoses or the user's saved answers.
  const affinity = testCollectionAffinity(entry, preferences.collectionId)
  const collectionBonus = affinity ? 8 + Math.round(12 * affinity) : 0
  // Three browsing-relevance points only; this is not a clinical or validity rating.
  const sourceBonus = entry.testKind === 'professional' ? 3 : 0
  return Math.max(0, Math.min(99, Math.round(percent + collectionBonus + sourceBonus)))
}

/** Keep public recommendations ordered by match percentage, not by checkboxes.
 * The existing registry ranking breaks ties without inventing new tests.
 */
export function rankPublicTestMatches(entries = [], preferences = {}) {
  // Sensitive original self-reflections are visible only after a visitor explicitly
  // chooses a relevant topic. Browsing never opts them into the starter battery.
  const chosenIntimacyTopics = unique([...(preferences.focus || []), ...(preferences.collectionFocus || [])]).filter((key) =>
    ['relationships', 'intimacy', 'sexuality', 'tantra'].includes(key))
  const eligible = entries.filter((entry) => entry?.selectable &&
    (entry.explicitOptIn !== true || chosenIntimacyTopics.some((key) =>
      (FOCUS_TOPICS[key] || []).some((topic) => entry.topics.includes(topic)))))
  const ranked = rankExplorerEntries(eligible, { ...preferences, selectedKeys: [] })
  return ranked
    .map((entry) => ({ ...entry, matchPercent: estimatedTestMatchPercent(entry, preferences) }))
    .sort((a, b) => (b.matchPercent + Math.round(2 * (b.validity?.priority || 0))) -
      (a.matchPercent + Math.round(2 * (a.validity?.priority || 0))) ||
      compareAssessmentValidity(a, b) || b.score - a.score ||
      a.originalIndex - b.originalIndex || a.key.localeCompare(b.key))
}

// Discovery can show questionnaires that require a deliberate choice. Only
// starter-eligible matches may enter the initial or reset public selection.
export function buildPublicStarterBattery(recommendations = []) {
  return Object.freeze(recommendations
    .filter((entry) => entry?.selectable && entry.explicitOptIn !== true && entry.starterEligible !== false)
    .slice(0, 3))
}

export function buildStarterBattery(entries, preferences = {}) {
  const selected = [], totalDuration = () => selected.reduce((sum, entry) => sum + (entry.durationMinutes || 0), 0)
  while (selected.length < 4) {
    const ranked = rankExplorerEntries(entries.filter((entry) => entry.selectable && entry.explicitOptIn !== true && entry.starterEligible !== false && !selected.some((candidate) => candidate.key === entry.key)), { ...preferences, selectedKeys: selected.map((entry) => entry.key) })
    const next = ranked.find((entry) => totalDuration() + (entry.durationMinutes || 0) <= 12 && (selected.length < 2 || entry.marginalCoverageGain >= 0.08))
    if (!next) break
    selected.push(next)
  }
  return Object.freeze(selected)
}

export function coverageForSelection(entries, selectedKeys = []) {
  const selected = new Set(unique(selectedKeys)), coverage = axesCoverage(entries.filter((entry) => selected.has(entry.key)))
  const axes = Object.fromEntries(TEST_EXPLORER_AXES.map((key) => {
    const value = clamp(coverage[key])
    return [key, Object.freeze({ coverage: value, intensity: value === 0 ? 'inactive' : value < 0.35 ? 'faint' : value < 0.7 ? 'medium' : 'strong' })]
  }))
  const coveredCount = Object.values(axes).filter((axis) => axis.coverage >= 0.25).length
  return Object.freeze({ axes: Object.freeze(axes), coveredCount, breadth: coverageLevel({ coveredCount }) })
}

export function coverageLevel({ coveredCount } = {}) { return (Number(coveredCount) || 0) >= 9 ? 'broad' : (Number(coveredCount) || 0) >= 5 ? 'balanced' : 'focused' }

/** Topic-only preview: axes of interest, never a test result or measured coverage. */
/** Preference preview only: never present it as a patient's measured score. */
export function coverageForFilters(entries = [], { focus = [], details = [], axes = [] } = {}) {
  const requested = new Set(unique(axes).filter((axis) => TEST_EXPLORER_AXES.includes(axis)))
  for (const key of unique(focus)) for (const axis of FOCUS_AXES[key] || []) requested.add(axis)
  const requestedTopics = new Set(unique(details).filter((key) => TEST_EXPLORER_DETAIL_TOPICS.some((item) => item.key === key)))
  if (requestedTopics.size) {
    for (const entry of entries) {
      if (!entry.selectable || !entry.topics.some((topic) => requestedTopics.has(topic))) continue
      for (const axis of entry.analysisAxes) if (axis.weight >= 0.4) requested.add(axis.key)
    }
  }
  const axisResults = Object.fromEntries(TEST_EXPLORER_AXES.map((key) => [key, Object.freeze({
    coverage: requested.has(key) ? 0.6 : 0,
    intensity: requested.has(key) ? 'medium' : 'inactive',
  })]))
  return Object.freeze({ axes: Object.freeze(axisResults), coveredCount: requested.size, breadth: coverageLevel({ coveredCount: requested.size }) })
}

export function coverageForFocus(focus = []) {
  const keys = new Set(unique(focus).flatMap((key) => FOCUS_AXES[key] || []))
  const axes = Object.fromEntries(TEST_EXPLORER_AXES.map((key) => [key, Object.freeze({
    coverage: keys.has(key) ? 0.6 : 0,
    intensity: keys.has(key) ? 'medium' : 'inactive',
  })]))
  return Object.freeze({ axes: Object.freeze(axes), coveredCount: keys.size, breadth: coverageLevel({ coveredCount: keys.size }) })
}
