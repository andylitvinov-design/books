// Reviewed entry-point positioning for the existing 14-day My Course engine.
// A programme is a topic emphasis + deterministic starter tests, NOT a new
// medical treatment, duplicated assessment runner, or fabricated test result.
export const COURSE_PROGRAMS = Object.freeze([
  Object.freeze({
    id: 'stress',
    focusTags: Object.freeze(['stress', 'mood', 'energy']),
    primaryGoals: Object.freeze(['calm_regulation', 'emotional_flexibility', 'energy_agency']),
    starterKeys: Object.freeze(['hh-weekly-pulse', 'hh-current-state', 'hh-resource-pulse']),
    title: Object.freeze({ en: 'Stress Relief', ru: 'Антистресс' }),
    pain: Object.freeze({ en: 'My mind never switches off', ru: 'Не получается расслабиться' }),
    promise: Object.freeze({ en: 'Learn small ways to find calm under pressure.', ru: 'Научитесь делать паузу и находить опору в напряжённые моменты.' }),
    outcome: Object.freeze({ en: 'Calm · steadiness · recovery', ru: 'Спокойствие · устойчивость · восстановление' }),
  }),
  Object.freeze({
    id: 'confidence',
    focusTags: Object.freeze(['resources', 'relationships', 'mood']),
    primaryGoals: Object.freeze(['inner_support', 'connection_boundaries', 'emotional_flexibility']),
    starterKeys: Object.freeze(['hh-resource-pulse', 'hh-weekly-pulse', 'hh-current-state']),
    title: Object.freeze({ en: 'Inner Confidence', ru: 'Внутренняя уверенность' }),
    pain: Object.freeze({ en: 'I second-guess myself', ru: 'Постоянно сомневаюсь в себе' }),
    promise: Object.freeze({ en: 'Practise kinder self-talk, choices and boundaries.', ru: 'Практикуйте внутреннюю поддержку, выбор и личные границы.' }),
    outcome: Object.freeze({ en: 'Self-support · voice · boundaries', ru: 'Опора · свой голос · границы' }),
  }),
  Object.freeze({
    id: 'focus',
    focusTags: Object.freeze(['attention', 'energy', 'stress']),
    primaryGoals: Object.freeze(['attention_clarity', 'energy_agency', 'calm_regulation']),
    starterKeys: Object.freeze(['hh-current-state', 'hh-weekly-pulse', 'hh-resource-pulse']),
    title: Object.freeze({ en: 'Focus & Energy', ru: 'Фокус и энергия' }),
    pain: Object.freeze({ en: 'I feel scattered and stuck', ru: 'Трудно собраться и начать действовать' }),
    promise: Object.freeze({ en: 'Build gentle focus and small sustainable actions.', ru: 'Освойте мягкую концентрацию и посильные ежедневные действия.' }),
    outcome: Object.freeze({ en: 'Clarity · action · sustainable pace', ru: 'Ясность · действие · свой темп' }),
  }),
])

export function getCourseProgram(id) {
  return COURSE_PROGRAMS.find(program => program.id === id) || null
}

// Read an approved topic pack from the EXISTING owner-scoped intake. This
// avoids a database migration or persisting a new unsanctioned identifier.
export function courseProgramFromTopics(focusTags) {
  if (!Array.isArray(focusTags) || !focusTags.every(tag => typeof tag === 'string')) return null
  const unique = [...new Set(focusTags)]
  return COURSE_PROGRAMS.find(program => unique.length === program.focusTags.length &&
    program.focusTags.every(tag => unique.includes(tag))) || null
}

// Only reorder already selectable, rights-cleared, scale-guided tests returned
// by courseRecommendedTests. No catalog bypass, invented test or auto-consent.
export function orderCourseProgramTests(recommendedTests, programId, count = 5) {
  const tests = Array.isArray(recommendedTests) ? recommendedTests : []
  const program = getCourseProgram(programId)
  if (!program) return tests
  const ordered = [
    ...program.starterKeys.flatMap(key => tests.find(test => test.key === key) || []),
    ...tests.filter(test => !program.starterKeys.includes(test.key)),
  ].filter((test, index, all) => all.findIndex(item => item.key === test.key) === index)
  return ordered.map((test, index) => ({ ...test, recommended: index < count }))
}

// Priority is a *user-selected learning theme*, not a diagnosis or psychometric
// severity claim. Every returned scale comes from real compatible user results.
export function suggestCourseProgramScales(profile, programId, count = 3) {
  const eligible = Array.isArray(profile?.eligible)
    ? profile.eligible.filter(scale => scale?.eligible === true && typeof scale.id === 'string' &&
      Number.isFinite(scale.score) && Number.isFinite(scale.priorityPercent)) : []
  const program = getCourseProgram(programId)
  const sorted = [...eligible].sort((a,b) => b.priorityPercent - a.priorityPercent || a.id.localeCompare(b.id))
  if (!program) return sorted.slice(0, count)
  const ranks = program.primaryGoals
  return [...sorted].sort((a,b) => {
    const first = ranks.indexOf(a.goal), second = ranks.indexOf(b.goal)
    const aRank = first < 0 ? ranks.length : first, bRank = second < 0 ? ranks.length : second
    return aRank - bRank || b.priorityPercent - a.priorityPercent || a.id.localeCompare(b.id)
  }).slice(0, count)
}
