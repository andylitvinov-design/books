import test from 'node:test'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { HH_CORE_CHECKIN_DEFINITIONS as candidates } from '../data/assessments/hh-core-checkins-v3.js'
import { ASSESSMENT_DEFINITIONS, getAssessmentDefinition, provenance, validateAnswers, validateContext } from '../lib/assessments/definitions.js'
import { MONITORING_CATALOG } from '../data/assessments/catalog.js'
import { validateResult } from '../lib/profile/history.js'
import { scoreAssessment } from '../lib/assessments/scoring.js'
import { canonicalJSON } from '../lib/assessments/contracts.js'
import { createAssessmentRun, saveRunAnswers, submitRun } from '../lib/assessments/run-lifecycle.js'
import { analyzeCheckin, compareCheckinObservations } from '../lib/assessments/checkin-analysis.js'
const A = '10000000-0000-4000-8000-000000000001'
const B = '10000000-0000-4000-8000-000000000002'
const D1 = '2026-10-01T12:00:00.000Z', D2 = '2026-10-08T12:00:00.000Z'
const answers = (d, v) => Object.fromEntries(d.questions.map(q => [q.id, v]))
const snapshot = (d, v, date = D1) => ({ provenance: provenance(d), answers: answers(d,v), accountId: A, measurementAt: date })
const reject = (fn, code) => assert.throws(fn, error => error.code === code)
const ids = new Set(candidates.map(d => d.id))

test('eight independent authored forms are additive, unique and semantically hashed', () => {
  assert.equal(candidates.length, 8)
  assert.equal(ids.size, 8)
  assert.equal(new Set(ASSESSMENT_DEFINITIONS.map(d => d.id)).size, ASSESSMENT_DEFINITIONS.length)
  for (const d of candidates) {
    const {contentHash, ...body} = d
    assert.equal(contentHash, 'sha256:' + createHash('sha256').update(canonicalJSON(body)).digest('hex'))
  }
  for (const key of ['hh-current-state','hh-weekly-pulse','hh-resource-pulse','hh-monthly-profile']) {
    const [en,ru] = candidates.filter(d => d.key === key)
    assert.equal(en.instrumentLocale,'en');assert.equal(ru.instrumentLocale,'ru')
    assert.notEqual(en.id,ru.id);assert.notEqual(en.contentHash,ru.contentHash)
    assert.notEqual(en.translationVersion,ru.translationVersion)
    assert.deepEqual(en.questions.map(q=>[q.id,q.min,q.max]),ru.questions.map(q=>[q.id,q.min,q.max]))
    assert.equal(getAssessmentDefinition(key,en.version,'en'),en)
    assert.ok(MONITORING_CATALOG.filter(item=>item.key===key).every(item=>item.version!==en.version),'candidate must not be activated')
  }
})

