import test from 'node:test'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { ASSESSMENT_DEFINITIONS, getAssessmentDefinition } from '../lib/assessments/definitions.js'
import { MONITORING_CATALOG } from '../data/assessments/catalog.js'
import { scoreAssessment } from '../lib/assessments/scoring.js'
import { canonicalJSON } from '../lib/assessments/contracts.js'
import { verifiedHistoryResult } from '../lib/assessments/verified-history.js'
import { syntheticTraumaContext } from './helpers/trauma-context-fixtures.mjs'
import { PRIORITY_METHODS_2026 } from '../data/assessments/priority-methods-2026.js'
import { PROFESSIONAL_SCALE_RESOURCES } from '../data/assessments/professional-scale-resources-2026.js'

const ALL = ASSESSMENT_DEFINITIONS
const register = new Map(ALL.map(d => [d.key + ':' + d.version + ':' + d.instrumentLocale, d]))
const identity = d => d.key + '/' + d.version + '/' + d.instrumentLocale
const bound = (q, d, edge) => q[edge] ?? d.answerScale?.[edge]
const two = n => Math.round(n * 100) / 100
const OVERLAP_KEYS = new Set([
  'itq-adult', 'pcl-5', 'hh-monthly-profile', 'compassion-scale',
  'mhc-sf', 'mspss', 'hh-resource-pulse', 'phq-4', 'cdc-hrqol-4',
])
const eligibleMethod = new Set(['mean','sum','value','capped_sum','healthy_days',
  'official-age-mode-lookup','classic-shaded-count'])
function scoringShape(d) {
  return (d.scoring?.dimensions || []).map(s=>({
    key:s.key, method:s.method, items:s.items, reverseItems:s.reverseItems||[],
    min:s.min,max:s.max,multiplier:s.multiplier??1,
    direction:s.direction??null, dimensionClass:s.dimensionClass??null,
  }))
}
function itemShape(d) {
  return d.questions.map(q=>({
    id:q.id, min:bound(q,d,'min'),max:bound(q,d,'max'),
    keyed:q.keyed??null,direction:q.direction??null,
    hasAnchors:!!q.responseAnchors, count:q.responseAnchors?.length??null,
  }))
}
function analyze(d) {
  const issues=[], dimensions=d.scoring?.dimensions||[],
    byId=new Map(d.questions.map(q=>[q.id,q])),
    use=new Map(d.questions.map(q=>[q.id,0]))
  if (new Set(d.questions.map(q=>q.id)).size!==d.questions.length)
    issues.push('duplicate question ids')
  if(new Set(dimensions.map(s=>s.key)).size!==dimensions.length)
    issues.push('duplicate scale keys')
  for(const q of d.questions) {
    const min=bound(q,d,'min'),max=bound(q,d,'max')
    if(!Number.isInteger(min)||!Number.isInteger(max)||max<=min)
      issues.push('invalid response endpoints '+q.id)
    if(typeof q.text!=='string'||!q.text.trim())
      issues.push('empty item wording '+q.id)
    if(q.responseAnchors && q.responseAnchors.length!==max-min+1)
      issues.push('item answer anchor mismatch '+q.id)
  }
  if(Array.isArray(d.responseAnchors)&&d.answerScale &&
    d.responseAnchors.length!==d.answerScale.max-d.answerScale.min+1)
      issues.push('form answer anchor mismatch')
  let links=0, overlaps=0
  for(const spec of dimensions){
    const keys=spec.items||[]
    if(!eligibleMethod.has(spec.method))issues.push('unsupported method '+spec.key)
    if(!keys.length||new Set(keys).size!==keys.length)issues.push('empty/duplicate item list '+spec.key)
    if(!Number.isFinite(spec.min)||!Number.isFinite(spec.max)||spec.min>=spec.max)
      issues.push('invalid scale endpoints '+spec.key)
    if((spec.reverseItems||[]).some(key=>!keys.includes(key)))
      issues.push('invalid reversed item '+spec.key)
    const included=[]
    for(const id of keys){
      links++
      const q=byId.get(id)
      if(!q){issues.push('unregistered referenced question '+id);continue}
      const used=(use.get(id)||0)+1
      if(used>1)overlaps++
      use.set(id,used)
      included.push(q)
      if(q.direction && spec.direction && q.direction!==spec.direction &&
          !(spec.reverseItems||[]).includes(id))
        issues.push('question/scoring polarity mismatch '+spec.key+'/'+id)
    }
    if (included.length!==keys.length)continue
    if(['mean','sum','value'].includes(spec.method)){
      if(spec.method==='value'&&keys.length!==1)issues.push('value method has multiple source items')
      const multiplier=spec.multiplier??1
      if(!Number.isFinite(multiplier)||multiplier<=0||multiplier>100)
        issues.push('invalid multiplier '+spec.key)
      else {
        const minSum=included.reduce((n,q)=>n+bound(q,d,'min'),0)
        const maxSum=included.reduce((n,q)=>n+bound(q,d,'max'),0)
        const denom=spec.method==='mean'?keys.length:1
        if(spec.min!==two(minSum*multiplier/denom)||spec.max!==two(maxSum*multiplier/denom))
          issues.push('declared score min/max differs from source item bounds '+spec.key)
      }
    } else if (spec.method==='capped_sum' || spec.method==='healthy_days'){
      if(keys.length!==2||spec.cap!==30||spec.min!==0||spec.max!==30)
        issues.push('incorrect 30-day scoring contract '+spec.key)
    }
  }
  const unscored=d.scoringKey==='configured'||d.administration
    ? [...use.entries()].filter(([,count])=>count===0).map(([id])=>id) : []
  if(unscored.length && !(d.key==='itq-adult'&&unscored.length===6))
    issues.push('unassigned questions '+unscored.join(', '))
  if(overlaps && !OVERLAP_KEYS.has(d.key))
    issues.push('unexpected overlapping total/subscale items')
  return {issues,links,dimensions:dimensions.length,unscored,overlaps}
}
test('whole published library has exact provenance, no orphaned rubric or score-bound errors',()=>{
  assert.ok(ALL.length>=230)
  assert.ok(new Set(ALL.map(d=>d.id)).size===ALL.length)
  assert.equal(register.size,ALL.length)
  const summary={forms:0,scales:0,links:0,unscored:0,shared:0,
    authors:0,researchCandidates:0}
  for(const d of ALL) {
    const label=identity(d)
    const {contentHash,...rest}=d
    assert.equal(contentHash,'sha256:'+createHash('sha256').update(canonicalJSON(rest)).digest('hex'),label)
    const scored=analyze(d)
    assert.deepEqual(scored.issues,[],label)
    assert.ok(d.questions.length>0,label)
    assert.ok(d.scoringKey&&d.scoringVersion&&d.resultVersion,label)
    assert.ok(d.source?.title,label)
    summary.forms++
    summary.scales+=scored.dimensions
    summary.links+=scored.links
    summary.unscored+=scored.unscored.length
    summary.shared+=scored.overlaps
    if(d.key.startsWith('hh-'))summary.authors++
    else summary.researchCandidates++
  }
  assert.ok(summary.forms>=230)
  assert.ok(summary.scales>=417)
  assert.ok(summary.links>=2072)
  assert.equal(summary.unscored,6,'ITQ impairment context items are not part of a symptom sum')
  assert.ok(summary.shared>=128,'Some validated totals intentionally reuse subscale items')
  assert.ok(summary.authors>0&&summary.researchCandidates>0)
})

