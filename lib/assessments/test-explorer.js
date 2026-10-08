import { MONITORING_CATALOG } from '../../data/assessments/catalog.js'
import { MIND_BODY_MONITOR_REGISTRY, MONITOR_AREAS } from '../../data/assessments/mind-body-monitor-registry.js'
import { getAssessmentDefinition } from './definitions.js'

export const TEST_EXPLORER_AXES = Object.freeze([
  'stress', 'anxiety', 'mood', 'sleep', 'energy', 'clarity', 'focus',
  'emotional_regulation', 'relationships', 'resource', 'self_support',
  'functioning', 'personality', 'meaning',
])

export const TEST_EXPLORER_AXIS_LABELS = Object.freeze({
  stress: { en: 'Stress', ru: 'Стресс' }, anxiety: { en: 'Anxiety', ru: 'Тревога' },
  mood: { en: 'Mood', ru: 'Настроение' }, sleep: { en: 'Sleep', ru: 'Сон' },
  energy: { en: 'Energy', ru: 'Энергия' }, clarity: { en: 'Clarity', ru: 'Ясность мышления' },
  focus: { en: 'Focus', ru: 'Фокус' }, emotional_regulation: { en: 'Emotional regulation', ru: 'Эмоциональная регуляция' },
  relationships: { en: 'Relationships', ru: 'Отношения' }, resource: { en: 'Resilience / resource', ru: 'Ресурс' },
  self_support: { en: 'Self-support', ru: 'Внутренняя опора' }, functioning: { en: 'Daily functioning', ru: 'Функционирование' },
  personality: { en: 'Personality', ru: 'Личность' }, meaning: { en: 'Meaning / direction', ru: 'Смысл и направление' },
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
  anxiety: ['anxiety', 'stress', 'mood'], stress: ['stress'], clarity: ['function', 'work', 'stress', 'energy'], body: ['body', 'energy'],
  mood: ['mood'], sleep: ['sleep', 'recovery'], relationships: ['relationships', 'support', 'personality'],
  resources: ['support', 'self-support', 'recovery', 'energy'], attention: ['attention', 'function', 'personality'],
  function: ['function', 'work'], personality: ['personality'], meaning: ['meaning'],
})
// These are interest areas, not diagnosis or measured brain activity.
const FOCUS_AXES = Object.freeze({
  anxiety: ['anxiety', 'stress', 'emotional_regulation'],
  stress: ['stress', 'resource', 'energy'],
  clarity: ['clarity', 'focus', 'functioning'],
  body: ['energy', 'stress', 'functioning'],
  mood: ['mood', 'emotional_regulation'],
  sleep: ['sleep', 'energy'],
  relationships: ['relationships', 'self_support'],
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
  relationships: ['relationships', 'support'],
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
const normalizeSearch = (value) => String(value || '').normalize('NFKD').replace(/[\\u0300-\\u036f]/g, '').toLocaleLowerCase().trim()
function searchTextFor({ catalog, research, title, description, topics, category, area }) {
  return normalizeSearch([
    title, description, category, area, research?.instrument, research?.acronym,
    catalog?.title?.en, catalog?.title?.ru, catalog?.description?.en, catalog?.description?.ru,
    ...topics, ...topics.flatMap((topic) => {
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
    const definition = definitionFor(catalog, locale)
    const areas = discoveryAreas({ topics: catalog.topics, area: research?.area, axis: catalog.axis, durationMinutes: catalog.durationMinutes })
    const entry = {
      key: catalog.key, source: 'product', catalog,
      title: catalog.title?.[locale] || catalog.title?.en || catalog.key,
      description: catalog.description?.[locale] || catalog.description?.en || '',
      acronym: research?.acronym || null, area: areas[0], areas, category: research?.category || catalog.axis || 'product_monitoring',
      priority: research?.priority || 'A', topics: unique(catalog.topics), questionCount: catalog.questionCount ?? definition?.questions?.length ?? null,
      durationMinutes: catalog.durationMinutes ?? null, testStyle: catalog.testStyle || 'professional', testLength: catalog.testLength || 'medium',
      depth: depthFor(catalog.durationMinutes || 2), free: catalog.free === true, rightsStatus: catalog.rightsStatus,
      startable: catalog.startable === true, guestEligible: catalog.guestEligible === true,
      managedSafety: research?.rightsStatus === 'managed_safety_only', definition,
      analysisAxes: unique(catalog.analysisAxes).filter((axis) => TEST_EXPLORER_AXES.includes(axis.key)), originalIndex,
    }
    return Object.freeze({ ...entry, searchText: searchTextFor({ ...entry, research }), selectable: isSelectable(entry, audience) })
  })
  const productKeys = new Set(product.map((entry) => entry.key))
  const research = MIND_BODY_MONITOR_REGISTRY.filter((item) => !productKeys.has(item.key)).map((item, index) => {
    const areas = discoveryAreas({ topics: unique([item.area, item.category]), area: item.area })
    const entry = {
    key: item.key, source: 'research', catalog: null, title: item.instrument, description: '', acronym: item.acronym || null,
    area: areas[0], areas, category: item.category, priority: item.priority || 'C', topics: unique([item.area, item.category]),
    questionCount: item.items ?? null, durationMinutes: null, testStyle: 'professional', testLength: 'medium', depth: 'balanced', free: false,
    rightsStatus: item.rightsStatus, startable: false, guestEligible: false, managedSafety: item.rightsStatus === 'managed_safety_only',
    definition: null, analysisAxes: [], originalIndex: product.length + index, selectable: false,
    }
    return Object.freeze({ ...entry, searchText: searchTextFor({ ...entry, research: item }) })
  })
  return Object.freeze([...product, ...research])
}

export function filterExplorerEntries(entries, filters = {}) {
  const selected = new Set(unique(filters.selectedKeys)), styles = new Set(unique(filters.styles)), lengths = new Set(unique(filters.lengths)), areas = new Set(unique(filters.areas)), focus = unique(filters.focus).filter((key) => FOCUS_TOPICS[key])
  const details = new Set(unique(filters.details).filter((key) => TEST_EXPLORER_DETAIL_TOPICS.some((topic) => topic.key === key)))
  const axes = new Set(unique(filters.axes).filter((key) => TEST_EXPLORER_AXES.includes(key)))
  const maxMinutes = Number(filters.maxMinutes)
  const language = ['bilingual', 'english'].includes(filters.language) ? filters.language : 'any'
  const tracking = ['repeat', 'baseline'].includes(filters.tracking) ? filters.tracking : 'any'
  const availability = filters.availability || 'available', words = normalizeSearch(filters.search).split(/\\s+/).filter(Boolean)
  return entries.filter((entry) => {
    if (selected.has(entry.key)) return true
    if (availability === 'available' && !entry.selectable) return false
    // Several selected themes match by OR; other facets are combined by AND.
    if (focus.length && !directMatches(entry, focus).length) return false
    if (styles.size && !styles.has(entry.testStyle)) return false
    if (lengths.size && !lengths.has(entry.testLength)) return false
    if (areas.size && !(entry.areas || [entry.area]).some((area) => areas.has(area))) return false
    if (details.size && !entry.topics.some((topic) => details.has(topic))) return false
    if (axes.size && !entry.analysisAxes.some((axis) => axes.has(axis.key))) return false
    if (Number.isFinite(maxMinutes) && maxMinutes > 0 && (!entry.durationMinutes || entry.durationMinutes > maxMinutes)) return false
    if (language === 'bilingual' && entry.catalog?.instrumentLocale !== 'dynamic') return false
    if (language === 'english' && entry.catalog?.instrumentLocale !== 'en') return false
    if (tracking === 'repeat' && !(entry.catalog?.suggestedRepeatDays > 0)) return false
    if (tracking === 'baseline' && (!entry.catalog || entry.catalog.suggestedRepeatDays > 0)) return false
    if (filters.freeOnly && !entry.free) return false
    return !words.length || words.every((word) => (entry.searchText || normalizeSearch([entry.title, entry.description, entry.acronym, entry.category, entry.area, ...entry.topics].join(' '))).includes(word))
  })
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
  const details = new Set(unique(preferences.details)), axes = new Set(unique(preferences.axes))
  const selectedEntries = entries.filter((entry) => selected.has(entry.key)), coverage = axesCoverage(selectedEntries), baseAverage = averageCoverage(coverage)
  const requestedDepth = DEPTH_ORDER.includes(preferences.depth) ? preferences.depth : 'balanced', styles = new Set(unique(preferences.styles)), lengths = new Set(unique(preferences.lengths))
  return [...entries].map((entry) => {
    const matchedFocus = directMatches(entry, focus), prospective = axesCoverage([...selectedEntries, entry])
    const marginalCoverageGain = Math.max(0, averageCoverage(prospective) - baseAverage)
    const totalWeight = entry.analysisAxes.reduce((sum, axis) => sum + clamp(axis.weight), 0)
    const redundancyRatio = totalWeight ? Math.min(1, entry.analysisAxes.reduce((sum, axis) => sum + (coverage[axis.key] || 0) * clamp(axis.weight), 0) / totalWeight) : 0
    const distance = Math.abs(DEPTH_ORDER.indexOf(entry.depth) - DEPTH_ORDER.indexOf(requestedDepth))
    let score = 20 + Math.min(48, matchedFocus.length * 24) + (distance === 0 ? 14 : distance === 1 ? 5 : -6)
    if (focus.length && !matchedFocus.length) score -= 12
    score += Math.min(40, entry.topics.filter((topic) => details.has(topic)).length * 20)
    score += Math.min(28, entry.analysisAxes.filter((axis) => axes.has(axis.key)).length * 14)
    if (styles.size && styles.has(entry.testStyle)) score += 10
    if (lengths.size && lengths.has(entry.testLength)) score += 10
    score += profileGapBonus(entry, preferences.profileGaps)
    score += Math.round(18 * marginalCoverageGain) - Math.round(18 * redundancyRatio)
    return { ...entry, score, matchedFocus, marginalCoverageGain, redundancyRatio, profileGapBonus: profileGapBonus(entry, preferences.profileGaps) }
  }).sort((a, b) => b.score - a.score || (PRIORITY[a.priority] ?? 9) - (PRIORITY[b.priority] ?? 9) || (a.durationMinutes ?? Infinity) - (b.durationMinutes ?? Infinity) || a.originalIndex - b.originalIndex || a.key.localeCompare(b.key))
}

export function buildStarterBattery(entries, preferences = {}) {
  const selected = [], totalDuration = () => selected.reduce((sum, entry) => sum + (entry.durationMinutes || 0), 0)
  while (selected.length < 4) {
    const ranked = rankExplorerEntries(entries.filter((entry) => entry.selectable && !selected.some((candidate) => candidate.key === entry.key)), { ...preferences, selectedKeys: selected.map((entry) => entry.key) })
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