for (const d of candidates) {
 test(`${d.key}/${d.instrumentLocale}: strict independent scorer, complete lifecycle, draft missing policy`, () => {
  const count = { 'hh-current-state':6,'hh-weekly-pulse':8,'hh-resource-pulse':6,'hh-monthly-profile':18 }[d.key]
  assert.equal(d.questions.length,count)
  assert.equal(d.scoringKey,'raw-dimensions');assert.equal(d.resultVersion,'facet-profile-v1')
  assert.equal(d.scoring,undefined);assert.equal(d.optionalContext.length,d.key==='hh-current-state'?5:0)
  assert.ok(d.questions.every(q=>q.required===true && q.direction==='non-normative'))
  assert.ok(d.questions.every(q=>q.anchors.length===2 && q.anchors.every(a=>typeof a==='string' && a.length>0)))
  const recall=d.timeframe==='right-now' ? (d.instrumentLocale==='en'?'right now':'сейчас') : d.timeframe==='past-7-days'?'7':'30'
  assert.ok(d.questions.every(q=>q.text.includes(recall)))
  if(d.key==='hh-monthly-profile') assert.equal(d.responseAnchors.length,5)
  for(const v of [0,d.questions[0].max]) {
   const input=answers(d,v),result=scoreAssessment(d,input),profile=analyzeCheckin(d,input)
   assert.equal(result.dimensions.length,count)
   const stored={id:B,accountId:A,measurementAt:D1,...result}
   assert.equal(validateResult(stored),stored)
   reject(()=>validateResult({...stored,dimensions:result.dimensions.slice(1)}),'INVALID_RESULT')
   reject(()=>validateResult({...stored,dimensions:[{...result.dimensions[0],value:null},...result.dimensions.slice(1)]}),'INVALID_RESULT')
   reject(()=>validateResult({...stored,dimensions:[{...result.dimensions[0],value:0.5},...result.dimensions.slice(1)]}),'INVALID_RESULT')
   assert.deepEqual(result.dimensions.map(x=>[x.key,x.value,x.min,x.max]),d.questions.map(q=>[q.id,v,q.min,q.max]))
   assert.equal(result.total,undefined);assert.equal(profile.total,undefined)
   assert.deepEqual(profile.facets.map(x=>x.value),Array(count).fill(v))
   assert.deepEqual(profile.completeness,{answered:count,expected:count,missing:0,complete:true})
   let run=createAssessmentRun({id:B,accountId:A,definition:d,now:D1})
   run=saveRunAnswers(run,input,{expectedRevision:0,now:D1,progress:count})
   run=submitRun(run,{expectedRevision:1,now:D2})
   assert.equal(run.status,'submitted');assert.deepEqual(scoreAssessment(d,run.answers),result)
  }
  const partial=answers(d,0);delete partial[d.questions[0].id];partial[d.questions[1].id]=null
  const profile=analyzeCheckin(d,partial)
  assert.deepEqual(profile.facets.slice(0,3).map(x=>[x.status,x.value]),[['missing',null],['missing',null],['answered',0]])
  assert.equal(profile.completeness.missing,2);assert.equal(profile.completeness.complete,false)
  reject(()=>scoreAssessment(d,partial),'REQUIRED_ANSWER')
  reject(()=>analyzeCheckin(d,{...answers(d,0),[d.questions[0].id]:d.questions[0].max+1}),'INVALID_ANSWER')
  const empty=analyzeCheckin(d,{})
  assert.equal(empty.completeness.answered,0);assert.ok(empty.facets.every(x=>x.value===null))
  assert.throws(()=>{profile.facets[0].value=0},TypeError)
  assert.deepEqual(validateContext(d,{}),{})
  reject(()=>validateContext(d,{subject:'private'}),'UNKNOWN_FIELD')
 })
 for(const value of [-1,11,4.5,NaN,Infinity,'0',false,{},[]]) test(`${d.key}/${d.instrumentLocale}: rejects invalid ${String(value)}`,()=>{
  reject(()=>analyzeCheckin(d,{...answers(d,0),[d.questions[0].id]:value}),'INVALID_ANSWER')
 })
 test(`${d.key}/${d.instrumentLocale}: neutral difference, missing and identity boundaries`,()=>{
  const before=snapshot(d,0),after=snapshot(d,d.questions[0].max,D2)
  const immutable=JSON.stringify([before,after])
  const result=compareCheckinObservations(before,after)
  assert.equal(result.observationCount,2)
  for(const f of result.facets) {
   if(['state.problem_intensity','state.current_interference'].includes(f.key)) {assert.equal(f.reason,'subject-not-established');assert.equal(f.delta,null)}
   else {assert.equal(f.change,'higher-response');assert.equal(f.delta,d.questions[0].max);assert.equal(f.previous,0)}
  }
  assert.equal(JSON.stringify([before,after]),immutable)
  assert.ok(!JSON.stringify(result).includes(A))
  assert.deepEqual(compareCheckinObservations(before,{...after,accountId:B}),{comparable:false,reason:'different-account',facets:[]})
  assert.equal(compareCheckinObservations(before,{...after,measurementAt:D1}).reason,'non-increasing-time')
  assert.equal(compareCheckinObservations(after,before).reason,'non-increasing-time')
  const empty=compareCheckinObservations({...before,answers:{}},after)
  assert.equal(empty.comparable,false);assert.ok(empty.facets.every(f=>f.delta===null))
  const same=compareCheckinObservations(before,snapshot(d,0,D2))
  assert.ok(same.facets.filter(f=>f.comparable).every(f=>f.change==='same-response'&&f.delta===0))
  const down=compareCheckinObservations(snapshot(d,d.questions[0].max),snapshot(d,0,D2))
  assert.ok(down.facets.filter(f=>f.comparable).every(f=>f.change==='lower-response'))
  for(const field of Object.keys(provenance(d))) {
   reject(()=>compareCheckinObservations(before,{...after,provenance:{...after.provenance,[field]:'tampered'}}),['definitionKey','definitionVersion','instrumentLocale'].includes(field)?'UNKNOWN_INSTRUMENT':'INVALID_PROVENANCE')
  }
  reject(()=>compareCheckinObservations(before,{...after,answers:{...after.answers,private_note:'secret'}}),'UNKNOWN_FIELD')
  reject(()=>compareCheckinObservations(before,{...after,subjectKey:'same'}),'UNKNOWN_FIELD')
  reject(()=>compareCheckinObservations(before,{...after,measurementAt:'2026-02-30T12:00:00.000Z'}),'INVALID_DATE')
 })
}

