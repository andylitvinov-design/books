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

test('missing values and non-normative personality do not become numbers or claims of health', () => {
  assert.equal(scorePortraitDimension({ key: 'weekly.energy', value: null, min: 0, max: 10, direction: 'higher-reported-energy' }), null)
  assert.equal(scorePortraitDimension({ key: 'weekly.energy', min: 0, max: 10, direction: 'higher-reported-energy' }), null)
  assert.equal(scorePortraitDimension({ key: 'weekly.energy', value: Number.NaN, min: 0, max: 10, direction: 'higher-reported-energy' }), null)
  assert.equal(buildPsychPortrait([{ id: 'a', dimensions: [{ key: 'trait.agreeableness', value: 11, min: 4, max: 20, direction: 'non-normative' }] }]).measuredCount, 0)
})

test('repeated compatible scales get directional history, regardless of input order', () => {
  const basic = { definitionKey: 'hh-weekly-pulse', definitionVersion: 'v1', instrumentLocale: 'en' }
  const dimension = (value) => ({ key: 'weekly.tension', value, min: 0, max: 10, direction: 'lower-reported-tension' })
  const early = { ...basic, id: 'early', measurementAt: '2026-10-01T12:00:00Z', dimensions: [dimension(8)] }
  const later = { ...basic, id: 'later', measurementAt: '2026-10-08T12:00:00Z', dimensions: [dimension(3)] }
  const portrait = buildPsychPortrait([later, early])
  assert.equal(portrait.axes.anxiety.percent, 70)
  assert.equal(portrait.axes.anxiety.previousPercent, 20)
  assert.equal(portrait.axes.anxiety.change, 50)
  assert.equal(portrait.axes.anxiety.previousResultId, 'early')
})

test('incompatible instruments are never shown as a repeated time series', () => {
  const one = { id: 'screen', definitionKey: 'phq-4', definitionVersion: 'v1', instrumentLocale: 'en', measurementAt: '2026-10-01', dimensions: [{ key: 'symptoms.phq4.anxiety', value: 4, min: 0, max: 6, direction: 'non-normative' }] }
  const two = { id: 'weekly', definitionKey: 'hh-weekly-pulse', definitionVersion: 'v1', instrumentLocale: 'en', measurementAt: '2026-10-08', dimensions: [{ key: 'weekly.tension', value: 2, min: 0, max: 10, direction: 'lower-reported-tension' }] }
  const portrait = buildPsychPortrait([one, two])
  assert.equal(portrait.axes.anxiety.percent, 80)
  assert.equal(portrait.axes.anxiety.previousPercent, null)
  assert.equal(portrait.axes.anxiety.change, null)
})
