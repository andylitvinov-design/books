import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { scoreChangeReading } from '../lib/assessments/score-change-reading.js'
import { assessmentEvidenceStatus } from '../lib/assessments/assessment-evidence-status.js'
import { getAssessmentDefinition } from '../lib/assessments/definitions.js'
import { scoreAssessment } from '../lib/assessments/scoring.js'
import { gaugeChange, gaugeModel } from '../lib/assessments/dashboard-gauges.js'

const withScore = (key, date, value) => {
  const def = getAssessmentDefinition(key, 'v1', 'en')
  const answers = Object.fromEntries(def.questions.map(q => [q.id, q.min ?? def.answerScale.min]))
  const scored = scoreAssessment(def, answers)
  return {
    ...scored, id: date, measurementAt: date, accountId: 'synthetic-account',
    dimensions: scored.dimensions.map((row,i)=>i===0?{...row,value}:row),
  }
}

test('comparable self-report movements never get a verified improved/worsened state', () => {
  const before = withScore('cbi-personal','2026-09-10T12:00:00Z',75)
  const after = withScore('cbi-personal','2026-10-15T12:00:00Z',50)
  const scale = after.dimensions[0].key
  const change = gaugeChange(after,before,scale)
  assert.deepEqual(change,{state:'changed',delta:-25})
  const reading = scoreChangeReading(change,after.dimensions[0],'ru',gaugeModel(after.dimensions[0],after,'ru').orientation)
  assert.match(reading.label,/Меньше отмеченных трудностей/)
  assert.match(reading.detail,/не.*доказанным психологическим улучшением/)
  assert.equal(reading.icon,'↓')
  assert.equal(reading.comparable,true)
  const worse = gaugeChange(withScore('cbi-personal','2026-10-16T12:00:00Z',100),before,scale)
  assert.equal(worse.state,'changed')
  assert.match(scoreChangeReading(worse,after.dimensions[0],'en',gaugeModel(after.dimensions[0],after,'en').orientation).label,/More difficulties reported/)
})

test('resource scores are descriptive and not proven intervention effects', () => {
  const before=withScore('brcs','2026-08-01T12:00:00Z',8)
  const after=withScore('brcs','2026-09-01T12:00:00Z',17)
  const change=gaugeChange(after,before,'resources.brcs.total')
  assert.equal(change.state,'changed')
  assert.equal(change.delta,9)
  const en=scoreChangeReading(change,after.dimensions[0],'en',gaugeModel(after.dimensions[0],after,'en').orientation)
  assert.match(en.label,/More resources endorsed/)
  assert.match(en.detail,/cannot establish psychological improvement or deterioration/)
  assert.equal(en.icon,'↑')
  assert.equal(scoreChangeReading({state:'changed',delta:-2},after.dimensions[0],'ru','resource').icon,'↓')
})

test('neutral personality scores show raw increase without ranking the person', () => {
  const neutral={direction:'non-normative',dimensionClass:'trait'}
  const label=scoreChangeReading({state:'changed',delta:3},neutral,'ru')
  assert.equal(label.label,'Балл стал выше')
  assert.doesNotMatch(label.label,/улучш|хуже|лучше|нарушен/i)
  assert.equal(scoreChangeReading({state:'unchanged',delta:0},neutral,'en').label,'Same numeric score')
  assert.match(scoreChangeReading({state:'unchanged',delta:0},neutral,'en').detail,/individual response/)
  assert.equal(scoreChangeReading({state:'baseline',delta:null},neutral,'en').comparable,false)
})


test('mixed-direction historical questionnaires cannot acquire a favourable trend label', () => {
  const mixed = { direction: 'higher-reported-resource', dimensionClass: 'resources' }
  const neutral = scoreChangeReading({state:'changed',delta:2},mixed,'en','neutral')
  assert.equal(neutral.label, 'Score is higher')
  assert.match(neutral.detail, /cannot establish psychological improvement/)
  assert.equal(scoreChangeReading({state:'changed',delta:-2},
    {direction:'lower-reported-difficulty',dimensionClass:'symptoms'},'ru','neutral').label, 'Балл стал ниже')
  assert.match(readFileSync(new URL('../components/app/assessment-gauge.jsx',import.meta.url),'utf8'),
    /gaugeModel\(dimension, current, locale\)\?\.orientation/, 'UI must rely on provenance-checked direction')
})

test('quality labels never conflate version integrity with independent clinical validation', () => {
  const result={definitionKey:'hh-current-state',instrumentLocale:'en'}
  const report={verified:true}
  const section={bandBasis:'descriptive'}
  const author=assessmentEvidenceStatus({result,section,report,locale:'ru'})
  assert.equal(author.kind,'original')
  assert.match(author.summary,/не к валидированной клинической норме/)
  assert.match(author.limitations,/Проверка версии и алгоритма не равна/)
  assert.ok(author.languageNote?.includes('Язык пояснения отличается'))
  const method=assessmentEvidenceStatus({result:{definitionKey:'phq-9',instrumentLocale:'en'},section:{bandBasis:'screening'},report,locale:'en'})
  assert.equal(method.kind,'screening')
  assert.match(method.summary,/does not diagnose/)
  const brcs=assessmentEvidenceStatus({result:{definitionKey:'brcs',instrumentLocale:'en'},section:{bandBasis:'published-reference'},report,locale:'ru'})
  assert.equal(brcs.kind,'reference')
  assert.match(brcs.summary,/не являются индивидуальным прогнозом/)
  const invalid=assessmentEvidenceStatus({result,section,report:{verified:false},locale:'ru'})
  assert.equal(invalid.kind,'unverified')
  assert.equal(invalid.limitations,null)
  assert.equal(invalid.languageNote,null)
  assert.equal(assessmentEvidenceStatus({result:{definitionKey:'rses-10'},section:{bandBasis:'descriptive'},report,locale:'ru'}).kind,'descriptive')
})

test('reports make the distinction visible and nonzero questionnaire minima explicit', () => {
  const root=new URL('../',import.meta.url)
  const source=readFileSync(new URL('components/app/compact-assessment-report.jsx',root),'utf8')
  const trends=readFileSync(new URL('components/app/assessment-gauge.jsx',root),'utf8')
  const css=readFileSync(new URL('components/app/compact-assessment-report.module.css',root),'utf8')
  const dynamics=readFileSync(new URL('components/app/test-dynamics.jsx',root),'utf8')
  assert.match(source,/data-assessment-evidence-status=\{evidence\.kind\}/)
  assert.match(source,/data-assessment-reliability-caveat/)
  assert.match(source,/item.min === 0/)
  assert.match(trends,/data-trend-evidence="descriptive-only"/)
  assert.doesNotMatch(trends,/'Better on this scale'|'Worse on this scale'|'Лучше по этой шкале'|'Хуже по этой шкале'/)
  assert.match(css,/\.evidenceStatus\{/)
  assert.match(dynamics,/Numeric differences describe self-reports/)
  assert.match(dynamics,/Разница баллов отражает самоотчёты/)
})

test('malformed historical dimension arrays are safely guarded in result components', () => {
  const root = new URL('../', import.meta.url)
  const trend = readFileSync(new URL('components/app/assessment-gauge.jsx', root), 'utf8')
  const report = readFileSync(new URL('components/app/compact-assessment-report.jsx', root), 'utf8')
  assert.match(trend, /Array\.isArray\(current\?\.dimensions\)/)
  assert.match(report, /Array\.isArray\(result\?\.dimensions\)/)
})
