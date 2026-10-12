// My Course R3: deterministic, bilingual account-owned assessment recommendations.
// This module does NOT diagnose, infer a clinical health percentage, or store answers.
import { buildExplorerEntries, rankPublicTestMatches } from '../assessments/test-explorer.js'
import { getTestScaleGuide } from '../assessments/scale-guides.js'

const FOCUS = Object.freeze({
  stress: 'stress', mood: 'mood', energy: 'body',
  attention: 'attention', relationships: 'relationships', resources: 'resources',
})
const GOAL_BY_AXIS = Object.freeze({
  stress: 'calm_regulation', anxiety: 'calm_regulation', sleep: 'energy_agency',
  mood: 'emotional_flexibility', emotional_regulation: 'emotional_flexibility',
  energy: 'energy_agency', resource: 'energy_agency', functioning: 'energy_agency',
  clarity: 'attention_clarity', focus: 'attention_clarity',
  relationships: 'connection_boundaries', intimacy: 'connection_boundaries',
  boundaries: 'connection_boundaries', sexual_wellbeing: 'connection_boundaries',
  embodiment: 'calm_regulation', self_support: 'inner_support', meaning: 'inner_support',
})

export const COURSE_R3_STEPS = Object.freeze([
  { en: 'Start free', ru: 'Начать бесплатно', detail: { en: 'Consent to your private course.', ru: 'Согласие на личный курс.' } },
  { en: 'Choose my areas', ru: 'Выбрать мои темы', detail: { en: 'Select sectors; describe a concern if you wish.', ru: 'Выберите сферы, описание по желанию.' } },
  { en: 'Choose five tests', ru: 'Подобрать пять тестов', detail: { en: 'Review the matches; edit and confirm.', ru: 'Проверьте и измените подборку.' } },
  { en: 'Complete missing tests', ru: 'Пройти недостающие', detail: { en: 'Reuse completed tests from your account.', ru: 'Учтём уже пройденные тесты.' } },
  { en: 'Choose 3–5 scales', ru: 'Выбрать 3–5 шкал', detail: { en: 'See your measured profile and pick priorities.', ru: 'Посмотрите профиль и выберите приоритеты.' } },
  { en: 'Daily personal practice', ru: 'Ежедневная практика', detail: { en: 'Guided exercises, reflections and aphorisms.', ru: 'Упражнения, медитации и афоризмы.' } },
])

const ownResults = results => Array.isArray(results) ? results.filter(
  r => typeof r?.definitionKey === 'string' && typeof r?.definitionVersion === 'string' &&
    Number.isFinite(Date.parse(r?.measurementAt || '')) && Array.isArray(r?.dimensions)
) : []

function newestResult(results, entry) {
  return ownResults(results)
    .filter(r => r.definitionKey === entry.key && r.definitionVersion === entry.definition?.version &&
      (!r.scoringKey || r.scoringKey === entry.definition.scoringKey) &&
      (!r.scoringVersion || r.scoringVersion === entry.definition.scoringVersion))
    .sort((a, b) => Date.parse(b.measurementAt) - Date.parse(a.measurementAt))[0] || null
}

export function courseRecommendedTests({ focusTags = [], results = [], locale = 'en', count = 5 } = {}) {
  const lang = locale === 'ru' ? 'ru' : 'en'
  const focus = [...new Set(focusTags.map(key => FOCUS[key]).filter(Boolean))]
  const choices = buildExplorerEntries({ locale: lang, audience: 'account' })
    .filter(entry => entry.selectable && entry.rightsStatus === 'cleared')
  const ranked = rankPublicTestMatches(choices, { focus, depth: 'balanced' })
  return ranked.map(entry => {
    const result = newestResult(results, entry)
    return {
      key: entry.key, definitionId: entry.definition.id, definitionVersion: entry.definition.version,
      instrumentLocale: entry.definition.instrumentLocale,
      title: entry.title, durationMinutes: entry.durationMinutes, matchPercent: entry.matchPercent,
      completed: Boolean(result), resultId: result?.id || null, completedAt: result?.measurementAt || null,
      measurementAxes: entry.scaleGuide?.scales?.filter(s => s.canChooseSkill).map(s => s.label).slice(0, 5) || [],
      recommended: false,
    }
  }).map((entry, index) => ({ ...entry, recommended: index < count }))
}

