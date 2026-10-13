import test from 'node:test'
import assert from 'node:assert/strict'
import {getAssessmentDefinition} from '../lib/assessments/definitions.js'
import {scoreAssessment} from '../lib/assessments/scoring.js'
import {usableCourseResult} from '../lib/inner-growth/course-21-evidence.js'
const at='2026-10-12T12:00:00.000Z',owner='synthetic-owner'
function scored(key,answers){const def=getAssessmentDefinition(key);return {id:'synthetic-'+key,accountId:owner,measurementAt:at,status:'completed',...structuredClone(scoreAssessment(def,answers??Object.fromEntries(def.questions.map(q=>[q.id,q.min??def.answerScale.min]))))}}
test('seven registered aggregate identities reject individually attainable but contradictory score vectors',()=>{
 for(const [key,dimension] of [['phq-4','symptoms.phq4.total'],['mhc-sf','resources.mhc_sf.total'],['hh-resource-pulse','resources.overall'],['hh-monthly-profile','resources.monthly.overall'],['mspss','resources.mspss.overall'],['compassion-scale','resources.cs.total'],['cdc-hrqol-4','symptoms.hrqol4.unhealthy_days_index']]){
  const result=scored(key);assert.equal(usableCourseResult(result,owner,at),true)
  const d=result.dimensions.find(d=>d.key===dimension);d.value=d.value===d.min?d.max:d.min
  assert.equal(usableCourseResult(result,owner,at),false,key)
 }
 const cdc=scored('cdc-hrqol-4');cdc.dimensions.find(d=>d.key==='function.hrqol4.activity_limitation_days').value=30
 assert.equal(usableCourseResult(cdc,owner,at),false)
})
test('aggregate means reconstruct integer item sums before rounding',()=>{
 const def=getAssessmentDefinition('hh-monthly-profile'),answers=Object.fromEntries(def.questions.map(q=>[q.id,q.min??def.answerScale.min]))
 for(const spec of def.scoring.dimensions.slice(0,3))answers[spec.items[0]]=2
 const result=scored(def.key,answers),overall=result.dimensions.find(d=>d.key==='resources.monthly.overall')
 assert.equal(overall.value,.33);assert.equal(usableCourseResult(result,owner,at),true)
})
test('deterministic random valid aggregate vectors are preserved across exact forms',()=>{
 let seed=17;const random=()=>((seed=(seed*1664525+1013904223)>>>0)/2**32)
 for(const key of ['phq-4','mhc-sf','hh-resource-pulse','hh-monthly-profile','mspss','compassion-scale','cdc-hrqol-4'])for(let i=0;i<30;i++){
  const def=getAssessmentDefinition(key),answers=Object.fromEntries(def.questions.map(q=>{const min=q.min??def.answerScale.min,max=q.max??def.answerScale.max;return [q.id,min+Math.floor(random()*(max-min+1))]}))
  // Respect the registered CDC questionnaire's zero-unhealthy-days skip rule.
  if(key==='cdc-hrqol-4'&&answers[def.questions[1].id]===0&&answers[def.questions[2].id]===0)answers[def.questions[3].id]=0
  assert.equal(usableCourseResult(scored(key,answers),owner,at),true,key)
 }
})
