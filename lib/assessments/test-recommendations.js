import { monitoringCatalogItem } from '../../data/assessments/catalog.js'
import { getTestScaleGuide } from './scale-guides.js'

export const TEST_RECOMMENDATION_FOCUS = Object.freeze([
  { key: 'anxiety', label: { en: 'Anxiety & worry', ru: 'Тревога и волнение' } },
  { key: 'stress', label: { en: 'Stress & overload', ru: 'Стресс и перегрузка' } },
  { key: 'clarity', label: { en: 'Clarity & productivity', ru: 'Ясность и продуктивность' } },
  { key: 'body', label: { en: 'Body symptoms & energy', ru: 'Телесные симптомы и энергия' } },
  // Non-diagnostic wellbeing interest; maps only to existing instrument topics/scales.
  { key: 'health', label: { en: 'General health & wellbeing', ru: 'Здоровье и самочувствие', es: 'Salud y bienestar' } },
  { key: 'mood', label: { en: 'Mood & sadness', ru: 'Настроение и грусть' } },
  { key: 'sleep', label: { en: 'Sleep & recovery', ru: 'Сон и восстановление' } },
  { key: 'relationships', label: { en: 'Relationships & support', ru: 'Отношения и поддержка' } },
  { key: 'intimacy', label: { en: 'Love & emotional intimacy', ru: 'Любовь и эмоциональная близость' } },
  { key: 'sexuality', label: { en: 'Sexual wellbeing & consent', ru: 'Сексуальное благополучие и согласие' } },
  { key: 'tantra', label: { en: 'Tantric presence & embodiment', ru: 'Тантрическое присутствие и телесность' } },
  { key: 'resources', label: { en: 'Resilience & self-regulation', ru: 'Ресурс и саморегуляция' } },
  { key: 'attention', label: { en: 'Attention & focus', ru: 'Внимание и концентрация' } },
  { key: 'function', label: { en: 'Everyday functioning', ru: 'Повседневное функционирование' } },
  { key: 'personality', label: { en: 'Personality & patterns', ru: 'Личность и паттерны' } },
  { key: 'meaning', label: { en: 'Meaning & direction', ru: 'Смысл и направление' } },
])

export const TEST_STYLE_FILTERS = Object.freeze([
  { key: 'engaging', label: { en: 'Funny / light', ru: 'Лёгкие / игровые' } },
  { key: 'professional', label: { en: 'Professional', ru: 'Профессиональные' } },
])

export const TEST_LENGTH_FILTERS = Object.freeze([
  { key: 'short', label: { en: 'Short', ru: 'Короткие' } },
  { key: 'medium', label: { en: 'Medium', ru: 'Средние' } },
  { key: 'comprehensive', label: { en: 'Comprehensive', ru: 'Комплексные' } },
])

const FOCUS_TOPICS = Object.freeze({
  anxiety: Object.freeze(['anxiety', 'stress', 'mood']),
  stress: Object.freeze(['stress']),
  clarity: Object.freeze(['function', 'work', 'stress', 'energy']),
  body: Object.freeze(['body', 'energy']),
  health: Object.freeze(['body', 'sleep', 'recovery', 'energy']),
  mood: Object.freeze(['mood']),
  sleep: Object.freeze(['sleep', 'recovery']),
  relationships: Object.freeze(['relationships', 'support', 'personality', 'intimacy']),
  intimacy: Object.freeze(['intimacy','relationships','boundaries']),
  sexuality: Object.freeze(['sexuality','intimacy']), tantra: Object.freeze(['tantra','body','intimacy']),
  resources: Object.freeze(['support', 'self-support', 'recovery', 'energy']),
  attention: Object.freeze(['attention', 'function', 'personality']),
  function: Object.freeze(['function', 'work']),
  personality: Object.freeze(['personality']),
  meaning: Object.freeze(['meaning']),
})

