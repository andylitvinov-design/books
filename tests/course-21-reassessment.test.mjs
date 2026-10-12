import test from 'node:test'
import assert from 'node:assert/strict'
import {courseReassessment21} from '../lib/inner-growth/course-reassessment-21.js'
import {getAssessmentDefinition,provenance} from '../lib/assessments/definitions.js'
import {scoreAssessment} from '../lib/assessments/scoring.js'
const ownerId='synthetic-owner',now='2026-11-15T12:00:00Z',finishedAt='2026-11-02T12:00:00Z'
const def=getAssessmentDefinition('hh-weekly-pulse'),identity=provenance(def)
function result(id,value,date){
 const dimensions=scoreAssessment(def,Object.fromEntries(def.questions.map(q=>[q.id,value]))).dimensions
 const r={...identity,id,accountId:ownerId,status:'completed',measurementAt:date,dimensions}
 r.interpretations=Object.fromEntries(['en','ru'].map(locale=>[locale,{status:'available',origin:'database',identity,uiLocale:locale,interpretationVersion:'2026-10-12.v2',payloadHash:'sha256:'+'a'.repeat(64),sections:dimensions.map(d=>({...d,compact:{meaning:'Prepared exact '+locale+' '+value}}))}]))
 return r
}
function fixture(){const initial=result('initial',def.questions[0].min,'2026-10-10T12:00:00Z'),latest=result('later',def.questions[0].max,'2026-11-03T12:00:00Z')
 return {ownerId,now,initialResults:[initial],latestResults:[latest],state:{journey:{status:'finished',sessions:{21:{at:finishedAt}}},source:{selectedForms:[{definitionId:def.id,definitionKey:def.key,identity}],bindings:[{resultId:initial.id,identity,interpretations:Object.fromEntries(['en','ru'].map(l=>[l,{revision:'2026-10-12.v2',contentHash:'a'.repeat(64)}]))}]}}}
}
test('completion review compares all exact-form scales without causal or severity judgments',()=>{
 for(const locale of ['en','ru']){const a=fixture(),r=courseReassessment21({...a,locale}),f=r.forms[0]
  assert.equal(f.status,'ready');assert.equal(f.repeatAvailable,true);assert.equal(f.definitionVersion,def.version);assert.equal(f.instrumentLocale,def.instrumentLocale)
  assert.equal(f.scales.length,a.initialResults[0].dimensions.length);assert.ok(f.scales.every(s=>Number.isFinite(s.change)&&s.initialMeaning.includes(locale)))
  assert.equal(r.causalAttribution,false);assert.equal(r.automaticRetest,false);assert.equal(r.clinicalChangeAssessment,false)
  assert.equal(f.initialResultId,'initial');assert.equal(f.latestResultId,'later')
 }
})
test('retest is optional; missing, in-course and future observations never become zero or a course-end measure',()=>{
 for(const date of ['2026-11-01T12:00:00Z',finishedAt,'2026-11-20T12:00:00Z']){
  const a=fixture();a.latestResults[0].measurementAt=date;const f=courseReassessment21(a).forms[0]
  assert.equal(f.status,'not-repeated');assert.equal(f.latestResultId,null);assert.ok(f.scales.every(s=>s.latestValue===null&&s.change===null))
 }
 const a=fixture();a.state.journey.status='active';assert.equal(courseReassessment21(a),null)
})
test('missing or changed pinned interpretation fails closed while factual baseline remains visible',()=>{
 const a=fixture();delete a.latestResults[0].interpretations;let f=courseReassessment21(a).forms[0]
 assert.equal(f.status,'interpretations-unavailable');assert.ok(f.scales.every(s=>s.change===null&&s.latestMeaning===null))
 const b=fixture();b.state.source.bindings[0].interpretations.en.contentHash='b'.repeat(64);f=courseReassessment21(b).forms[0]
 assert.equal(f.status,'interpretations-unavailable');assert.ok(f.scales.every(s=>s.initialMeaning===null&&s.change===null))
})
test('foreign ownership, another initial result ID and wrong exact instrument identity are not compared',()=>{
 const a=fixture();a.latestResults[0].accountId='other';assert.equal(courseReassessment21(a).forms[0].status,'not-repeated')
 const b=fixture();b.initialResults[0].id='replacement';const source=courseReassessment21(b).forms[0];assert.equal(source.status,'source-unavailable');assert.equal(source.repeatAvailable,false)
 const c=fixture();c.latestResults[0].contentHash='sha256:invalid';assert.equal(courseReassessment21(c).forms[0].status,'not-repeated')
})
