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
  assert.ok(tests.length >= 75, 'All current runnable definitions must be covered')
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
  assert.match(high.sections[0].meaning, /physical and psychological exhaustion/)
  assert.match(high.sections[0].meaning, /Mean across 6 items: 100/)
  assert.match(high.sections[0].meaning, /100 \(always\)/)
  assert.match(low.sections[0].meaning, /0 \(never \/ almost never\)/)
  assert.doesNotMatch(low.sections[0].meaning, /part of (this|the).*scale/)
  assert.match(low.sections[0].steps[0], /physical tiredness, emotional depletion/)
  assert.match(high.sections[0].steps[0], /For 7 days/)
  assert.match(high.sections[0].followUp, /healthcare professional/)
  assert.match(buildAssessmentResultReport(scoreAssessment(def, answersFor(def)), 'ru').sections[0].steps.join(' '), /7 дней/)
})

test('high resource measurements receive maintenance rather than deficit advice', () => {
  const def = tests.find(item => item.key === 'hh-role-freedom')
  assert.ok(def)
  const report = buildAssessmentResultReport(scoreAssessment(def, answersFor(def, 'max')), 'en')
  assert.ok(report.sections.some(section => /role|interest|choice|identity/.test(section.steps[0])))
  assert.ok(report.sections.every(section => !/upper part|lower part|middle part/.test(section.steps.join(' '))))
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

test('Insights begins with the completed test list instead of a table of raw measures', () => {
  const account = source('components/app/app-workspace.jsx')
  const styling = source('app/[locale]/app/[[...path]]/workspace.css')
  assert.match(account, /data-testid="completed-test-insights"/)
  assert.match(account, /assessmentHistoryGroups\(data\.results/)
  assert.match(account, /Open analysis & recommendations/)
  assert.match(account, /Открыть отчёт и рекомендации/)
  assert.match(account, /app\/results\//)
  assert.match(account, /group\.history\.map\(attempt =>/)
  assert.match(account, /Advanced: combined charts and measurements/)
  assert.match(account, /<details className="hh-insights-advanced">/)
  assert.match(styling, /@media\(max-width:700px\)/)
})
test('full report appears before the optional raw score panel; no overall unrelated suggestion replaces the instrument interpretation', () => {
  const account = source('components/app/app-workspace.jsx')
  const sourceAt = account.indexOf('function ResultPage(')
  const reportAt = account.indexOf('<PersonalResultReport result={result}', sourceAt)
  const rawAt = account.indexOf('<details className="hh-result-raw-details">', sourceAt)
  const comparisonAt = account.indexOf('<section className="hh-result-comparison"', sourceAt)
  assert.ok(sourceAt >= 0 && reportAt > sourceAt && rawAt > reportAt && comparisonAt > rawAt)
  assert.match(account, /readableScaleName\(d, locale\)/)
  assert.match(account, /All my reports/)
})
test('PDF report includes personal interpretation and next steps for each individual assessment', () => {
  const building = source('lib/profile/client-report.js')
  const rendering = source('lib/profile/client-report-pdf.js')
  assert.match(building, /interpretation:buildAssessmentResultReport\(latest, lang\)/)
  assert.match(rendering, /test\.interpretation\?\.sections\?\.length/)
  assert.match(rendering, /for \(const section of test\.interpretation\.sections\)/)
  assert.match(rendering, /section\.steps\.slice\(0,2\)/)
})
test('each per-test report explains purpose and has human-readable labels rather than machine keys', () => {
  const component = source('components/app/personal-result-report.jsx')
  const engine = source('lib/assessments/result-report.js')
  assert.match(component, /report\.purpose/)
  assert.match(component, /section\.value/)
  assert.match(engine, /visibleConstruct\(dimension, language\)/)
  const def = ASSESSMENT_DEFINITIONS.find(item => item.key === 'hh-current-state' && item.instrumentLocale === 'ru')
  const report = buildAssessmentResultReport(scoreAssessment(def, {...answersFor(def), 'state.fatigue': 6}), 'ru')
  const fatigue = report.sections.find(section => section.key === 'state.fatigue')
  assert.equal(fatigue.construct, 'Усталость')
  assert.equal(fatigue.value, 6)
})
