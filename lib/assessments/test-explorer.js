import { MONITORING_CATALOG } from '../../data/assessments/catalog.js'
import { MIND_BODY_MONITOR_REGISTRY } from '../../data/assessments/mind-body-monitor-registry.js'
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

const FOCUS_TOPICS = Object.freeze({
  anxiety: ['anxiety', 'stress', 'mood'], stress: ['stress'], clarity: ['function', 'work', 'stress', 'energy'], body: ['body', 'energy'],
  mood: ['mood'], sleep: ['sleep', 'recovery'], relationships: ['relationships', 'support', 'personality'],
  resources: ['support', 'self-support', 'recovery', 'energy'], attention: ['attention', 'function', 'personality'],
  function: ['function', 'work'], personality: ['personality'], meaning: ['meaning'],
})
const PRIORITY = Object.freeze({ A: 0, B: 1, C: 2 })
const DEPTH_ORDER = Object.freeze(['quick', 'balanced', 'deep'])

const unique = (values) => [...new Set((Array.isArray(values) ? values : []).filter(Boolean))]
const depthFor = (duration) => duration <= 1 ? 'quick' : duration >= 3 ? 'deep' : 'balanced'
const clamp = (value) => Math.max(0, Math.min(1, Number(value) || 0))

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
    const entry = {
      key: catalog.key, source: 'product', catalog,
      title: catalog.title?.[locale] || catalog.title?.en || catalog.key,
      description: catalog.description?.[locale] || catalog.description?.en || '',
      acronym: research?.acronym || null, area: research?.area || catalog.axis || 'quick', category: research?.category || catalog.axis || 'product_monitoring',
      priority: research?.priority || 'A', topics: unique(catalog.topics), questionCount: catalog.questionCount ?? definition?.questions?.length ?? null,
      durationMinutes: catalog.durationMinutes ?? null, testStyle: catalog.testStyle || 'professional', testLength: catalog.testLength || 'medium',
      depth: depthFor(catalog.durationMinutes || 2), free: catalog.free === true, rightsStatus: catalog.rightsStatus,
      startable: catalog.startable === true, guestEligible: catalog.guestEligible === true,
      managedSafety: research?.rightsStatus === 'managed_safety_only', definition,
      analysisAxes: unique(catalog.analysisAxes).filter((axis) => TEST_EXPLORER_AXES.includes(axis.key)), originalIndex,
    }
    return Object.freeze({ ...entry, selectable: isSelectable(entry, audience) })
  })
  const productKeys = new Set(product.map((entry) => entry.key))
  const research = MIND_BODY_MONITOR_REGISTRY.filter((item) => !productKeys.has(item.key)).map((item, index) => Object.freeze({
    key: item.key, source: 'research', catalog: null, title: item.instrument, description: '', acronym: item.acronym || null,
    area: item.area, category: item.category, priority: item.priority || 'C', topics: unique([item.area, item.category]),
    questionCount: item.items ?? null, durationMinutes: null, testStyle: 'professional', testLength: 'medium', depth: 'balanced', free: false,
    rightsStatus: item.rightsStatus, startable: false, guestEligible: false, managedSafety: item.rightsStatus === 'managed_safety_only',
    definition: null, analysisAxes: [], originalIndex: product.length + index, selectable: false,
  }))
  return Object.freeze([...product, ...research])
}

export function filterExplorerEntries(entries, filters = {}) {
  const selected = new Set(unique(filters.selectedKeys)), styles = new Set(unique(filters.styles)), lengths = new Set(unique(filters.lengths)), areas = new Set(unique(filters.areas))
  const availability = filters.availability || 'available', query = String(filters.search || '').trim().toLocaleLowerCase()
  return entries.filter((entry) => {
    if (selected.has(entry.key)) return true
    if (availability === 'available' && !entry.selectable) return false
    if (styles.size && !styles.has(entry.testStyle)) return false
    if (lengths.size && !lengths.has(entry.testLength)) return false
    if (areas.size && !areas.has(entry.area)) return false
    if (filters.freeOnly && !entry.free) return false
    return !query || [entry.title, entry.description, entry.acronym, entry.category, entry.area, ...entry.topics].filter(Boolean).join(' ').toLocaleLowerCase().includes(query)
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
