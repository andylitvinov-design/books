import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import { guestTestJourneyMetrics } from '../lib/app/guest-test-journey.js'

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8')

test('guest profile header counts completed tests only from server plan, plus current answers', () => {
  const plan = { definitionIds: ['a', 'b', 'c', 'd'], completedRunIds: ['run-a'], currentIndex: 1, status: 'active' }
  assert.deepEqual(guestTestJourneyMetrics(plan, { answeredCount: 2, questionCount: 4, phase: 'questions' }),
    { total: 4, completed: 1, position: 1, percent: 38 })
  assert.deepEqual(guestTestJourneyMetrics(plan, { answeredCount: 4, questionCount: 4, phase: 'result' }),
    { total: 4, completed: 1, position: 0, percent: 25 })
  assert.equal(guestTestJourneyMetrics({ ...plan, completedRunIds: ['a', 'b', 'c', 'd'], status: 'completed' }, { phase: 'summary' }).percent, 100)
})

test('single guest test and bad counters have bounded progress', () => {
  assert.equal(guestTestJourneyMetrics(null, { answeredCount: 3, questionCount: 4 }).percent, 75)
  assert.equal(guestTestJourneyMetrics(null, { phase: 'result' }).percent, 100)
  assert.equal(guestTestJourneyMetrics(null, { answeredCount: 120, questionCount: 5 }).percent, 99)
  assert.equal(guestTestJourneyMetrics(null, { answeredCount: 5, questionCount: 5, phase: 'context' }).percent, 99)
  assert.equal(guestTestJourneyMetrics({ definitionIds: Array.from({ length: 20 }, (_, i) => i), completedRunIds: [] }).total, 12)
  assert.equal(guestTestJourneyMetrics(null, { answeredCount: -10, questionCount: 7 }).percent, 0)
})

test('guest flow renders an accessible compact progress header from the existing plan', () => {
  const runner = read('components/app/cabinet-landing.jsx')
  const header = read('components/app/guest-test-journey-progress.jsx')
  const styles = read('components/app/guest-test-journey-progress.module.css')
  assert.match(runner, /<GuestTestJourneyProgress/)
  assert.match(runner, /plan=\{activePlan\}/)
  assert.match(runner, /answeredCount=\{answeredCount\}/)
  assert.match(header, /role="progressbar"/)
  assert.match(header, /aria-valuenow=\{metrics.percent\}/)
  assert.match(header, /aria-current=\{current \? 'step'/)
  assert.match(header, /COPY = \{[\s\S]*en:[\s\S]*ru:[\s\S]*es:/)
  // The approved compact progress card scrolls away on iPhone, so it never occludes the first question.
  assert.match(styles, /position: relative/)
  assert.doesNotMatch(styles, /position:\s*sticky/)
  assert.match(styles, /@media \(max-width: 350px\)/)
  assert.match(styles, /prefers-reduced-motion/)
  assert.doesNotMatch(header, /localStorage|sessionStorage|analytics|fetch\(/)
})
