import test from 'node:test'
import assert from 'node:assert/strict'
import { ASSESSMENT_DEFINITIONS } from '../lib/assessments/definitions.js'
import { APPROVED_INTERPRETATION_DIGESTS } from '../lib/assessments/interpretation-approved-digests.js'
import { interpretationRecordApprovalKey } from '../lib/assessments/interpretation-record-integrity.js'
import { historicalInterpretationCoverage } from './helpers/historical-interpretation-coverage.mjs'

const releases=['2026-10-17.v1','2026-10-17.v2','2026-10-17.v3']
const digestRows = version => Object.fromEntries(Object.entries(APPROVED_INTERPRETATION_DIGESTS)
  .filter(([key])=>JSON.parse(key)[2]===version))

test('every immutable prior interpretation release keeps exactly 230 approved original sources',()=>{
 for(const version of releases){
  const approvedDigests=digestRows(version)
  const result=historicalInterpretationCoverage(ASSESSMENT_DEFINITIONS,approvedDigests,version)
  assert.equal(result.approvedRowCount,460,version)
  assert.equal(result.historical.length,230,version)
  assert.equal(result.newer.length,ASSESSMENT_DEFINITIONS.length-230,version)
  assert.equal(new Set(result.historical.map(x=>x.id)).size,230)
  assert.ok(result.newer.every(row=>!result.historical.some(saved=>saved.id===row.id)))
 }
})

test('the five newly registered source questionnaires cannot borrow older C3 receipt rows',()=>{
 const result=historicalInterpretationCoverage(ASSESSMENT_DEFINITIONS,digestRows('2026-10-17.v3'),'2026-10-17.v3')
 assert.deepEqual(result.newer.map(row=>row.key).sort(),[
   'ipip-emotion-decision-making-9',
   'ipip-empathic-concern-10',
   'ipip-responsive-distress-10',
   'ipip-responsive-joy-10',
   'ons-personal-wellbeing-4',
 ].sort())
})

test('missing paired approved locale or an unidentified digest fails closed',()=>{
 const definition={id:'source-v1',contentHash:'sha256:source'}
 const version='2026-10-17.v3'
 const en=interpretationRecordApprovalKey({definitionId:definition.id,contentHash:definition.contentHash,interpretationVersion:version,reportLocale:'en'})
 const ru=interpretationRecordApprovalKey({definitionId:definition.id,contentHash:definition.contentHash,interpretationVersion:version,reportLocale:'ru'})
 assert.throws(()=>historicalInterpretationCoverage([definition],{[en]:'digest'},version),/INCOMPLETE_APPROVED_LOCALE_PAIR/)
 assert.deepEqual(historicalInterpretationCoverage([definition],{[en]:'digest',[ru]:'digest'},version).newer,[])
 const unknown=interpretationRecordApprovalKey({definitionId:'different',contentHash:'sha256:unmatched',interpretationVersion:version,reportLocale:'en'})
 assert.throws(()=>historicalInterpretationCoverage([definition],{[en]:'digest',[ru]:'digest',[unknown]:'digest'},version),/APPROVED_DIGEST_MISSING_SOURCE/)
})
