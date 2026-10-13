// A transparent, measurement-only personal portrait: no diagnoses, thresholds or guessed strengths.
import { buildPsychPortrait } from '../assessments/psych-portrait.js'
import { buildProfileAssessmentView, isProfessionalProfileTest } from './profile-assessment-view.js'
import { PROFILE_AXES, buildProfileSummary } from './summary.js'
import { getTestScaleGuide } from '../assessments/scale-guides.js'

const AREA_LABELS = Object.freeze({
  state: { en: 'Everyday state', ru: 'Текущее состояние' },
  symptoms: { en: 'Stress & load', ru: 'Стресс и нагрузка' },
  function: { en: 'Daily functioning', ru: 'Повседневная активность' },
  resources: { en: 'Personal resources', ru: 'Личные ресурсы' },
  trait: { en: 'Personal traits', ru: 'Особенности личности' },
})
const RESOURCE_LABELS = Object.freeze({
  resource: { en: 'Resources', ru: 'Ресурсы' },
  self_support: { en: 'Self-support', ru: 'Внутренняя опора' },
  meaning: { en: 'Meaning', ru: 'Смыслы' },
  energy: { en: 'Energy', ru: 'Энергия' },
  relationships: { en: 'Connection', ru: 'Связь с другими' },
})
const RESOURCE_AXES = Object.keys(RESOURCE_LABELS)
const asArray = value => Array.isArray(value) ? value : []
const translation = (copy, locale) => copy[locale === 'ru' ? 'ru' : 'en']

export function buildPersonalPortraitSummary(data = {}, locale = 'en') {
  // Professional questionnaires only: exclude unsupervised daily mood snapshots
  // and non-directional personality traits from invented "strength" percentages.
  const source = asArray(data.results).filter(isProfessionalProfileTest)
  const portrait = buildPsychPortrait(source)
  const view = buildProfileAssessmentView(data, locale)
  const model = buildProfileSummary({ snapshot: data.snapshot, results: asArray(data.results) })
  // A missing optional backend snapshot must not erase evidence from a completed,
  // legitimate professional test. Count only dimensions with actual valid scores.
  const measuredClasses = new Set(model.coveredAxes)
  for (const result of source) for (const dimension of asArray(result.dimensions)) {
    const min=dimension?.min, max=dimension?.max, value=dimension?.value
    if (PROFILE_AXES.includes(dimension?.dimensionClass) &&
        value !== null && value !== undefined &&
        [min,max,value].every(Number.isFinite) && max > min && value >= min && value <= max) {
      measuredClasses.add(dimension.dimensionClass)
    }
  }
  const resourceLabels = RESOURCE_AXES.filter(key =>
    portrait.axes[key] && Number.isFinite(portrait.axes[key].percent) &&
    typeof portrait.axes[key].resultId === 'string'
  ).map(key => translation(RESOURCE_LABELS[key], locale))
  const gaps = PROFILE_AXES.filter(key => !measuredClasses.has(key) && AREA_LABELS[key])
    .map(key => translation(AREA_LABELS[key], locale))
  const comparisons = Object.values(portrait.axes).filter(axis =>
    axis && axis.resultId && axis.previousResultId &&
    Number.isFinite(axis.change)
  ).length
  const reports = asArray(data.savedReports).filter(report => report.available !== false).length
  return {
    portrait,
    professionalScaleCount: view.measured.length,
    measuredResourceLabels: resourceLabels.slice(0, 2),
    unmeasuredAreaLabels: gaps.slice(0, 2),
    comparableAxes: comparisons,
    savedReportCount: reports,
    // A selected test is a pending measurement, not an approved course goal.
    pendingTests: view.pending.length,
  }
}

export const PROFILE_FOCUS_COPY = Object.freeze({
  stress: { en:'Stress',ru:'Стресс' },
  mood: { en:'Mood',ru:'Настроение' },
  energy: { en:'Energy',ru:'Энергия' },
  attention: { en:'Attention',ru:'Внимание' },
  relationships: { en:'Relationships',ru:'Отношения' },
  resources: { en:'Resources',ru:'Ресурсы' },
})
export function approvedCourseFocus(course, locale = 'en') {
  if (!course || !Number.isInteger(course.stage) || course.stage < 1) return []
  // Once the learner approves specific measured skills, show those instead of
  // guessing from an old intake concern. Verify each label against a cleared
  // first-party scale guide, not arbitrary strings from report text.
  const approvedScales = course.stage >= 4 ? [...new Set(asArray(course.scaleKeys))]
    .filter(key => typeof key === 'string' && key.length <= 125 && /^[a-z0-9_-]+::[a-z0-9_.-]+$/.test(key))
    .slice(0, 5).flatMap(key => {
      const [testKey, scaleKey] = key.split('::')
      const scale = getTestScaleGuide(testKey, locale)?.scales.find(s => s.key === scaleKey && s.canChooseSkill)
      return scale ? [scale.label] : []
    }) : []
  if (approvedScales.length) return approvedScales.slice(0, 3)
  return [...new Set(asArray(course.focusTags).filter(key => Object.hasOwn(PROFILE_FOCUS_COPY, key)))]
    .slice(0, 3).map(key => translation(PROFILE_FOCUS_COPY[key], locale))
}
