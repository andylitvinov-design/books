import assert from 'node:assert/strict'
import {createHash} from 'node:crypto'
import {attachDatabaseInterpretations} from '../../lib/app/interpretations.js'
import {getAssessmentDefinition} from '../../lib/assessments/definitions.js'
import {scoreAssessment} from '../../lib/assessments/scoring.js'
import {buildAssessmentResultReport} from '../../lib/assessments/result-report.js'
import {canonicalJSON} from '../../lib/assessments/contracts.js'
import {preparedInterpretationRecords,seedAssessmentInterpretations} from '../../scripts/seed-assessment-interpretations.mjs'
const records=await preparedInterpretationRecords()
const definition=getAssessmentDefinition('cbi-personal','v1','en')
const result=scoreAssessment(definition,Object.fromEntries(definition.questions.map((q,i)=>[q.id,i<4?2:3])))
const hash=payload=>'sha256:'+createHash('sha256').update(canonicalJSON(payload)).digest('hex')
const row=record=>{const p=record.payload.identity;return{assessment_version_id:p.definitionId,definition_key:p.definitionKey,definition_version:p.definitionVersion,instrument_locale:p.instrumentLocale,translation_version:p.translationVersion,instrument_content_hash:p.contentHash,scoring_key:p.scoringKey,scoring_version:p.scoringVersion,result_version:p.resultVersion,ui_locale:record.uiLocale,interpretation_version:record.interpretationVersion,payload:record.payload,payload_hash:record.payloadHash,status:'published'}}
const rows=records.filter(r=>r.definitionId===definition.id).map(row)
const calls=[]
const db={query:async(sql,args)=>{calls.push({sql,args});return{rows:sql.includes('has_table_privilege')?[{available:true}]:rows}}}
const excerpt={definitionKey:result.definitionKey,instrumentLocale:'en',dimensions:result.dimensions.map(({key,value,min,max})=>({key,value,min,max}))}
const response={results:[result],nested:{saved:result},sharedExcerpt:excerpt,other:'unchanged'}
const prepared=await attachDatabaseInterpretations(db,response)
assert.equal(calls.length,2)
assert.deepEqual(calls[1].args[0],[definition.id])
assert.deepEqual(prepared.sharedExcerpt,excerpt)
assert.equal(prepared.other,'unchanged')
assert.equal(response.results[0].interpretations,undefined)
for(const locale of ['en','ru']) {
 const report=buildAssessmentResultReport(prepared.results[0],locale)
 assert.equal(report.origin,'database');assert.equal(report.status,'available')
 assert.equal(report.sections[0].value,58.33)
 assert.match(report.sections[0].explanation.reading,locale==='en'?/58.33.*50 \(sometimes\).*75 \(often\)/:/58,33.*50 \(иногда\).*75 \(часто\)/)
 assert.deepEqual(prepared.nested.saved.interpretations[locale],report)
}
assert.equal(buildAssessmentResultReport(result).status,'unavailable')
for(const available of [false,true]) {
 const missing=await attachDatabaseInterpretations({query:async sql=>({rows:sql.includes('has_table_privilege')?[{available}]:[]})},result)
 assert.equal(buildAssessmentResultReport(missing).status,'unavailable')
}
const noQuery={query:()=>{throw new Error('Restricted excerpt must not query content')}}
assert.deepEqual(await attachDatabaseInterpretations(noQuery,{sharedExcerpt:excerpt}),{sharedExcerpt:excerpt})
const sentinel=structuredClone(rows)
sentinel[0].payload.scales[0].base.explanation.construct='Prepared database sentinel: this exact text must reach the report.'
sentinel[0].payload_hash=hash(sentinel[0].payload)
const readRows=rows=>({query:async sql=>({rows:sql.includes('has_table_privilege')?[{available:true}]:rows})})
const loaded=await attachDatabaseInterpretations(readRows(sentinel),result)
assert.match(buildAssessmentResultReport(loaded,sentinel[0].ui_locale).sections[0].meaning,/Prepared database sentinel/)
const mutations=[r=>r.payload_hash='sha256:'+'0'.repeat(64),r=>r.instrument_content_hash='wrong',r=>r.result_version='wrong',r=>r.definition_key='other',r=>r.status='retired',r=>{delete r.payload.support;r.payload_hash=hash(r.payload)},r=>{delete r.payload.scales[0].base;r.payload_hash=hash(r.payload)},r=>{r.payload.scales[0].base.max=999;r.payload_hash=hash(r.payload)},r=>{r.payload.scales[0].cases=[];r.payload_hash=hash(r.payload)}]
for(const mutate of mutations){const bad=structuredClone(rows);for(const r of bad)mutate(r);const value=await attachDatabaseInterpretations(readRows(bad),result);assert.equal(buildAssessmentResultReport(value).status,'unavailable')}
const preparedRow=rows[0], record=records.find(r=>r.definitionId===definition.id&&r.uiLocale===preparedRow.ui_locale)
const source={id:definition.id,definition_key:definition.key,definition_version:definition.version,instrument_locale:definition.instrumentLocale,translation_version:definition.translationVersion,content_hash:definition.contentHash,scoring_key:definition.scoringKey,scoring_version:definition.scoringVersion,timeframe:definition.timeframe,status:'published',definition}
function seedDb(existing=null,registered=source){return{query:async sql=>({rows:sql.startsWith('select * from app.assessment_versions')?[registered]:sql.startsWith('select * from app.assessment_interpretation_versions')?(existing?[existing]:[]):[]})}}
assert.deepEqual(await seedAssessmentInterpretations(seedDb(),[record]),{inserted:1,unchanged:0,total:1})
assert.deepEqual(await seedAssessmentInterpretations(seedDb(preparedRow),[record]),{inserted:0,unchanged:1,total:1})
await assert.rejects(seedAssessmentInterpretations(seedDb({...preparedRow,payload_hash:'wrong'}),[record]),/IMMUTABLE_INTERPRETATION_CONFLICT/)
await assert.rejects(seedAssessmentInterpretations(seedDb(null,{...source,content_hash:'wrong'}),[record]),/REGISTERED_INSTRUMENT_MISMATCH/)
console.log('Database-origin, exact identities/hashes, missing/malformed, batch lookup, excerpt isolation and immutable seed checks passed.')
