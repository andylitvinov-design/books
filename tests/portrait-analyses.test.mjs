import test from 'node:test'
import assert from 'node:assert/strict'
import { getAssessmentDefinition } from '../lib/assessments/definitions.js'
import { scoreAssessment } from '../lib/assessments/scoring.js'
import { rankPortraitAnalyses, buildPortraitAnalyses } from '../lib/profile/portrait-analyses.js'

function scored(key, id, agoMinutes = 1) {
  const def = getAssessmentDefinition(key, 'v1', 'en')
  const answers = Object.fromEntries(def.questions.map((question, index) => {
    const min = question.min ?? def.answerScale?.min ?? 0
    const max = question.max ?? def.answerScale?.max ?? 10
    return [question.id, min + Math.round((max - min) * (index + 1) / (def.questions.length + 1))]
  }))
  return { ...scoreAssessment(def, answers), id, measurementAt: new Date(Date.now() - agoMinutes * 60000).toISOString() }
}

test('four higher and four lower positions are disjoint and source-linked, from one questionnaire only', () => {
  const weekly = scored('hh-weekly-pulse', 'weekly')
  const model = buildPortraitAnalyses([weekly], 'en')
  assert.equal(model.sourceResultId, 'weekly')
  assert.equal(model.measuredCount, 8)
  assert.equal(model.strongest.length, 4)
  assert.equal(model.weakest.length, 4)
  assert.equal(new Set([...model.strongest, ...model.weakest].map(row => row.dimensionKey)).size, 8)
  assert.ok(model.strongest.every(row => row.mode === 'directional' && row.resultId === 'weekly'))
  assert.ok(model.weakest.every(row => row.mode === 'directional' && row.resultId === 'weekly'))
  assert.ok(model.strongest[0].position >= model.strongest.at(-1).position)
  assert.ok(model.weakest[0].position <= model.weakest.at(-1).position)
})

test('incomplete and descriptive scores never fabricate four strengths or weaknesses', () => {
  const mixed = rankPortraitAnalyses([
    { key: 'energy', resultId: 'one', dimensionKey: 'energy', mode: 'directional', position: 78, measuredAt: '2026-10-20T12:00:00Z' },
    { key: 'focus', resultId: 'one', dimensionKey: 'focus', mode: 'directional', position: 33, measuredAt: '2026-10-20T12:00:00Z' },
    { key: 'intimacy', resultId: 'one', dimensionKey: 'intimacy', mode: 'descriptive', position: 99 },
    { key: 'mood', resultId: 'two', dimensionKey: 'mood', mode: 'directional', position: 90 },
    { key: 'stress', resultId: 'two', dimensionKey: 'stress', mode: 'directional', position: 10 },
    { key: 'anxiety', resultId: 'two', dimensionKey: 'anxiety', mode: 'directional', position: 20 },
  ])
  assert.equal(mixed.sourceResultId, 'two')
  assert.equal(mixed.measuredCount, 3)
  assert.equal(mixed.strongest.length, 2)
  assert.equal(mixed.weakest.length, 1)
  assert.ok([...mixed.strongest, ...mixed.weakest].every(row => row.resultId === 'two'))
  assert.equal(rankPortraitAnalyses([]).measuredCount, 0)
  assert.equal(rankPortraitAnalyses([{ resultId:'only', dimensionKey:'one', mode:'directional', position:50 }]).measuredCount, 0)
})

test('tampered latest attempt is excluded; missing results cannot create rankings', () => {
  const valid = scored('hh-weekly-pulse', 'valid', 15)
  const tampered = { ...scored('hh-weekly-pulse', 'invalid', 1), contentHash:'tampered' }
  const blocked = buildPortraitAnalyses([valid, tampered], 'ru')
  assert.equal(blocked.measuredCount, 0)
  assert.ok(blocked.rejectedCount >= 1)
  assert.deepEqual(blocked.strongest, [])
  assert.deepEqual(blocked.weakest, [])
  const empty = buildPortraitAnalyses([])
  assert.equal(empty.sourceResultId, null)
  assert.deepEqual(empty.strongest, [])
})
