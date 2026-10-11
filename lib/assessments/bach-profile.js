import { BACH_ESSENCE_NAMES } from '../../data/assessments/bach-flower-v1.js'

// Preserves the original My Alchemist scoring rules in src/lib/bachScoring.js:
// situation x1, character x1, control x1.5, +2/+4 for 2/3 sections,
// +1/+2 for item answers 4/5, and +1.5 once when control is present.
// Raw original questionnaire examples are not used as a client's answers.
const WEIGHTS = Object.freeze({ situation: 1, character: 1, control: 1.5 })

export function evaluateBachAnswers(questions, answers) {
  const scores = new Map(BACH_ESSENCE_NAMES.map(remedy => [remedy, {
    remedy, sections: new Set(), sectionScores: { situation: 0, character: 0, control: 0 },
    themes: new Map(), evidenceCount: 0, peakBonus: 0, controlPresenceBonus: 0,
  }]))
  for (const question of questions) {
    const value = Number(answers[question.id] ?? 0)
    if (!Number.isInteger(value) || value < 0 || value > 5)
      throw new RangeError('INVALID_BACH_ANSWER')
    if (value === 0) continue
    const item = scores.get(question.remedy)
    if (!item || !Object.hasOwn(WEIGHTS, question.section))
      throw new RangeError('INVALID_BACH_QUESTION')
    item.sections.add(question.section)
    item.sectionScores[question.section] += value
    item.evidenceCount += 1
    item.themes.set(question.theme, (item.themes.get(question.theme) || 0) + value)
    if (value === 4) item.peakBonus += 1
    if (value === 5) item.peakBonus += 2
    if (question.section === 'control') item.controlPresenceBonus = 1.5
  }
  return BACH_ESSENCE_NAMES.map(remedy => {
    const item = scores.get(remedy)
    const sectionCount = item.sections.size
    const crossSectionBonus = sectionCount === 3 ? 4 : sectionCount === 2 ? 2 : 0
    const weighted = Object.entries(item.sectionScores)
      .reduce((sum, [section, value]) => sum + WEIGHTS[section] * value, 0)
    const rankedThemes = [...item.themes.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    return {
      remedy, total: Math.round((weighted + crossSectionBonus + item.peakBonus + item.controlPresenceBonus) * 10) / 10,
      sections: [...item.sections],
      evidenceCount: item.evidenceCount,
      topTheme: rankedThemes[0]?.[0] || '',
    }
  })
}

export function scoreBachDimensions(definition, answers) {
  const results = evaluateBachAnswers(definition.questions, answers)
  // Maxima are immutable, based on the same question set with all questions answered 5.
  // This keeps keys, maxima, and profile snapshots stable across different answers.
  const maximum = new Map(evaluateBachAnswers(
    definition.questions, Object.fromEntries(definition.questions.map(q => [q.id, 5])),
  ).map(item => [item.remedy, item.total]))
  return results.map(item => ({
    key: 'bach.' + item.remedy.toLowerCase().replace(/[^a-z0-9]+/g, '_'),
    value: item.total, min: 0, max: maximum.get(item.remedy),
    unit: 'weighted-points', timeframe: definition.timeframe, direction: 'non-normative',
    dimensionClass: 'state', sourceConstruct: item.remedy,
    evidenceCount: item.evidenceCount, sections: item.sections, topTheme: item.topTheme,
  }))
}

export function rankBachDimensions(dimensions) {
  return [...dimensions].sort((a,b) =>
    b.value - a.value || (b.evidenceCount || 0) - (a.evidenceCount || 0) ||
    String(a.sourceConstruct).localeCompare(String(b.sourceConstruct)))
}
