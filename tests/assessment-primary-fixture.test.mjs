import test from 'node:test'
import assert from 'node:assert/strict'
import { assessmentPrimaryFixtureProps } from '../scripts/helpers/assessment-primary-fixture.mjs'
import { initialAssessmentSection } from '../lib/assessments/result-overview.js'

for (const locale of ['en', 'ru']) {
  test(locale + ': resource lifecycle fixture has explicit direction and distinct defaults', () => {
    const a = assessmentPrimaryFixtureProps('A', locale)
    const b = assessmentPrimaryFixtureProps('B', locale)
    assert.ok(a.report.sections.every(s => s.presentationDirection === 'resource'))
    assert.equal(initialAssessmentSection(a.report), 1)
    assert.equal(initialAssessmentSection(b.report), 2)
    assert.deepEqual(a.result.dimensions.map(d => d.value), [8, 2, 6])
    assert.deepEqual(b.result.dimensions.map(d => d.value), [6, 8, 1])
  })
  test(locale + ': direction is meaningful, not lowest-score for every scale', () => {
    const props = assessmentPrimaryFixtureProps('A', locale)
    props.report.sections.forEach(s => { s.presentationDirection = 'difficulty' })
    assert.equal(initialAssessmentSection(props.report), 0)
    props.report.sections.forEach(s => { s.presentationDirection = 'neutral' })
    assert.equal(initialAssessmentSection(props.report), 0)
    props.report.sections.forEach(s => { delete s.presentationDirection })
    assert.equal(initialAssessmentSection(props.report), 0, 'Old directionless fixture reproduces CI scale-0')
  })
  test(locale + ': review, guest identity and equal resource ties remain covered', () => {
    const review = assessmentPrimaryFixtureProps('review', locale, false, true)
    assert.equal(initialAssessmentSection(review.report), 0)
    const guest = assessmentPrimaryFixtureProps('A', locale, true)
    assert.equal(guest.result.id, undefined)
    assert.deepEqual(structuredClone(guest), guest)
    guest.report.sections.forEach(s => { s.value = 5 })
    assert.equal(initialAssessmentSection(guest.report), 0)
  })
}