export const scaleId = (testKey, dimensionKey) => testKey + '::' + dimensionKey

export function courseMeasuredProfile({ results = [], testKeys = [], locale = 'en', now = Date.now() } = {}) {
  const lang = locale === 'ru' ? 'ru' : 'en'
  const currentResults = ownResults(results)
  const uniqueKeys = [...new Set((Array.isArray(testKeys) ? testKeys : []).filter(key => typeof key === 'string'))]
  const scales = []
  for (const testKey of uniqueKeys) {
    const guide = getTestScaleGuide(testKey, lang)
    if (!guide) continue // Never invent dimensions for unsupported/unlicensed tests.
    const result = currentResults.filter(r => r.definitionKey === testKey &&
      r.definitionVersion === guide.version)
      .sort((a, b) => Date.parse(b.measurementAt) - Date.parse(a.measurementAt))[0]
    if (!result) continue
    const recent = Number.isFinite(now) && now - Date.parse(result.measurementAt) <= 180 * 86400000 &&
      Date.parse(result.measurementAt) <= now + 86400000
    for (const dimension of result.dimensions) {
      const guideScale = guide.scales.find(s => s.key === dimension.key)
      if (!guideScale || !Number.isFinite(dimension.value) || !Number.isFinite(dimension.min) ||
        !Number.isFinite(dimension.max) || dimension.max <= dimension.min ||
        dimension.value < dimension.min || dimension.value > dimension.max ||
        dimension.min !== guideScale.min || dimension.max !== guideScale.max ||
        dimension.direction !== guideScale.direction) continue
      const goal = GOAL_BY_AXIS[guideScale.axis] || null
      const usable = Boolean(recent && guideScale.canChooseSkill && goal &&
        ['reported_difficulty', 'reported_resource'].includes(guideScale.type))
      const fraction = (dimension.value - dimension.min) / (dimension.max - dimension.min)
      // Only a *within-instrument descriptive position*, NEVER a clinical percentile.
      const priorityPercent = usable
        ? Math.round(100 * (guideScale.type === 'reported_difficulty' ? fraction : 1 - fraction)) : null
      scales.push({
        id: scaleId(testKey, dimension.key), testKey, resultId: result.id,
        definitionVersion: guide.version, testTitle: guide.title,
        label: guideScale.label, axis: guideScale.axis, axisLabel: guideScale.axisLabel,
        type: guideScale.type, direction: dimension.direction, score: dimension.value,
        min: dimension.min, max: dimension.max, unit: dimension.unit || 'points',
        measuredAt: result.measurementAt, recent, goal, eligible: usable, priorityPercent,
        observation: guideScale.watch, practice: guideScale.skill,
      })
    }
  }
  const priority = scales.filter(s => s.eligible)
    .sort((a, b) => b.priorityPercent - a.priorityPercent || a.id.localeCompare(b.id))
  return { scales, priority: priority.slice(0, 7), eligible: priority }
}

export function goalForChosenScale(scaleKey, locale = 'en') {
  if (typeof scaleKey !== 'string' || !scaleKey.includes('::')) return null
  const sep = scaleKey.indexOf('::')
  const testKey = scaleKey.slice(0, sep), dimensionKey = scaleKey.slice(sep + 2)
  const guide = getTestScaleGuide(testKey, locale)
  const scale = guide?.scales.find(item => item.key === dimensionKey &&
    item.canChooseSkill && ['reported_difficulty', 'reported_resource'].includes(item.type))
  return scale ? GOAL_BY_AXIS[scale.axis] || null : null
}
