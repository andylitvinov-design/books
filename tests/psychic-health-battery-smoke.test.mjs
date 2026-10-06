import test from 'node:test'
import assert from 'node:assert/strict'
import { MONITORING_CATALOG } from '../data/assessments/catalog.js'
import { getAssessmentDefinition } from '../lib/assessments/definitions.js'
import { scoreAssessment } from '../lib/assessments/scoring.js'

test('published Psychic Health battery resolves all active executable definitions and score shapes', () => {
  const active = MONITORING_CATALOG.filter((item) => item.startable)
  assert.equal(active.length, 42)

  for (const item of active) {
    const locale = item.instrumentLocale === 'dynamic' ? 'en' : item.instrumentLocale
    const definition = getAssessmentDefinition(item.key, item.version, locale)
    assert.equal(definition.questions.length, item.questionCount, item.key)

    const answers = Object.fromEntries(
      definition.questions.map((question) => [
        question.id,
        question.min ?? definition.answerScale?.min ?? 0,
      ]),
    )
    const scored = scoreAssessment(definition, answers)
    assert.equal(scored.definitionKey, item.key)
    assert.ok(scored.dimensions.length > 0, item.key)
    assert.ok(
      scored.dimensions.every(
        (dimension) =>
          Number.isFinite(dimension.value) &&
          dimension.value >= dimension.min &&
          dimension.value <= dimension.max,
      ),
      item.key,
    )
  }
})
