import test from 'node:test'
import assert from 'node:assert/strict'
import { buildPsychPortrait, scorePortraitDimension } from '../lib/assessments/psych-portrait.js'

test('direction determines length, not the raw number alone', () => {
  assert.equal(scorePortraitDimension({ key: 'weekly.energy', value: 8, min: 0, max: 10, direction: 'higher-reported-energy' }).percent, 80)
  assert.equal(scorePortraitDimension({ key: 'weekly.tension', value: 8, min: 0, max: 10, direction: 'lower-reported-tension' }).percent, 20)
  assert.equal(scorePortraitDimension({ key: 'symptoms.gad7.total', value: 7, min: 0, max: 21, direction: 'non-normative' }).percent, 67)
})

test('unknown, non-normative and invalid scores never fill a ray', () => {
  assert.equal(scorePortraitDimension({ key: 'trait.extraversion', value: 15, min: 4, max: 20, direction: 'non-normative' }), null)
  assert.equal(scorePortraitDimension({ key: 'weekly.mood', value: 5, min: 5, max: 5, direction: 'higher-reported-wellbeing' }), null)
  assert.equal(scorePortraitDimension({ key: 'weekly.mood', value: 20, min: 0, max: 10, direction: 'higher-reported-wellbeing' }), null)
  assert.equal(scorePortraitDimension({ key: 'unknown', value: 5, min: 0, max: 10, direction: 'higher-reported-wellbeing' }), null)
})

test('latest completed compatible measurement wins for each explicitly measured axis', () => {
  const one = { id: 'r1', definitionKey: 'hh-weekly-pulse', measurementAt: '2026-10-01T12:00:00Z', dimensions: [{ key: 'weekly.energy', value: 3, min: 0, max: 10, direction: 'higher-reported-energy' }] }
  const two = { id: 'r2', definitionKey: 'hh-weekly-pulse', measurementAt: '2026-10-08T12:00:00Z', dimensions: [{ key: 'weekly.energy', value: 7, min: 0, max: 10, direction: 'higher-reported-energy' }] }
  const portrait = buildPsychPortrait([two, one])
  assert.equal(portrait.measuredCount, 1)
  assert.equal(portrait.axes.energy.percent, 70)
  assert.equal(portrait.axes.energy.resultId, 'r2')
  assert.equal(portrait.axes.anxiety, null)
  assert.equal(buildPsychPortrait([]).measuredCount, 0)
})
