// A ready-made course changes positioning and the verified battery, never
// the assessment/scale-approval/daily-lesson engine. Keep this module pure.
import { MONITORING_CATALOG } from '../../data/assessments/catalog.js'

export const COURSE_PRESET_TAG_PREFIX = 'hh-preset:'

export const COURSE_PRESETS = Object.freeze([
  {
    id: 'calm_balance',
    title: { en: 'Calm & Balance', ru: 'Антистресс' },
    subtitle: { en: 'Find your way back to steadiness', ru: 'Больше спокойствия и устойчивости' },
    description: {
      en: 'Notice everyday tension, explore your coping resources and practise small calming skills.',
      ru: 'Исследуйте повседневное напряжение и ресурсы, развивайте мягкие навыки саморегуляции.',
    },
    axes: { en: ['Stress', 'Self-regulation', 'Recovery'], ru: ['Напряжение', 'Саморегуляция', 'Восстановление'] },
    focusTags: ['stress', 'energy'],
    primaryGoal: 'calm_regulation',
    secondaryGoals: ['energy_agency', 'emotional_flexibility'],
    testKeys: ['hh-current-state', 'hh-weekly-pulse', 'hh-stress-weather', 'hh-resource-pulse', 'hh-recharge-decoder'],
  },
  {
    id: 'business_focus',
    title: { en: 'Focus & Productivity', ru: 'Фокус и продуктивность' },
    subtitle: { en: 'Clarity for work and everyday goals', ru: 'Концентрация для работы и важных задач' },
    description: {
      en: 'Understand the conditions that help you focus and turn small intentions into action.',
      ru: 'Узнайте, что поддерживает ваше внимание, и тренируйте последовательные действия.',
    },
    axes: { en: ['Attention', 'Clarity', 'Follow-through'], ru: ['Внимание', 'Ясность', 'Действие'] },
    focusTags: ['attention', 'energy'],
    primaryGoal: 'attention_clarity',
    secondaryGoals: ['energy_agency', 'calm_regulation'],
    testKeys: ['hh-current-state', 'hh-weekly-pulse', 'hh-focus-mode', 'hh-resource-pulse', 'hh-monthly-profile'],
  },
  {
    id: 'confidence',
    title: { en: 'Confidence & Inner Strength', ru: 'Уверенность и опора' },
    subtitle: { en: 'A kinder, more confident way to act', ru: 'Внутренняя опора и уверенные действия' },
    description: {
      en: 'Explore self-support, connection and boundaries through everyday choices.',
      ru: 'Исследуйте самоподдержку, контакт и границы через небольшие реальные действия.',
    },
    axes: { en: ['Self-support', 'Confidence', 'Boundaries'], ru: ['Самоподдержка', 'Уверенность', 'Границы'] },
    focusTags: ['resources', 'relationships'],
    primaryGoal: 'inner_support',
    secondaryGoals: ['connection_boundaries', 'emotional_flexibility'],
    testKeys: ['hh-current-state', 'hh-weekly-pulse', 'hh-resource-pulse', 'hh-boundary-radar', 'hh-social-battery'],
  },
].map(preset => Object.freeze({
  ...preset,
  focusTags: Object.freeze(preset.focusTags),
  secondaryGoals: Object.freeze(preset.secondaryGoals),
  testKeys: Object.freeze(preset.testKeys),
  title: Object.freeze(preset.title),
  subtitle: Object.freeze(preset.subtitle),
  description: Object.freeze(preset.description),
  axes: Object.freeze(preset.axes),
})))

const byId = new Map(COURSE_PRESETS.map(preset => [preset.id, preset]))
const catalog = new Map(MONITORING_CATALOG.map(test => [test.key, test]))

export function getCoursePreset(id) {
  return typeof id === 'string' ? byId.get(id) || null : null
}

export function coursePresetForTags(tags) {
  if (!Array.isArray(tags)) return null
  const markers = tags.filter(tag => typeof tag === 'string' && tag.startsWith(COURSE_PRESET_TAG_PREFIX))
  if (markers.length !== 1) return null
  return getCoursePreset(markers[0].slice(COURSE_PRESET_TAG_PREFIX.length))
}

export function coursePresetTags(id) {
  const preset = getCoursePreset(id)
  if (!preset) return null
  return [...preset.focusTags, COURSE_PRESET_TAG_PREFIX + preset.id]
}

export function courseVisibleFocusTags(tags) {
  return (Array.isArray(tags) ? tags : []).filter(tag =>
    typeof tag === 'string' && !tag.startsWith(COURSE_PRESET_TAG_PREFIX))
}

export function matchesFixedPresetTests(preset, keys) {
  return Boolean(preset && Array.isArray(keys) &&
    keys.length === preset.testKeys.length &&
    keys.every((key, index) => key === preset.testKeys[index]))
}

export function coursePresetTests(id, locale = 'en') {
  const preset = getCoursePreset(id)
  if (!preset) return []
  const language = locale === 'ru' ? 'ru' : 'en'
  return preset.testKeys.map(key => {
    const test = catalog.get(key)
    return {
      key, title: test?.title?.[language] || test?.title?.en || key,
      durationMinutes: test?.durationMinutes ?? null,
      version: test?.version || null,
    }
  })
}

// Bias the first *reviewed* suggested skill toward the selected theme, but
// never fabricate a score or exclude a measured skill that the client can choose.
export function coursePresetSuggestedScales(profile, presetId, count = 3) {
  const preset = getCoursePreset(presetId)
  const eligible = Array.isArray(profile?.eligible)
    ? profile.eligible.filter(item => item?.eligible === true && typeof item.id === 'string') : []
  const limit = Number.isInteger(count) ? Math.max(0, Math.min(5, count)) : 3
  if (!preset || !limit) return eligible.slice(0, limit)
  const selected = [], seen = new Set()
  for (const goal of [preset.primaryGoal, ...preset.secondaryGoals]) {
    const matching = eligible.find(item => item.goal === goal && !seen.has(item.id))
    if (matching && selected.length < limit) { selected.push(matching); seen.add(matching.id) }
  }
  for (const item of eligible) {
    if (selected.length >= limit) break
    if (!seen.has(item.id)) { selected.push(item); seen.add(item.id) }
  }
  return selected
}
