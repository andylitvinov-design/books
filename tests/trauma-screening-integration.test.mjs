import test from 'node:test'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { TRAUMA_SCREENING_DEFINITIONS as definitions } from '../data/assessments/trauma-screening-2026.js'
import { ASSESSMENT_DEFINITIONS, getDefinitionById, validateContext } from '../lib/assessments/definitions.js'
import { scoreAssessment } from '../lib/assessments/scoring.js'
import { canonicalJSON } from '../lib/assessments/contracts.js'
import { TRAUMA_SCREENING_RELEASED, assertTraumaSave, traumaContextReady } from '../lib/assessments/trauma-administration.js'
const contexts = {
  'pcl-5': {event_timing:'About one year ago',criterion_a:'Yes',exposure_modes:JSON.stringify(['It happened to me directly']),death_type:'Not applicable (the event did not involve the death of a close family member or close friend)',adult_confirmed:'Yes',event_anchored:'Yes'},
  'itq-adult': {event_timing:'1 to 5 years ago',adult_confirmed:'Yes',event_anchored:'Yes'},
}
const answers = (d,value) => Object.fromEntries(d.questions.map(q=>[q.id,value]))
for(const d of definitions) {
  const context=contexts[d.key]
  test(`${d.key}: exact source items, responses, hash and additive publication`,()=>{
    assert.equal(TRAUMA_SCREENING_RELEASED,true)
    assert.ok(ASSESSMENT_DEFINITIONS.some(old=>old.id===d.id))
    assert.equal(getDefinitionById(d.id),d)
    const source=JSON.parse(readFileSync(new URL(`../docs/assessments/trauma-screening/${d.key==='pcl-5'?'pcl5-en':'itq-adult-en'}.json`,import.meta.url)))
    assert.deepEqual(d.questions.map(q=>q.text),source.items.map(q=>q.text))
    assert.deepEqual(d.responseAnchors,source.responses.map(x=>x.label))
    const {contentHash,...body}=d
    assert.equal(contentHash,'sha256:'+createHash('sha256').update(canonicalJSON(body)).digest('hex'))
    assert.equal(d.instrumentLocale,'en')
  })
  test(`${d.key}: front matter precedes symptoms and stays locked to attempt`,()=>{
    assert.equal(traumaContextReady(d,{}),false)
    assert.equal(traumaContextReady(d,context),true)
    assert.throws(()=>assertTraumaSave(d,{}, {},context,answers(d,0)),/REQUIRED_CONTEXT/)
    assert.doesNotThrow(()=>assertTraumaSave(d,{}, {},context,{}))
    assert.doesNotThrow(()=>assertTraumaSave(d,{},context,context,answers(d,0)))
    assert.throws(()=>assertTraumaSave(d,answers(d,0),context,{...context,event_timing:'changed'},{}))
    assert.throws(()=>scoreAssessment(d,answers(d,0)),/REQUIRED_CONTEXT/)
    assert.throws(()=>validateContext(d,{...context,unknown:'x'}),/UNKNOWN_FIELD/)
    assert.throws(()=>validateContext(d,{...context,adult_confirmed:'No'},{requireComplete:true}),/INVALID_CONTEXT/)
  })
  test(`${d.key}: neutral complete-score dimensions and missingness`,()=>{
    for(const value of [0,1,2,4]) {
      const score=scoreAssessment(d,answers(d,value),context)
      assert.equal(score.dimensions[0].value,value*(d.key==='pcl-5'?20:6))
      assert.ok(score.dimensions.every(dim=>dim.direction==='non-normative'))
      assert.ok(!('diagnosis'in score) && !('pattern'in score))
    }
    assert.throws(()=>scoreAssessment(d,{...answers(d,0),[d.questions[0].id]:null},context),/REQUIRED_ANSWER/)
  })
}
test('PCL Criterion A NO does not apply PC structural-zero rule',()=>{
  const d=definitions[0],context={...contexts['pcl-5'],criterion_a:'No',death_type:'Natural causes'}
  assert.equal(scoreAssessment(d,answers(d,4),context).dimensions[0].value,80)
})
test('PCL Other narrative remains optional and multiple choices preserved',()=>{
  const d=definitions[0],context={...contexts['pcl-5'],exposure_modes:JSON.stringify(['I witnessed it','Other, please describe'])}
  assert.equal(traumaContextReady(d,context),true)
  assert.equal(traumaContextReady(d,{...context,exposure_other:'Synthetic fixture'}),true)
  assert.equal(traumaContextReady(d,{...context,exposure_modes:'[]'}),false)
  assert.throws(()=>validateContext(d,{...context,exposure_modes:'["made up"]'}),/INVALID_CONTEXT/)
})
test('ITQ has all four distinct exact section instructions and excludes impairment from every raw scale',()=>{
  const d=definitions[1],source=JSON.parse(readFileSync(new URL('../docs/assessments/trauma-screening/itq-adult-en.json',import.meta.url)))
  for(const q of d.questions) assert.equal(q.sectionInstructions,source.section_instructions[q.section])
  const a=answers(d,0);for(const key of ['P7','P8','P9','C7','C8','C9'])a[key]=4
  assert.ok(scoreAssessment(d,a,contexts['itq-adult']).dimensions.every(dim=>dim.value===0))
  const dims=scoreAssessment(d,answers(d,4),contexts['itq-adult']).dimensions
  assert.equal(dims[0].timeframe,'past-month');assert.equal(dims[1].timeframe,'typical-patterns')
})
test('both runner paths gate questions on saved front matter and render section instructions',()=>{
  for(const file of ['components/app/app-workspace.jsx','components/app/cabinet-landing.jsx']) {
    const code=readFileSync(new URL('../'+file,import.meta.url),'utf8')
    assert.match(code,/TraumaFrontMatter/)
    assert.match(code,/traumaContextReady\((?:def|definition), run\.context \|\| \{\}\)/)
    assert.match(code,/TraumaSectionInstructions question=\{item\}/)
    assert.match(code,/TraumaSectionInstructions question=\{question\}/)
  }
  for(const file of ['lib/app/repository.js','lib/app/guest-repository.js']) {
    const code=readFileSync(new URL('../'+file,import.meta.url),'utf8')
    assert.match(code,/hasTraumaAdministration\(definition\) && !TRAUMA_SCREENING_RELEASED/)
    assert.match(code,/assertTraumaSave\(definition, row.answers/)
    assert.match(code,/scoreAssessment\(definition, row.answers, scoringContext\)/)
  }
})

test('trauma reports never fall into generic thirds, personality advice, diagnostic thresholds or severity bands',async()=>{
  const {buildAssessmentResultReport}=await import('../lib/assessments/result-report.js')
  const {interpretationForDimension}=await import('../lib/assessments/interpretation-registry.js')
  for(const d of definitions)for(const value of [0,2,4]){
    const result=scoreAssessment(d,answers(d,value),contexts[d.key])
    for(const language of ['en','ru']){
      const report=buildAssessmentResultReport(result,language)
      assert.equal(report.personalityType,null)
      for(const section of report.sections){assert.equal(section.bandBasis,'descriptive');assert.deepEqual(section.steps,[]);assert.equal(section.recommendedReview,false)}
      assert.doesNotMatch(JSON.stringify(report),/upper part|lower part|personal style|personal tendency|severe|moderate PTSD|probable PTSD/)
      assert.equal(interpretationForDimension(result,result.dimensions[0],language).code,'continuous')
    }
    const tampered={...result,contentHash:'sha256:wrong'}
    assert.ok(buildAssessmentResultReport(tampered).sections.every(s=>s.bandBasis==='unavailable'))
    assert.equal(interpretationForDimension(tampered,tampered.dimensions[0]).basis,'unavailable')
    const altered={...result,dimensions:result.dimensions.map((v,index)=>index? v:{...v,value:0.5})}
    assert.ok(buildAssessmentResultReport(altered).sections.every(s=>s.bandBasis==='unavailable'))
  }
})

test('context-free persisted result validation uses immutable shape, not fabricated clinical answers',async()=>{
  const {validateResult,createProfileSnapshot}=await import('../lib/profile/history.js')
  const {randomUUID}=await import('node:crypto')
  for(const d of definitions){
    const result={...scoreAssessment(d,answers(d,2),contexts[d.key]),id:randomUUID(),accountId:randomUUID(),measurementAt:'2026-10-14T12:00:00Z'}
    assert.equal(validateResult(result),result)
    for(const bad of [-1,0.5,Infinity,'2',result.dimensions[0].max+1]) assert.throws(()=>validateResult({...result,dimensions:result.dimensions.map((dim,index)=>index?dim:{...dim,value:bad})}),/INVALID_RESULT/)
    assert.throws(()=>validateResult({...result,scoringVersion:'forged'}),/INVALID_PROVENANCE/)
    assert.throws(()=>validateResult({...result,dimensions:result.dimensions.slice(1)}),/INVALID_RESULT/)
    assert.throws(()=>validateResult({...result,dimensions:result.dimensions.map((dim,index)=>index?dim:{...dim,key:'forged.dimension'})}),/INVALID_RESULT/)
    const snapshot=createProfileSnapshot({id:randomUUID(),accountId:result.accountId,generatedResult:result,createdAt:'2026-10-14T12:01:00Z'})
    assert.equal(snapshot.dimensions.length,result.dimensions.length)
    assert.throws(()=>validateResult({...result,dimensions:result.dimensions.map((dim,index)=>index?dim:{...dim,max:999})}),/INVALID_RESULT/)
  }
})