test('different valid forms/locales and unsupported historical versions never get a numeric delta',()=>{
 for(const a of candidates) for(const b of candidates) if(a!==b) {
  assert.deepEqual(compareCheckinObservations(snapshot(a,0),snapshot(b,0,D2)),{comparable:false,reason:'incompatible-provenance',facets:[]})
 }
 const old=getAssessmentDefinition('hh-current-state','v2','en')
 reject(()=>analyzeCheckin(old,answers(old,0)),'UNSUPPORTED_CHECKIN')
 reject(()=>analyzeCheckin({...candidates[0],questions:[]},{}),'INVALID_PROVENANCE')
 reject(()=>analyzeCheckin(candidates[0],Object.create({[candidates[0].questions[0].id]:0})),'INVALID_OBJECT')
})

test('monthly facets do not silently become domain means or global resources',()=>{
 for(const d of candidates.filter(d=>d.key==='hh-monthly-profile')) {
  const input=Object.fromEntries(d.questions.map((q,i)=>[q.id,i%5]))
  assert.deepEqual(scoreAssessment(d,input).dimensions.map(x=>x.value),d.questions.map((q,i)=>i%5))
  assert.ok(scoreAssessment(d,input).dimensions.every(x=>!x.key.includes('overall')))
 }
})

// Exact semantic fingerprint of all 235 pre-existing definitions on e604e433.
// Known professional-additions hash defects remain visible in the unchanged broad suite.
test('all historical definitions retain exact ordered content, including UUID/hash and old result versions',()=>{
 const legacy=ASSESSMENT_DEFINITIONS.filter(d=>!ids.has(d.id))
 assert.equal(legacy.length,235)
 assert.equal(createHash('sha256').update(canonicalJSON(legacy)).digest('hex'),'9afca15f63b384214cf31326319fd3be3b884f5f27f22a256014cb271b79ca97')
 for(const key of ['hh-current-state','hh-weekly-pulse','hh-resource-pulse','hh-monthly-profile']) for(const locale of ['en','ru']) {
  const d=getAssessmentDefinition(key,'v1',locale), result=scoreAssessment(d,answers(d,0))
  assert.equal(result.resultVersion,'v1')
  assert.equal(validateResult({id:B,accountId:A,measurementAt:D1,...result}).definitionId,d.id)
 }
})
test('optional current-state notes remain non-scored and do not establish a comparable difficulty',()=>{
 for(const d of candidates.filter(d=>d.key==='hh-current-state')) {
  assert.deepEqual(d.optionalContext.map(x=>x.id),['current_focus','trigger','what_helps','desired_change','note'])
  const input=answers(d,5)
  assert.deepEqual(scoreAssessment(d,input,{current_focus:'private topic'}),scoreAssessment(d,input))
  const profile=analyzeCheckin(d,input)
  assert.ok(!JSON.stringify(profile).includes('private topic'))
  const compared=compareCheckinObservations(snapshot(d,5),snapshot(d,4,D2))
  assert.equal(compared.facets.filter(x=>x.reason==='subject-not-established').length,2)
 }
})
