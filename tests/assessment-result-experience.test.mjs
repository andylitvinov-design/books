import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { ASSESSMENT_DEFINITIONS } from '../lib/assessments/definitions.js'
import { MONITORING_CATALOG } from '../data/assessments/catalog.js'
import { scoreAssessment } from '../lib/assessments/scoring.js'
import { buildAssessmentResultReport } from '../lib/assessments/result-report.js'

const source = (path) => readFileSync(new URL('../' + path, import.meta.url), 'utf8')
const enabled = new Set(MONITORING_CATALOG.filter(item => item.startable).map(item => item.key + ':' + item.version))
const tests = ASSESSMENT_DEFINITIONS.filter(def => enabled.has(def.key + ':' + def.version))
const answersFor = (def, value = 'min') => Object.fromEntries(def.questions.map((question) => [
  question.id, value === 'max' ? (question.max ?? def.answerScale.max) : (question.min ?? def.answerScale.min),
]))

test('every runnable, versioned assessment produces EN/RU score-tied advice without fabricated diagnostic categories', () => {
  assert.ok(tests.length >= 74, 'All current runnable definitions must be covered')
  for (const def of tests) {
    const scored = scoreAssessment(def, answersFor(def))
    assert.ok(scored.dimensions.length > 0, def.key)
    for (const locale of ['en', 'ru']) {
      const report = buildAssessmentResultReport(scored, locale)
      assert.equal(report.sections.length, scored.dimensions.length, def.key + ' ' + locale)
      assert.ok(report.title.length > 15)
      assert.ok(report.intro.length > 30)
      for (const section of report.sections) {
        assert.ok(section.title.length > 2, def.key)
        assert.ok(section.meaning.length > 40, def.key)
        assert.ok(section.steps.length >= 2, def.key)
        assert.ok(section.steps.every(step => step.length > 40), def.key)
        assert.ok(section.followUp.length > 30, def.key)
      }
      assert.match(report.note, locale === 'ru' ? /не клинический порог/ : /not a clinical cutoff/)
    }
  }
})

test('CBI Personal Burnout is interpreted as exhaustion, not just a 0–100 number', () => {
  const def = tests.find(item => item.key === 'cbi-personal')
  assert.ok(def)
  const low = buildAssessmentResultReport(scoreAssessment(def, answersFor(def)), 'en')
  const high = buildAssessmentResultReport(scoreAssessment(def, answersFor(def, 'max')), 'en')
  assert.equal(high.sections[0].domain, 'burnout')
  assert.match(high.sections[0].title, /Exhaustion/)
  assert.match(high.sections[0].steps.join(' '), /7 days/)
  assert.match(high.sections[0].meaning, /upper part/)
  assert.match(low.sections[0].meaning, /lower part/)
  assert.match(high.sections[0].followUp, /healthcare professional/)
  assert.match(buildAssessmentResultReport(scoreAssessment(def, answersFor(def)), 'ru').sections[0].steps.join(' '), /недел/)
})

test('neutral personality scales are not interpreted as a clinical severity or universal good/bad score', () => {
  const def = tests.find(item => item.key === 'mini-ipip-20')
  const report = buildAssessmentResultReport(scoreAssessment(def, answersFor(def)), 'en')
  assert.ok(report.sections.length >= 4)
  assert.ok(report.sections.every(item => !/upper part of this reported-difficulty scale/.test(item.meaning)))
  assert.match(report.note, /not a clinical cutoff/)
})

test('account and guest Quick/Guided flows render the same two explicit finish actions', () => {
  const controls = source('components/app/test-finish-actions.jsx')
  const account = source('components/app/app-workspace.jsx')
  const guest = source('components/app/cabinet-landing.jsx')
  assert.match(controls, /Save results and get recommendations/)
  assert.match(controls, /Save results and continue to the next test/)
  assert.match(controls, /Сохранить результат и получить рекомендации/)
  assert.match(controls, /temporary/)
  for (const ui of [account, guest]) {
    assert.match(ui, /<TestFinishActions/)
    assert.match(ui, /onReport=\{\(\) =>/)
    assert.match(ui, /onNext=\{\(\) =>/)
    assert.match(ui, /<PersonalResultReport result=/)
  }
  assert.match(account, /onComplete\(result, destination\)/)
  assert.match(account, /root \+ '\/results\/' \+ encodeURIComponent\(result\.id\)/)
  assert.match(account, /advanced\.definitionIds\?\.\[advanced\.currentIndex\]/)
  assert.match(account, /await appFetch\('runs', \{/)
  assert.match(guest, /setPhase\('result'\)/)
  assert.match(guest, /await startRun\(nextDefinition\)/)
  assert.match(guest, /setPhase\('summary'\)/)
  assert.match(guest, /saving a result permanently/i.test(controls) ? /temporary/ : /setGuestResult\(result\)/)
})

test('both report surfaces use persisted scored dimensions; guest Google save is still opt-in', () => {
  const account = source('components/app/app-workspace.jsx')
  const guest = source('components/app/cabinet-landing.jsx')
  assert.match(account, /appFetch\('results\/' \+ id\)/)
  assert.match(account, /<PersonalResultReport result=\{result\}/)
  assert.match(guest, /guest\/runs\/' \+ currentRun\.id \+ '\/submit'/)
  assert.match(guest, /<PersonalResultReport result=\{guestResult\}/)
  assert.match(guest, /sourceKind: 'guest_result'/)
  assert.match(guest, /onClick=\{saveToCabinet\}/)
})
