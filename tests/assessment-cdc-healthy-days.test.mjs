import test from 'node:test'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { CDC_HEALTHY_DAYS_DEFINITIONS, CDC_HEALTHY_DAYS_CATALOG } from '../data/assessments/cdc-healthy-days-2026.js'
import { MONITORING_CATALOG } from '../data/assessments/catalog.js'
import { MIND_BODY_MONITOR_REGISTRY } from '../data/assessments/mind-body-monitor-registry.js'
import { canonicalJSON } from '../lib/assessments/contracts.js'
import { getAssessmentDefinition, validateAnswers } from '../lib/assessments/definitions.js'
import { scoreAssessment } from '../lib/assessments/scoring.js'
import { buildExplorerEntries, coverageForSelection } from '../lib/assessments/test-explorer.js'

const get = (key) => getAssessmentDefinition(key, 'v1', 'en')
const answersFor = (definition, value=0) => Object.fromEntries(definition.questions.map(q => [q.id, Math.max(q.min ?? 0, value)]))
const scores = (definition, answers) => Object.fromEntries(scoreAssessment(definition,answers).dimensions.map(d=>[d.key,d.value]))
const keys = ['cdc-hrqol-4','cdc-healthy-days-symptoms']

test('CDC official modules are published, verified, immutable and original-English', () => {
  assert.equal(CDC_HEALTHY_DAYS_CATALOG.length,2)
  assert.equal(CDC_HEALTHY_DAYS_DEFINITIONS.length,2)
  assert.equal(MONITORING_CATALOG.filter(item=>item.startable).length,72)
  assert.equal(MIND_BODY_MONITOR_REGISTRY.length,97)
  for (const key of keys) {
    const item=MONITORING_CATALOG.find(x=>x.key===key), d=get(key)
    assert.ok(item && item.startable && item.guestEligible && item.rightsStatus==='cleared')
    assert.equal(item.questionCount,d.questions.length)
    assert.equal(d.instrumentLocale,'en')
    assert.equal(d.timeframe,'past-30-days')
    assert.equal(d.source.permission,'us-federal-public-domain')
    assert.match(d.source.url,/cdc\.gov\/hrqol\//)
    const { contentHash,...body }=d
    assert.equal(contentHash,'sha256:'+createHash('sha256').update(canonicalJSON(body)).digest('hex'))
    for (const q of d.questions) {
      assert.equal(q.required,true)
      assert.ok(q.text.length>24)
      if (q.inputType==='day-count') {
        assert.equal(q.min,0)
        assert.equal(q.max,30)
      }
    }
  }
})

test('CDC 4-item core reports separate measures with exactly defined capped 30-day summary', () => {
  const d=get('cdc-hrqol-4'), a=answersFor(d,0)
  assert.equal(d.questions.length,4)
  assert.equal(d.questions[0].min,1)
  assert.equal(d.questions[0].max,5)
  assert.deepEqual(d.questions[0].responseAnchors,['Excellent','Very good','Good','Fair','Poor'])
  const zero=scores(d,a)
  assert.equal(zero['function.hrqol4.general_health'],1)
  assert.equal(zero['symptoms.hrqol4.unhealthy_days_index'],0)
  assert.equal(zero['resources.hrqol4.healthy_days_index'],30)
  const mild=scores(d,{...a,'hrqol4.02':4,'hrqol4.03':2,'hrqol4.04':3})
  assert.equal(mild['symptoms.hrqol4.unhealthy_days_index'],6)
  assert.equal(mild['resources.hrqol4.healthy_days_index'],24)
  assert.equal(mild['function.hrqol4.activity_limitation_days'],3)
  const capped=scores(d,{...a,'hrqol4.02':30,'hrqol4.03':30,'hrqol4.04':30})
  assert.equal(capped['symptoms.hrqol4.unhealthy_days_index'],30)
  assert.equal(capped['resources.hrqol4.healthy_days_index'],0)
  assert.equal(Object.keys(capped).length,6)
  assert.throws(()=>validateAnswers(d,{...a,'hrqol4.03':31}),e=>e.code==='INVALID_ANSWER')
  assert.throws(()=>validateAnswers(d,{...a,'hrqol4.04':3}),e=>e.code==='INVALID_ANSWER')
})

test('CDC symptom module reports five independent 0-30-day measures, never an invented total', () => {
  const d=get('cdc-healthy-days-symptoms'), a=answersFor(d,0)
  assert.equal(d.questions.length,5)
  const result=scores(d,{...a,'hrqols.01':7,'hrqols.02':14,'hrqols.03':11,'hrqols.04':16,'hrqols.05':22})
  assert.equal(Object.keys(result).length,5)
  assert.equal(result['symptoms.cdc_healthy_days.pain_days'],7)
  assert.equal(result['symptoms.cdc_healthy_days.sad_days'],14)
  assert.equal(result['symptoms.cdc_healthy_days.anxiety_days'],11)
  assert.equal(result['symptoms.cdc_healthy_days.sleep_days'],16)
  assert.equal(result['resources.cdc_healthy_days.vitality_days'],22)
  assert.equal(d.scoring.dimensions[4].direction,'higher-reported-resource')
  assert.equal(d.scoring.dimensions.some(x=>x.method==='sum'),false)
})

test('CDC modules are available and count towards existing explorer axes, unlike rights-gated instruments', () => {
  for (const locale of ['en','ru']) {
    for (const audience of ['guest','account']) {
      const entries=buildExplorerEntries({locale,audience})
      for (const key of keys) {
        const entry=entries.find(x=>x.key===key)
        assert.ok(entry?.selectable,key+' '+locale+' '+audience)
        assert.equal(entry.questionCount,entry.definition.questions.length)
      }
      const coverage=coverageForSelection(entries,keys)
      assert.ok(coverage.axes.functioning.coverage>0)
      assert.ok(coverage.axes.sleep.coverage>0)
      assert.ok(coverage.axes.anxiety.coverage>0)
      for (const key of ['copsoq-iii','promis-pain-interference-4a','neuro-qol-cognitive-8']) {
        const entry=entries.find(x=>x.key===key)
        assert.ok(entry&&!entry.selectable&&entry.definition===null,key)
      }
    }
  }
})

test('0-to-30 inputs appear as keyboard-accessible numeric dropdowns, not 31 cramped buttons', async()=>{
  const signed=await readFile(new URL('../components/app/app-workspace.jsx',import.meta.url),'utf8')
  const guest=await readFile(new URL('../components/app/cabinet-landing.jsx',import.meta.url),'utf8')
  assert.match(signed,/question\.inputType === 'day-count'/)
  assert.match(guest,/question\.inputType === 'day-count'/)
  assert.match(signed,/Over the past 30 days/)
  assert.match(signed,/<select/)
  assert.match(guest,/<select/)
  assert.match(signed,/onChange=\{\(event\)/)
  assert.match(guest,/onChange=\{\(event\)/)
})