test('all 145 active catalog keys resolve to the intended immutable scorer and language',()=>{
  const active=MONITORING_CATALOG.filter(x=>x.startable)
  assert.equal(new Set(active.map(x=>x.key)).size,active.length,'No duplicate startable test IDs')
  assert.ok(active.length>=145)
  for(const card of active){
    const available=ALL.filter(d=>d.key===card.key&&d.version===card.version)
    assert.ok(available.length>0,'Catalog must not point to a nonexistent questionnaire '+card.key)
    assert.ok(available.every(d=>getAssessmentDefinition(d.key,d.version,d.instrumentLocale)===d))
    assert.ok(card.rightsStatus==='cleared','Uncleared research entry must not become runnable '+card.key)
    assert.ok(card.title && card.description,'Each test should say what it examines '+card.key)
  }
})

test('all exact EN/RU pairs preserve item numbers, responses and scoring geometry',()=>{
  const pairs=[]
  for(const d of ALL.filter(q=>q.instrumentLocale==='en')){
    const other=register.get(d.key+':'+d.version+':ru')
    if(!other)continue // English-only source is not an authorized Russian adaptation.
    pairs.push([d,other])
    assert.deepEqual(itemShape(d),itemShape(other),identity(d)+' answer semantics')
    assert.deepEqual(scoringShape(d),scoringShape(other),identity(d)+' scale scoring semantics')
    assert.equal(d.questions.length,other.questions.length)
  }
  assert.ok(pairs.length>=80,'All installed bilingual forms must be checked')
})

test('every registered version yields verified exact-source reports at both response endpoints',()=>{
  for(const d of ALL)for(const edge of ['min','max']){
    const answers=Object.fromEntries(d.questions.map(q=>[q.id,bound(q,d,edge)]))
    const originalJSON=JSON.stringify(answers)
    const scored=scoreAssessment(d,answers,syntheticTraumaContext(d))
    assert.equal(JSON.stringify(answers),originalJSON,'Read-only scorer may not mutate answers')
    assert.equal(verifiedHistoryResult(scored),true,identity(d)+' '+edge)
    assert.ok(scored.dimensions.length>0)
    assert.ok(scored.dimensions.every(row=>Number.isFinite(row.value)&&row.value>=row.min&&row.value<=row.max))
  }
})


test('research-only and rights-gated scale metadata never silently exposes a runnable test',()=>{
  const runnable=new Set(MONITORING_CATALOG.filter(x=>x.startable).map(x=>x.key))
  const installed=new Set(ALL.map(x=>x.key))
  assert.ok(PRIORITY_METHODS_2026.length>=15)
  for(const resource of PRIORITY_METHODS_2026){
    assert.ok(['permission_required','rights_review','open_reuse'].includes(resource.status))
    assert.equal(Array.isArray(resource.questions),false,'No actual protected item list may be imported as research metadata')
    if(resource.status!=='open_reuse'){
      assert.equal(runnable.has(resource.key),false,
        'Unlicensed/review-only reference must not become a new test '+resource.key)
      assert.equal(installed.has(resource.key),false,
        'Research metadata must not create registered scorer '+resource.key)
    }
  }
  for(const row of Object.values(PROFESSIONAL_SCALE_RESOURCES)){
    assert.equal(row.downloadType,'educational_scale_guide_only',
      row.key+' must remain an educational document, not an instrument PDF')
    assert.ok(!Array.isArray(row.questions),'Protected source item text must remain absent from educational references')
    assert.ok(typeof row.rightsNotice==='string' && row.rightsNotice.length>10)
  }
})
