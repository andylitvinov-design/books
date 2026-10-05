import { monitoringCatalogItem } from '../../data/assessments/catalog.js'

export const TEST_RECOMMENDATION_FOCUS = Object.freeze([
  { key: 'anxiety', label: { en: 'Anxiety & worry', ru: 'Тревога и волнение' } },
  { key: 'stress', label: { en: 'Stress & overload', ru: 'Стресс и перегрузка' } },
  { key: 'clarity', label: { en: 'Clarity & productivity', ru: 'Ясность и продуктивность' } },
  { key: 'body', label: { en: 'Body symptoms & energy', ru: 'Телесные симптомы и энергия' } },
  { key: 'mood', label: { en: 'Mood & sadness', ru: 'Настроение и грусть' } },
  { key: 'sleep', label: { en: 'Sleep & recovery', ru: 'Сон и восстановление' } },
  { key: 'relationships', label: { en: 'Relationships & support', ru: 'Отношения и поддержка' } },
  { key: 'resources', label: { en: 'Resilience & self-regulation', ru: 'Ресурс и саморегуляция' } },
  { key: 'attention', label: { en: 'Attention & focus', ru: 'Внимание и концентрация' } },
  { key: 'function', label: { en: 'Everyday functioning', ru: 'Повседневное функционирование' } },
])

const FOCUS_TOPICS = Object.freeze({
  anxiety: Object.freeze(['anxiety', 'stress', 'mood']),
  stress: Object.freeze(['stress']),
  clarity: Object.freeze(['function', 'work', 'stress', 'energy']),
  body: Object.freeze(['body', 'energy']),
  mood: Object.freeze(['mood']),
  sleep: Object.freeze(['sleep', 'recovery']),
  relationships: Object.freeze(['relationships', 'support', 'personality']),
  resources: Object.freeze(['support', 'self-support', 'recovery', 'energy']),
  attention: Object.freeze(['attention', 'function', 'personality']),
  function: Object.freeze(['function', 'work']),
})

function normaliseFocus(focus) {
  const allowed = new Set(TEST_RECOMMENDATION_FOCUS.map((item) => item.key))
  return [...new Set((Array.isArray(focus) ? focus : []).filter((key) => allowed.has(key)))]
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

export function rankAssessmentDefinitions(definitions, { focus = [], depth = 'balanced' } = {}) {
  const selected = normaliseFocus(focus)
  const requestedDepth = ['quick', 'balanced', 'deep'].includes(depth) ? depth : 'balanced'

  return definitions
    .map((definition, index) => {
      const item = monitoringCatalogItem(definition.key)
      const matchedFocus = selected.filter((key) => focusMatches(item, key))
      const instrumentDepth = depthFor(item)
      let score = 20 + matchedFocus.length * 40
      if (selected.length && !matchedFocus.length) score -= 20

      if (requestedDepth === instrumentDepth) score += 20
      else if (requestedDepth === 'balanced') score += instrumentDepth === 'balanced' ? 20 : 6
      else if (instrumentDepth === 'balanced') score += 5
      else score -= 4

      if (!selected.length && definition.key === 'hh-current-state') score += 16

      return {
        definition,
        score,
        matchedFocus,
        depth: instrumentDepth,
        originalIndex: index,
      }
    })
    .sort((left, right) => right.score - left.score || left.originalIndex - right.originalIndex)
}
