import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { getAssessmentDefinition } from '../lib/assessments/definitions.js'
import { scoreAssessment } from '../lib/assessments/scoring.js'
import { gaugeModel, gaugeChange, periodWindow, resultsForPeriod, periodComparison, validCalendarDay } from '../lib/assessments/dashboard-gauges.js'

const scored = key => {
  const definition = getAssessmentDefinition(key, 'v1', 'en')
  return scoreAssessment(definition, Object.fromEntries(definition.questions.map(question =>
    [question.id, question.min ?? definition.answerScale.min])))
}
const base = scored('cbi-personal')
const metric = value => ({ ...base.dimensions[0], value })
const resultFor = (key, id, value, at) => {
  const measurement = scored(key)
  return { ...measurement, accountId: 'account', id, measurementAt: at,
    dimensions: measurement.dimensions.map((dimension, index) => index === 0 ? { ...dimension, value } : dimension) }
}
const result = (id, value, at) => resultFor('cbi-personal', id, value, at)

test('raw needle orientation follows difficulty/resource direction; traits remain neutral',()=>{
  assert.equal(gaugeModel(metric(100)).fraction,0)
  assert.equal(gaugeModel(metric(0)).fraction,1)
  assert.equal(gaugeModel({ ...metric(75),direction:'higher-reported-resource' }).fraction,.75)
  assert.equal(gaugeModel({ ...metric(75),direction:'non-normative',dimensionClass:'trait' }).orientation,'neutral')
  assert.equal(gaugeModel({ ...metric(75),direction:undefined }).orientation,'neutral')
  assert.equal(gaugeModel({ ...metric(NaN) }),null)
  assert.equal(gaugeModel({ ...metric(101) }),null)
})

test('comparable raw differences never become invented clinically meaningful changes',()=>{
  const old=result('1',75,'2026-09-01T12:00:00Z')
  const improved=result('2',45.83,'2026-10-11T12:00:00Z')
  assert.deepEqual(gaugeChange(improved,old,metric(0).key),{state:'changed',delta:-29.17})
  assert.equal(gaugeChange(old,improved,metric(0).key).state,'baseline')
  assert.equal(gaugeChange(result('3',95.83,'2026-10-11T12:00:00Z'),old,metric(0).key).state,'changed')
  assert.equal(gaugeChange(result('4',75,'2026-10-11T12:00:00Z'),old,metric(0).key).state,'unchanged')
  const resources=(value,date)=>resultFor('brcs','x',value,date)
  assert.equal(gaugeChange(resources(18,'2026-10-11T12:00:00Z'),resources(8,'2026-09-11T12:00:00Z'),'resources.brcs.total').state,'changed')
  const neutral=(value,date)=>resultFor('ipip-big-five-50','x',value,date)
  assert.equal(gaugeChange(neutral(40,'2026-10-11T12:00:00Z'),neutral(20,'2026-09-11T12:00:00Z'),'trait.ipip50.extraversion').state,'changed')
  assert.equal(gaugeChange({...improved,definitionVersion:'v2'},old,metric(0).key).state,'baseline')
  assert.equal(gaugeChange({...improved,contentHash:'altered'},old,metric(0).key).state,'baseline')
  assert.equal(gaugeChange({...improved,accountId:'another'},old,metric(0).key).state,'baseline')
  assert.equal(gaugeChange({...improved,dimensions:[{...metric(45.83),max:10}]},old,metric(0).key).state,'baseline')
})

test('week, 30-day and 90-day filters operate on timestamped, bounded results',()=>{
 const now=new Date('2026-10-11T22:00:00Z')
 const attempts=[result('1',90,'2026-07-10T22:00:00Z'),result('2',75,'2026-09-21T22:00:00Z'),result('3',45,'2026-10-11T22:00:00Z')]
 assert.deepEqual(resultsForPeriod(attempts,'week','','',now).map(x=>x.id),['3'])
 assert.deepEqual(resultsForPeriod(attempts,'month','','',now).map(x=>x.id),['2','3'])
 assert.deepEqual(resultsForPeriod(attempts,'quarter','','',now).map(x=>x.id),['2','3'])
 assert.equal(resultsForPeriod(attempts,'all','','',now).length,3)
 assert.equal(resultsForPeriod(attempts,'month','','',now).length,2)
})

test('custom dates are inclusive, strictly validated, and never silently behave as all-time',()=>{
 const results=[result('1',90,'2026-10-01T12:00:00Z'),result('2',30,'2026-10-02T23:59:00Z')]
 assert.equal(validCalendarDay('2026-02-30'),false)
 assert.equal(periodWindow('custom','2026-10-01','2026-10-02').valid,true)
 assert.equal(periodWindow('custom','2026-10-03','2026-10-02').valid,false)
 assert.equal(periodWindow('custom','','').valid,false)
 assert.deepEqual(resultsForPeriod(results,'custom','2026-10-02','2026-10-02').map(r=>r.id),['2'])
 assert.deepEqual(resultsForPeriod(results,'custom','',''),[])
})

test('period comparison picks earliest compatible baseline, not a different scoring revision',()=>{
 // Real CBI six-item means: raw totals 19, 5 and 10, multiplied by 25.
 const a=result('one',79.17,'2026-09-01T12:00:00Z')
 const b={...result('other',20.83,'2026-09-21T12:00:00Z'),contentHash:'other'}
 const c=result('new',41.67,'2026-10-10T12:00:00Z')
 assert.equal(periodComparison([c,b,a]).previous.id,'one')
 assert.equal(periodComparison([b,c]).previous,null)
 assert.equal(periodComparison([]).current,null)
})


test('account reports and Insights share measured dials; date ranges live under Results dynamics',()=>{
 const account=readFileSync(new URL('../components/app/app-workspace.jsx',import.meta.url),'utf8')
 const report=readFileSync(new URL('../components/app/compact-assessment-report.jsx',import.meta.url),'utf8')
 const css=readFileSync(new URL('../app/[locale]/app/[[...path]]/assessment-dashboard.css',import.meta.url),'utf8')
 const dynamics=readFileSync(new URL('../components/app/test-dynamics.jsx',import.meta.url),'utf8')
 const view=readFileSync(new URL('../lib/assessments/test-dynamics.js',import.meta.url),'utf8')
 const battery=readFileSync(new URL('../components/app/account-test-battery.jsx',import.meta.url),'utf8')
 assert.match(view,/periodWindow\(period,\s*start,\s*end,\s*now\)/)
 assert.match(view,/resultsForPeriod\(results,\s*period,\s*start,\s*end,\s*now\)/)
 assert.match(dynamics,/setPeriod/)
 assert.match(account,/data-results-view-tabs/)
 assert.match(account,/<TestDynamics results=\{data\.results \|\| \[\]\}/)
 assert.doesNotMatch(battery,/data-my-tests-tabs/)
 assert.match(account,/<ScoreGauge dimension=\{main\}/)
 assert.match(account,/<ScoreTrend current=\{latest\}/)
 assert.match(account,/<PersonalResultReport result=\{result\} locale=\{locale\} previous=\{previous\}/)
 assert.match(account,/onClick=\{repeatTest\}/)
 assert.match(report,/data-primary-support/)
 assert.match(css,/\.hh-insights-test-list/)
 assert.match(css,/grid-template-columns:repeat\(auto-fit/)
})