// Focus is an optional shorthand for the actual scored dimensions.
const FOCUS_SCALE_AXES = Object.freeze({
  anxiety:['anxiety'],stress:['stress'],clarity:['clarity','focus'],body:['energy'],health:['energy','sleep','functioning'],
  mood:['mood'],sleep:['sleep'],relationships:['relationships','intimacy'],
  intimacy:['intimacy','boundaries'],sexuality:['sexual_wellbeing','boundaries'],tantra:['embodiment','intimacy'],resources:['resource','self_support'],
  attention:['focus','clarity'],function:['functioning'],personality:['personality'],meaning:['meaning'],
})
function normaliseFocus(focus) {
  const allowed = new Set(TEST_RECOMMENDATION_FOCUS.map((item) => item.key))
  return [...new Set((Array.isArray(focus) ? focus : []).filter((key) => allowed.has(key)))]
}

function normaliseFacet(values, options) {
  const allowed = new Set(options.map((item) => item.key))
  const selected = [...new Set((Array.isArray(values) ? values : []).filter((key) => allowed.has(key)))]
  return selected.length ? selected : options.map((item) => item.key)
}

function depthFor(item) {
  const duration = Number(item?.durationMinutes)
  if (Number.isFinite(duration) && duration <= 1) return 'quick'
  if (Number.isFinite(duration) && duration >= 3) return 'deep'
  return 'balanced'
}

function focusMatches(item, focusKey) {
  const topics = new Set(item?.topics || [])
  return (FOCUS_TOPICS[focusKey] || []).some((topic) => topics.has(topic))
}

export function filterAssessmentDefinitions(definitions, { styles, lengths } = {}) {
  const selectedStyles = new Set(normaliseFacet(styles, TEST_STYLE_FILTERS))
  const selectedLengths = new Set(normaliseFacet(lengths, TEST_LENGTH_FILTERS))

  return definitions.filter((definition) => {
    const item = monitoringCatalogItem(definition.key)
    return item && selectedStyles.has(item.testStyle) && selectedLengths.has(item.testLength)
  })
}

export function rankAssessmentDefinitions(
  definitions,
  { focus = [], depth = 'balanced', styles, lengths } = {},
) {
  const selected = normaliseFocus(focus)
  const requestedDepth = ['quick', 'balanced', 'deep'].includes(depth) ? depth : 'balanced'
  const eligible = filterAssessmentDefinitions(definitions, { styles, lengths })

  return eligible
    .filter(definition => monitoringCatalogItem(definition.key)?.explicitOptIn !== true)
    .map((definition, index) => {
      const item = monitoringCatalogItem(definition.key)
      const matchedFocus = selected.filter((key) => focusMatches(item, key))
      const measured = getTestScaleGuide(definition.key, definition.instrumentLocale)?.measurementAxes || []
      const wanted = [...new Set(selected.flatMap(key => FOCUS_SCALE_AXES[key] || []))]
      const actualMatch = wanted.length ? wanted.filter(axis => measured.includes(axis)).length / wanted.length : 0
      const instrumentDepth = depthFor(item)
      // Prefer direct measured scales; topics are secondary discovery hints.
      let score = 20 + (wanted.length ? actualMatch * 180 : 0) + matchedFocus.length * 8
      if (selected.length && !matchedFocus.length && !actualMatch) score -= 20

      if (requestedDepth === instrumentDepth) score += 20
      else if (requestedDepth === 'balanced') score += instrumentDepth === 'balanced' ? 20 : 6
      else if (instrumentDepth === 'balanced') score += 5
      else score -= 4

      if (!selected.length && definition.key === 'hh-current-state') score += 16
      // Gently prefer source-documented professional questionnaires to HH check-ins
      // when actual measured-scale relevance and requested depth are comparable.
      if (item.testStyle === 'professional' && item.rightsStatus === 'cleared' &&
          !definition.key.startsWith('hh-') && /^https:\/\//.test(definition.source?.url || '')) score += 7

      return {
        definition,
        score,
        matchedFocus,
        depth: instrumentDepth,
        style: item.testStyle,
        length: item.testLength,
        originalIndex: index,
      }
    })
    .sort((left, right) => right.score - left.score || left.originalIndex - right.originalIndex)
}
