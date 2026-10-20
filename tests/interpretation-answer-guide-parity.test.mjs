import test from 'node:test'
import assert from 'node:assert/strict'
import {getAssessmentDefinition,provenance} from '../lib/assessments/definitions.js'
import {scoreAssessment} from '../lib/assessments/scoring.js'
import {interpretationBandModel} from '../lib/assessments/interpretation-registry.js'
import {storedInterpretationForDimension} from '../lib/assessments/interpretation-storage.js'
import {STORED_INTERPRETATION_VERSION,STORED_INTERPRETATION_RULES_VERSION} from '../lib/assessments/interpretation-resolution.js'
const signature=['key','min','max','unit','timeframe','direction','dimensionClass','sourceConstruct','displayKind']
const modelOnly=model=>Object.fromEntries(Object.entries(model).filter(([key])=>!['registrySource','interpretationVersion','interpretationSourceCommit'].includes(key)))
function fixture(def,locale){
 const baseline=scoreAssessment(def,Object.fromEntries(def.questions.map(q=>[q.id,0])))
 const p=provenance(def)
 // Isolated runtime fixture, never an approved export or a DB row.
 const payload={schemaVersion:'hh-interpretation.v1',interpretationVersion:STORED_INTERPRETATION_VERSION,rulesEngineVersion:STORED_INTERPRETATION_RULES_VERSION,reportLocale:locale,sourceCommit:'0'.repeat(40),rendererStrategy:'finite-domain-template.v1',timeframe:def.timeframe,provenance:{assessmentVersionId:p.definitionId,definitionKey:p.definitionKey,definitionVersion:p.definitionVersion,instrumentLocale:p.instrumentLocale,translationVersion:p.translationVersion,scoringKey:p.scoringKey,scoringVersion:p.scoringVersion,resultVersion:p.resultVersion,contentHash:p.contentHash},dimensions:[]}
 for(const dimension of baseline.dimensions){
  const count=def.scoring.dimensions.find(x=>x.key===dimension.key).items.length
  const allowedValues=Array.from({length:4*count+1},(_,i)=>Math.round(i/count*100)/100)
  const variants=allowedValues.map(value=>{const d={...dimension,value},result={...baseline,dimensions:baseline.dimensions.map(x=>x.key===d.key?d:x)};return{values:[value],template:modelOnly(interpretationBandModel(result,d,locale))}})
  payload.dimensions.push({signature:Object.fromEntries(signature.filter(k=>dimension[k]!==undefined).map(k=>[k,dimension[k]])),allowedValues,variants})
 }
 return{baseline,payload}
}
for(const locale of ['en','ru'])for(const key of ['hh-tantra-presence','hh-social-battery'])test(key+' '+locale+' retains every attainable source-answer range through stored interpretation',()=>{
 const def=getAssessmentDefinition(key,'v1',locale),{baseline,payload}=fixture(def,locale)
 for(const spec of payload.dimensions)for(const value of spec.allowedValues){
  const result={...baseline,dimensions:baseline.dimensions.map(d=>d.key===spec.signature.key?{...d,value}:d)}
  const dimension=result.dimensions.find(d=>d.key===spec.signature.key)
  const code=interpretationBandModel(result,dimension,locale)
  const stored=storedInterpretationForDimension(payload,result,dimension,locale,STORED_INTERPRETATION_VERSION)
  assert.deepEqual(stored,modelOnly(code))
  assert.deepEqual(code.bands,[]);assert.equal(code.currentBand,null);assert.equal(code.basis,'descriptive');assert.equal(code.continuous,true)
  assert.equal(code.currentAnswerBand.label,def.responseAnchors[Math.min(4,Math.floor(value+0.5))])
  const projected={...result,interpretationRecords:{[locale]:payload}}
  const database=interpretationBandModel(projected,dimension,locale)
  assert.equal(database.registrySource,'database');assert.deepEqual(modelOnly(database),stored)
  if(value===2)assert.equal(database.currentAnswerBand.label,locale==='ru'?'Отчасти':'Somewhat')
 }
 if(key==='hh-social-battery')for(const boundary of [0.5,1.5,2.5,3.5]){
  assert.ok(payload.dimensions[0].allowedValues.includes(boundary),'boundary must be scorer-attainable')
  const count=def.questions.length,total=boundary*count
  const answers=Object.fromEntries(def.questions.map((q,i)=>[q.id,Math.max(0,Math.min(4,total-i*4))]))
  const scored=scoreAssessment(def,answers),d=scored.dimensions[0]
  assert.equal(d.value,boundary)
  const stored=storedInterpretationForDimension(payload,scored,d,locale,STORED_INTERPRETATION_VERSION)
  assert.equal(stored.currentAnswerBand.code,'answer-'+Math.floor(boundary+0.5))
  assert.equal(stored.currentAnswerBand.from,boundary)
 }
 const tampered={...baseline,contentHash:'wrong'}
 assert.equal(storedInterpretationForDimension(payload,tampered,tampered.dimensions[0],locale,STORED_INTERPRETATION_VERSION),null)
})
