import test from 'node:test'
import assert from 'node:assert/strict'
import { GOAL_STAGE_IDS, goalStageRecord } from '../lib/profile/goal-stage-progress.mjs'

test('eight stages keep acceleration separate from results and perspectives', () => {
  assert.equal(GOAL_STAGE_IDS.length, 8)
  assert.equal(GOAL_STAGE_IDS[6], 'acceleration')
  assert.equal(GOAL_STAGE_IDS[7], 'integration')
})
test('legacy final-stage completion moves to stage eight without completing acceleration', () => {
  for (const property of ['sevenSteps', 'sevenStepProgress', 'stageProgress']) {
    const steps = Array.from({ length: 7 }, (_, index) => ({ number: index + 1, progressPercent: 100 }))
    const goal = { [property]: steps }
    assert.equal(goalStageRecord(goal, 5), steps[5])
    assert.equal(goalStageRecord(goal, 6), null)
    assert.equal(goalStageRecord(goal, 7), steps[6])
  }
})
test('stable stage keys take precedence and new eight-stage progress is retained', () => {
  const final = { key: 'integration', number: 7, progressPercent: 80 }
  assert.equal(goalStageRecord({ sevenSteps: [final] }, 7), final)
  assert.equal(goalStageRecord({ sevenSteps: [final] }, 6), null)
  const steps = GOAL_STAGE_IDS.map((key, index) => ({ key, number: index + 1, progressPercent: index * 10 }))
  assert.equal(goalStageRecord({ stageProgress: steps }, 6), steps[6])
  assert.equal(goalStageRecord({ stageProgress: steps }, 7), steps[7])
  assert.equal(goalStageRecord(null, 0), null)
  assert.equal(goalStageRecord({ stageProgress: [] }, 0), null)
})
test('sparse and unordered legacy stage progress cannot complete the new acceleration stage', () => {
  const final = { number: 7, status: 'completed', progressPercent: 100 }
  const first = { index: 1, progressPercent: 25 }
  for (const steps of [[final], [final, first]]) {
    const goal = { stageProgress: steps }
    assert.equal(goalStageRecord(goal, 6), null)
    assert.equal(goalStageRecord(goal, 7), final)
  }
  assert.equal(goalStageRecord({ stageProgress: [final, first] }, 0), first)
  const ordered = Array.from({ length: 7 }, (_, index) => ({ number: index + 1, progressPercent: 100 }))
  const shuffled = { stageProgress: [ordered[6], ...ordered.slice(0, 6)] }
  assert.equal(goalStageRecord(shuffled, 6), null)
  assert.equal(goalStageRecord(shuffled, 7), ordered[6])
})
test('explicit eight-stage evidence preserves sparse numeric progress and stable keys', () => {
  const acceleration = { number: 7, progressPercent: 35 }
  const final = { number: 8, progressPercent: 70 }
  const goal = { stageProgress: [final, acceleration] }
  assert.equal(goalStageRecord(goal, 6), acceleration)
  assert.equal(goalStageRecord(goal, 7), final)
  for (const property of ['eightSteps', 'eightStepProgress']) {
    assert.equal(goalStageRecord({ [property]: [acceleration] }, 6), acceleration)
    assert.equal(goalStageRecord({ [property]: [acceleration] }, 7), null)
  }
  const keyedAcceleration = { key: 'acceleration', progressPercent: 35 }
  const keyedFinal = { key: 'integration', number: 7, progressPercent: 100 }
  const mixed = { stageProgress: [keyedFinal, { index: 1, progressPercent: 50 }, keyedAcceleration] }
  assert.equal(goalStageRecord(mixed, 6), keyedAcceleration)
  assert.equal(goalStageRecord(mixed, 7), keyedFinal)
  assert.equal(goalStageRecord({ stageProgress: [keyedAcceleration, final] }, 7), final)
})
test('empty new progress containers do not hide saved legacy completion', () => {
  const final = { number: 7, status: 'completed', progressPercent: 100 }
  const goal = { eightSteps: [], eightStepProgress: [], stageProgress: [], sevenSteps: [], sevenStepProgress: [final] }
  assert.equal(goalStageRecord(goal, 6), null)
  assert.equal(goalStageRecord(goal, 7), final)
})
