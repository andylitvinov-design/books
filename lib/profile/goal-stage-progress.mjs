/** Stage zero creates the goal; these eight stages describe its coaching path. */
export const GOAL_STAGE_IDS = Object.freeze([
  'result', 'motivation', 'resources', 'plan', 'obstacles', 'possibilities',
  'acceleration', 'integration',
])

/** Retain old final-stage progress at stage 8, never at the new acceleration stage. */
export function goalStageRecord(goal, index) {
  const id = GOAL_STAGE_IDS[index]
  if (!id || !goal) return null
  const sources = [
    [goal.eightSteps, false], [goal.eightStepProgress, false],
    [goal.stageProgress, null], [goal.sevenSteps, true], [goal.sevenStepProgress, true],
  ]
  const source = sources.find(([items]) => Array.isArray(items) && items.length > 0)
  if (!source) return null
  const [items, legacySource] = source
  const keyed = items.find(step => step && typeof step === 'object' && step.key === id)
  if (keyed) return keyed
  // Unversioned progress was also saved sparsely or out of order. Treat it as
  // the old path until an acceleration key or an eighth stage identifies the
  // new path; a numeric stage 7 alone must never complete acceleration.
  const eightStageEvidence = items.some((step, i) => step && typeof step === 'object' &&
    (step.key === 'acceleration' || (step.index ?? step.number ?? i + 1) === 8))
  const legacy = legacySource === true || (legacySource === null && !eightStageEvidence)
  if (legacy && id === 'acceleration') return null
  const number = legacy && id === 'integration' ? 7 : index + 1
  return items.find((step, i) => step && typeof step === 'object' && !step.key &&
    (step.index ?? step.number ?? i + 1) === number) || null
}
